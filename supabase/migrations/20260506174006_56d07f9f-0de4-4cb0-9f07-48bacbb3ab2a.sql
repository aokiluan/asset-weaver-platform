ALTER TABLE public.credit_reports
  ADD COLUMN IF NOT EXISTS versao_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS precisa_revisao boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.credit_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  cedente_id uuid NOT NULL,
  proposal_id uuid,
  versao integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  motivo_alteracao text,
  identificacao jsonb NOT NULL DEFAULT '{}'::jsonb,
  empresa jsonb NOT NULL DEFAULT '{}'::jsonb,
  rede_societaria jsonb NOT NULL DEFAULT '{}'::jsonb,
  carteira jsonb NOT NULL DEFAULT '{}'::jsonb,
  restritivos jsonb NOT NULL DEFAULT '{}'::jsonb,
  financeiro jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_diligence jsonb NOT NULL DEFAULT '{}'::jsonb,
  pleito jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachments_top jsonb NOT NULL DEFAULT '{}'::jsonb,
  parecer_comercial text,
  parecer_regional text,
  parecer_compliance text,
  parecer_analista text,
  pontos_positivos text,
  pontos_atencao text,
  conclusao text,
  recomendacao text,
  completude integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crv_report ON public.credit_report_versions(report_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_crv_cedente ON public.credit_report_versions(cedente_id, versao DESC);

ALTER TABLE public.credit_report_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Visibilidade de versões segue cedente" ON public.credit_report_versions;
CREATE POLICY "Visibilidade de versões segue cedente"
  ON public.credit_report_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = credit_report_versions.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id)));

DROP POLICY IF EXISTS "Crédito cria versões" ON public.credit_report_versions;
CREATE POLICY "Crédito cria versões"
  ON public.credit_report_versions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.has_role(auth.uid(), 'credito'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.is_gestor_geral(auth.uid())));

DROP POLICY IF EXISTS "Admin atualiza versões de crédito" ON public.credit_report_versions;
CREATE POLICY "Admin atualiza versões de crédito"
  ON public.credit_report_versions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin remove versões de crédito" ON public.credit_report_versions;
CREATE POLICY "Admin remove versões de crédito"
  ON public.credit_report_versions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.credit_report_versions (
  report_id, cedente_id, proposal_id, versao, is_current,
  identificacao, empresa, rede_societaria, carteira, restritivos,
  financeiro, due_diligence, pleito, attachments_top,
  parecer_comercial, parecer_regional, parecer_compliance, parecer_analista,
  pontos_positivos, pontos_atencao, conclusao, recomendacao, completude,
  created_by, created_at
)
SELECT r.id, r.cedente_id, r.proposal_id, 1, true,
  r.identificacao, r.empresa, r.rede_societaria, r.carteira, r.restritivos,
  r.financeiro, r.due_diligence, r.pleito, r.attachments_top,
  r.parecer_comercial, r.parecer_regional, r.parecer_compliance, r.parecer_analista,
  r.pontos_positivos, r.pontos_atencao, r.conclusao, r.recomendacao, r.completude,
  COALESCE(r.created_by, r.updated_by, '00000000-0000-0000-0000-000000000000'::uuid),
  r.created_at
FROM public.credit_reports r
WHERE NOT EXISTS (SELECT 1 FROM public.credit_report_versions v WHERE v.report_id = r.id);