-- 1. Tabela
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_module_permissions_user ON public.user_module_permissions(user_id);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Usuário vê próprias permissões e admin vê todas"
ON public.user_module_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insere permissões de módulo"
ON public.user_module_permissions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza permissões de módulo"
ON public.user_module_permissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove permissões de módulo"
ON public.user_module_permissions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_user_module_permissions_updated_at
BEFORE UPDATE ON public.user_module_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Função helper
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id uuid, _module_key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions
      WHERE user_id = _user_id AND module_key = _module_key AND enabled = true
    );
$$;

-- 3. Seed: copia o efeito do modelo antigo (role_module_permissions) para cada usuário
-- Se qualquer um dos papéis do usuário tinha enabled=true para o módulo, libera; caso contrário bloqueia.
-- Lista fixa dos 6 módulos conhecidos.
WITH modules(module_key) AS (
  VALUES ('gestao'),('operacao'),('diretorio'),('financeiro_mod'),('config'),('bi')
),
user_modules AS (
  SELECT p.id AS user_id, m.module_key
  FROM public.profiles p
  CROSS JOIN modules m
),
effective AS (
  SELECT
    um.user_id,
    um.module_key,
    -- se houver papel com enabled=true => true; se houver registros mas todos false => false; se sem registro => true (modelo antigo era fail-open)
    CASE
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_module_permissions rmp
          ON rmp.role::text = ur.role::text AND rmp.module_key = um.module_key
        WHERE ur.user_id = um.user_id AND rmp.enabled = true
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.role_module_permissions rmp
          ON rmp.role::text = ur.role::text AND rmp.module_key = um.module_key
        WHERE ur.user_id = um.user_id
      ) THEN false
      ELSE true
    END AS enabled
  FROM user_modules um
)
INSERT INTO public.user_module_permissions (user_id, module_key, enabled)
SELECT user_id, module_key, enabled FROM effective
ON CONFLICT (user_id, module_key) DO NOTHING;