-- 1) Backfill: gestor_geral -> admin
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.user_roles
WHERE role = 'gestor_geral'::public.app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Backfill: financeiro -> módulo financeiro_mod habilitado
INSERT INTO public.user_module_permissions (user_id, module_key, enabled)
SELECT user_id, 'financeiro_mod', true
FROM public.user_roles
WHERE role = 'financeiro'::public.app_role
ON CONFLICT (user_id, module_key) DO UPDATE SET enabled = true;

-- 3) Backfill: funções operacionais -> módulo operacao habilitado
INSERT INTO public.user_module_permissions (user_id, module_key, enabled)
SELECT DISTINCT user_id, 'operacao', true
FROM public.user_roles
WHERE role IN ('comercial','cadastro','credito','comite','formalizacao')
ON CONFLICT (user_id, module_key) DO UPDATE SET enabled = true;

-- 4) Remove papéis obsoletos
DELETE FROM public.user_roles
WHERE role IN ('gestor_geral'::public.app_role, 'financeiro'::public.app_role);

-- 5) Redefine is_gestor_geral como alias de admin (mantém compat com policies/funções existentes)
CREATE OR REPLACE FUNCTION public.is_gestor_geral(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

-- 6) Atualiza policies de investidores (financeiro role -> módulo financeiro_mod)
DROP POLICY IF EXISTS "Criar investidores" ON public.investidores;
CREATE POLICY "Criar investidores" ON public.investidores
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.can_access_module(auth.uid(), 'financeiro_mod'));

DROP POLICY IF EXISTS "Editar investidores" ON public.investidores;
CREATE POLICY "Editar investidores" ON public.investidores
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.can_access_module(auth.uid(), 'financeiro_mod'));

DROP POLICY IF EXISTS "Visibilidade de investidores" ON public.investidores;
CREATE POLICY "Visibilidade de investidores" ON public.investidores
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.can_access_module(auth.uid(), 'financeiro_mod')
  OR public.has_role(auth.uid(), 'comercial')
  OR (owner_id = auth.uid())
);

-- 7) Trigger: bloqueia atribuir função operacional sem módulo Operação
CREATE OR REPLACE FUNCTION public.enforce_role_module_dependency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role IN ('comercial'::public.app_role,'cadastro'::public.app_role,'credito'::public.app_role,'comite'::public.app_role,'formalizacao'::public.app_role) THEN
    IF NOT public.can_access_module(NEW.user_id, 'operacao') THEN
      RAISE EXCEPTION 'Ative o módulo Operação para este usuário antes de atribuir funções operacionais';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_module_dependency ON public.user_roles;
CREATE TRIGGER trg_enforce_role_module_dependency
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_module_dependency();

-- 8) Trigger: cascade ao desativar módulo Operação
CREATE OR REPLACE FUNCTION public.cascade_module_disable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.module_key = 'operacao' AND NEW.enabled = false THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role IN ('comercial'::public.app_role,'cadastro'::public.app_role,'credito'::public.app_role,'comite'::public.app_role,'formalizacao'::public.app_role);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_module_disable ON public.user_module_permissions;
CREATE TRIGGER trg_cascade_module_disable
AFTER INSERT OR UPDATE ON public.user_module_permissions
FOR EACH ROW EXECUTE FUNCTION public.cascade_module_disable();