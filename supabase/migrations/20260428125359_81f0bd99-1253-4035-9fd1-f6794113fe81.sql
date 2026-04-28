
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.proposal_stage AS ENUM (
  'rascunho', 'analise', 'parecer', 'comite', 'aprovado', 'reprovado', 'cancelado'
);

CREATE TYPE public.opinion_recommendation AS ENUM (
  'favoravel', 'favoravel_com_ressalva', 'desfavoravel'
);

CREATE TYPE public.vote_decision AS ENUM ('favoravel', 'desfavoravel', 'abstencao');

CREATE TYPE public.approver_kind AS ENUM ('analista_credito', 'gestor_risco', 'comite');

-- =========================================================
-- approval_levels (faixas de alçada)
-- =========================================================
CREATE TABLE public.approval_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  valor_min NUMERIC(18,2) NOT NULL DEFAULT 0,
  valor_max NUMERIC(18,2),
  approver public.approver_kind NOT NULL,
  votos_minimos INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_levels ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_approval_levels_updated_at
  BEFORE UPDATE ON public.approval_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem alçadas"
  ON public.approval_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia alçadas (insert)"
  ON public.approval_levels FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia alçadas (update)"
  ON public.approval_levels FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia alçadas (delete)"
  ON public.approval_levels FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.approval_levels (nome, valor_min, valor_max, approver, votos_minimos, ordem) VALUES
  ('Alçada Analista', 0, 100000, 'analista_credito', 1, 1),
  ('Alçada Gestor de Risco', 100000, 500000, 'gestor_risco', 1, 2),
  ('Comitê - Alçada Média', 500000, 2000000, 'comite', 2, 3),
  ('Comitê - Alçada Plena', 2000000, NULL, 'comite', 3, 4);

-- =========================================================
-- credit_proposals
-- =========================================================
CREATE TABLE public.credit_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE DEFAULT ('PROP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  cedente_id UUID NOT NULL REFERENCES public.cedentes(id) ON DELETE CASCADE,
  valor_solicitado NUMERIC(18,2) NOT NULL,
  prazo_dias INTEGER,
  taxa_sugerida NUMERIC(8,4),
  garantias TEXT,
  finalidade TEXT,
  observacoes TEXT,
  stage public.proposal_stage NOT NULL DEFAULT 'rascunho',
  approval_level_id UUID REFERENCES public.approval_levels(id),
  valor_aprovado NUMERIC(18,2),
  decisao_observacao TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_cedente ON public.credit_proposals(cedente_id);
CREATE INDEX idx_proposals_stage ON public.credit_proposals(stage);

ALTER TABLE public.credit_proposals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.credit_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: pode ver proposta?
CREATE OR REPLACE FUNCTION public.can_view_proposal(_user_id uuid, _cedente_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco')
    OR public.has_role(_user_id, 'financeiro')
    OR EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = _cedente_id AND c.owner_id = _user_id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_proposal(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_proposal(uuid, uuid) TO authenticated;

-- Helper: pode decidir proposta (transições de estágio e decisão final)
CREATE OR REPLACE FUNCTION public.can_decide_proposal(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'gestor_risco')
    OR public.has_role(_user_id, 'comite');
$$;

REVOKE EXECUTE ON FUNCTION public.can_decide_proposal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_decide_proposal(uuid) TO authenticated;

CREATE POLICY "Visibilidade de propostas"
ON public.credit_proposals FOR SELECT TO authenticated
USING (public.can_view_proposal(auth.uid(), cedente_id));

CREATE POLICY "Comercial cria propostas"
ON public.credit_proposals FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor_comercial')
  OR public.has_role(auth.uid(), 'comercial')
);

CREATE POLICY "Atualizar propostas"
ON public.credit_proposals FOR UPDATE TO authenticated
USING (
  public.is_admin_or_gestor_comercial(auth.uid())
  OR public.can_decide_proposal(auth.uid())
  OR (created_by = auth.uid() AND stage = 'rascunho')
);

CREATE POLICY "Admin/Gestor removem propostas"
ON public.credit_proposals FOR DELETE TO authenticated
USING (public.is_admin_or_gestor_comercial(auth.uid()));

-- =========================================================
-- credit_opinions (pareceres)
-- =========================================================
CREATE TABLE public.credit_opinions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.credit_proposals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role public.app_role NOT NULL,
  recomendacao public.opinion_recommendation NOT NULL,
  score INTEGER,
  pontos_fortes TEXT,
  pontos_atencao TEXT,
  parecer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, author_id)
);

