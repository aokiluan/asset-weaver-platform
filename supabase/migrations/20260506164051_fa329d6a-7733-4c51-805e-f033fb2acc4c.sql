
CREATE TABLE public.committee_vote_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  item_key text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, voter_id, item_key)
);

CREATE INDEX idx_cvc_proposal_voter ON public.committee_vote_checklist (proposal_id, voter_id);

ALTER TABLE public.committee_vote_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade do checklist segue proposta"
ON public.committee_vote_checklist
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.credit_proposals p
  WHERE p.id = committee_vote_checklist.proposal_id
    AND public.can_view_proposal(auth.uid(), p.cedente_id)
));

CREATE POLICY "Votante marca o próprio checklist"
ON public.committee_vote_checklist
FOR INSERT TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND (public.has_role(auth.uid(),'comite') OR public.has_role(auth.uid(),'admin'))
);

CREATE POLICY "Votante remove o próprio checklist"
ON public.committee_vote_checklist
FOR DELETE TO authenticated
USING (voter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.committee_votes
  ADD COLUMN IF NOT EXISTS checklist_completo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS itens_revisados integer NOT NULL DEFAULT 0;
