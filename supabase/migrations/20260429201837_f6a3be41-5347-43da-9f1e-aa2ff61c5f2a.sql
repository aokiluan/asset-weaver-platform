
-- 1) credit_reports
CREATE TABLE public.credit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL UNIQUE,
  cedente_id UUID NOT NULL,
  identificacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  empresa JSONB NOT NULL DEFAULT '{}'::jsonb,
  rede_societaria JSONB NOT NULL DEFAULT '{}'::jsonb,
  carteira JSONB NOT NULL DEFAULT '{}'::jsonb,
  restritivos JSONB NOT NULL DEFAULT '{}'::jsonb,
  financeiro JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_diligence JSONB NOT NULL DEFAULT '{}'::jsonb,
  pleito JSONB NOT NULL DEFAULT '{}'::jsonb,
  parecer_comercial TEXT,
  parecer_regional TEXT,
  parecer_compliance TEXT,
  parecer_analista TEXT,
  pontos_positivos TEXT,
  pontos_atencao TEXT,
  conclusao TEXT,
  recomendacao TEXT,
  completude INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_reports_proposal ON public.credit_reports(proposal_id);
CREATE INDEX idx_credit_reports_cedente ON public.credit_reports(cedente_id);

ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_credit_reports_updated_at
  BEFORE UPDATE ON public.credit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Visibilidade do relatório segue proposta"
ON public.credit_reports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.credit_proposals p
  WHERE p.id = credit_reports.proposal_id
    AND public.can_view_proposal(auth.uid(), p.cedente_id)
));

CREATE POLICY "Análise/Risco criam relatório"
ON public.credit_reports FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'analista_credito'::app_role)
  OR has_role(auth.uid(), 'gestor_risco'::app_role)
  OR has_role(auth.uid(), 'gestor_credito'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Análise/Risco atualizam relatório"
ON public.credit_reports FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'analista_credito'::app_role)
  OR has_role(auth.uid(), 'gestor_risco'::app_role)
  OR has_role(auth.uid(), 'gestor_credito'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin remove relatório"
ON public.credit_reports FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- 2) committee_sessions
CREATE TABLE public.committee_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL UNIQUE,
  voto_secreto BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'aberta', -- aberta | revelada | encerrada
  deadline TIMESTAMPTZ,
  abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  revelada_em TIMESTAMPTZ,
  revelada_por UUID,
  encerrada_em TIMESTAMPTZ,
  encerrada_por UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_committee_sessions_updated_at
  BEFORE UPDATE ON public.committee_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Ver sessão segue proposta"
ON public.committee_sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.credit_proposals p
  WHERE p.id = committee_sessions.proposal_id
    AND public.can_view_proposal(auth.uid(), p.cedente_id)
));

CREATE POLICY "Comitê/Gestores abrem sessão"
ON public.committee_sessions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'comite'::app_role)
  OR has_role(auth.uid(), 'gestor_credito'::app_role)
  OR has_role(auth.uid(), 'gestor_risco'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Comitê/Gestores atualizam sessão"
ON public.committee_sessions FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'comite'::app_role)
  OR has_role(auth.uid(), 'gestor_credito'::app_role)
  OR has_role(auth.uid(), 'gestor_risco'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admin remove sessão"
ON public.committee_sessions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- 3) Realtime
ALTER TABLE public.credit_reports REPLICA IDENTITY FULL;
ALTER TABLE public.committee_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.committee_votes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_votes;