CREATE INDEX idx_opinions_proposal ON public.credit_opinions(proposal_id);
ALTER TABLE public.credit_opinions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_opinions_updated_at
  BEFORE UPDATE ON public.credit_opinions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Visibilidade de pareceres segue proposta"
ON public.credit_opinions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credit_proposals p
    WHERE p.id = credit_opinions.proposal_id
      AND public.can_view_proposal(auth.uid(), p.cedente_id)
  )
);

CREATE POLICY "Análise/Risco criam parecer"
ON public.credit_opinions FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'analista_credito')
    OR public.has_role(auth.uid(), 'gestor_risco')
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Autor edita o próprio parecer"
ON public.credit_opinions FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Autor remove o próprio parecer"
ON public.credit_opinions FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- committee_votes
-- =========================================================
CREATE TABLE public.committee_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.credit_proposals(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  decisao public.vote_decision NOT NULL,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, voter_id)
);

CREATE INDEX idx_votes_proposal ON public.committee_votes(proposal_id);
ALTER TABLE public.committee_votes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_votes_updated_at
  BEFORE UPDATE ON public.committee_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Visibilidade de votos segue proposta"
ON public.committee_votes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credit_proposals p
    WHERE p.id = committee_votes.proposal_id
      AND public.can_view_proposal(auth.uid(), p.cedente_id)
  )
);

CREATE POLICY "Comitê vota"
ON public.committee_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND (public.has_role(auth.uid(), 'comite') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Membro edita o próprio voto"
ON public.committee_votes FOR UPDATE TO authenticated
USING (voter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Membro remove o próprio voto"
ON public.committee_votes FOR DELETE TO authenticated
USING (voter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- proposal_history (auditoria)
-- =========================================================
CREATE TABLE public.proposal_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.credit_proposals(id) ON DELETE CASCADE,
  user_id UUID,
  evento TEXT NOT NULL,
  stage_anterior public.proposal_stage,
  stage_novo public.proposal_stage,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_proposal ON public.proposal_history(proposal_id, created_at DESC);
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade do histórico segue proposta"
ON public.proposal_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credit_proposals p
    WHERE p.id = proposal_history.proposal_id
      AND public.can_view_proposal(auth.uid(), p.cedente_id)
  )
);

-- Trigger: registrar mudança de stage automaticamente
CREATE OR REPLACE FUNCTION public.log_proposal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.proposal_history (proposal_id, user_id, evento, stage_novo, detalhes)
    VALUES (NEW.id, NEW.created_by, 'criada', NEW.stage,
      jsonb_build_object('valor_solicitado', NEW.valor_solicitado));
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.proposal_history (proposal_id, user_id, evento, stage_anterior, stage_novo, detalhes)
    VALUES (NEW.id, auth.uid(), 'mudanca_estagio', OLD.stage, NEW.stage,
      jsonb_build_object('valor_aprovado', NEW.valor_aprovado, 'observacao', NEW.decisao_observacao));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proposal_history
  AFTER INSERT OR UPDATE ON public.credit_proposals
  FOR EACH ROW EXECUTE FUNCTION public.log_proposal_stage_change();

-- Trigger: ao inserir/atualizar valor_solicitado, calcular approval_level_id
CREATE OR REPLACE FUNCTION public.set_proposal_approval_level()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  lvl_id UUID;
BEGIN
  IF NEW.valor_solicitado IS NOT NULL THEN
    SELECT id INTO lvl_id
    FROM public.approval_levels
    WHERE ativo = true
      AND NEW.valor_solicitado >= valor_min
      AND (valor_max IS NULL OR NEW.valor_solicitado < valor_max)
    ORDER BY ordem ASC
    LIMIT 1;
    NEW.approval_level_id := lvl_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_proposal_approval_level
  BEFORE INSERT OR UPDATE OF valor_solicitado ON public.credit_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_proposal_approval_level();
