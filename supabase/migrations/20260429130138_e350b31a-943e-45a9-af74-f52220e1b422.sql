
-- Enum cedente_stage
DO $$ BEGIN
  CREATE TYPE public.cedente_stage AS ENUM ('novo','cadastro','analise','comite','formalizacao','ativo','inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coluna stage em cedentes
ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS stage public.cedente_stage NOT NULL DEFAULT 'novo';

UPDATE public.cedentes SET stage = CASE
  WHEN status = 'aprovado' THEN 'ativo'::public.cedente_stage
  WHEN status = 'inativo' THEN 'inativo'::public.cedente_stage
  WHEN status = 'reprovado' THEN 'inativo'::public.cedente_stage
  WHEN status = 'em_analise' THEN 'analise'::public.cedente_stage
  ELSE 'novo'::public.cedente_stage
END
WHERE stage = 'novo';

-- Tabela de relatório de visita
CREATE TABLE IF NOT EXISTS public.cedente_visit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id uuid NOT NULL UNIQUE,
  data_visita date NOT NULL,
  participantes text NOT NULL,
  contexto text NOT NULL,
  percepcoes text NOT NULL,
  pontos_atencao text,
  recomendacao text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cedente_visit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilidade do relatório segue cedente" ON public.cedente_visit_reports;
CREATE POLICY "Visibilidade do relatório segue cedente"
ON public.cedente_visit_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_visit_reports.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id)));

DROP POLICY IF EXISTS "Comercial cria relatório" ON public.cedente_visit_reports;
CREATE POLICY "Comercial cria relatório"
ON public.cedente_visit_reports FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_visit_reports.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
  AND (public.has_role(auth.uid(),'comercial') OR public.has_role(auth.uid(),'gestor_comercial') OR public.has_role(auth.uid(),'admin'))
);

DROP POLICY IF EXISTS "Editar próprio relatório ou gestor" ON public.cedente_visit_reports;
CREATE POLICY "Editar próprio relatório ou gestor"
ON public.cedente_visit_reports FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_admin_or_gestor_comercial(auth.uid()));

DROP POLICY IF EXISTS "Remover relatório admin/gestor" ON public.cedente_visit_reports;
CREATE POLICY "Remover relatório admin/gestor"
ON public.cedente_visit_reports FOR DELETE TO authenticated
USING (public.is_admin_or_gestor_comercial(auth.uid()));

DROP TRIGGER IF EXISTS trg_cedente_visit_reports_updated ON public.cedente_visit_reports;
CREATE TRIGGER trg_cedente_visit_reports_updated
BEFORE UPDATE ON public.cedente_visit_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico de estágio
CREATE TABLE IF NOT EXISTS public.cedente_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id uuid NOT NULL,
  user_id uuid,
  evento text NOT NULL,
  stage_anterior public.cedente_stage,
  stage_novo public.cedente_stage,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cedente_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilidade do histórico segue cedente" ON public.cedente_history;
CREATE POLICY "Visibilidade do histórico segue cedente"
ON public.cedente_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_history.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id)));

CREATE OR REPLACE FUNCTION public.log_cedente_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cedente_history (cedente_id, user_id, evento, stage_novo)
    VALUES (NEW.id, NEW.created_by, 'criado', NEW.stage);
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.cedente_history (cedente_id, user_id, evento, stage_anterior, stage_novo)
    VALUES (NEW.id, auth.uid(), 'mudanca_estagio', OLD.stage, NEW.stage);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cedente_stage_change ON public.cedentes;
CREATE TRIGGER trg_cedente_stage_change
AFTER INSERT OR UPDATE OF stage ON public.cedentes
FOR EACH ROW EXECUTE FUNCTION public.log_cedente_stage_change();

-- Atualiza funções de permissão para reconhecer novos papéis
CREATE OR REPLACE FUNCTION public.can_view_cedente(_user_id uuid, _owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'gestor_credito')
    OR public.has_role(_user_id, 'analista_cadastro')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco')
    OR _owner_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_view_proposal(_user_id uuid, _cedente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'gestor_credito')
    OR public.has_role(_user_id, 'analista_cadastro')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco')
    OR public.has_role(_user_id, 'financeiro')
    OR public.has_role(_user_id, 'gestor_financeiro')
    OR EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = _cedente_id AND c.owner_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_decide_proposal(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'gestor_credito')
    OR public.has_role(_user_id, 'gestor_risco')
    OR public.has_role(_user_id, 'comite');
$$;

CREATE OR REPLACE FUNCTION public.can_review_documento(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_cadastro')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'gestor_credito')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco');
$$;
