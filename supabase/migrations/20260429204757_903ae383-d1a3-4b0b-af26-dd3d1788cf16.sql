-- 1. proposal_id passa a ser opcional
ALTER TABLE public.credit_reports
  ALTER COLUMN proposal_id DROP NOT NULL;

-- 2. Substitui o UNIQUE rígido em proposal_id por um índice único parcial
ALTER TABLE public.credit_reports
  DROP CONSTRAINT IF EXISTS credit_reports_proposal_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS credit_reports_proposal_id_uniq
  ON public.credit_reports (proposal_id)
  WHERE proposal_id IS NOT NULL;

-- 3. Garante 1 relatório por cedente (chave usada no upsert pela UI)
CREATE UNIQUE INDEX IF NOT EXISTS credit_reports_cedente_id_uniq
  ON public.credit_reports (cedente_id);

-- 4. Atualiza a policy de SELECT para também permitir via cedente
DROP POLICY IF EXISTS "Visibilidade do relatório segue proposta" ON public.credit_reports;

CREATE POLICY "Visibilidade do relatório segue cedente ou proposta"
  ON public.credit_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = credit_reports.cedente_id
        AND public.can_view_cedente(auth.uid(), c.owner_id)
    )
    OR (
      proposal_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.credit_proposals p
        WHERE p.id = credit_reports.proposal_id
          AND public.can_view_proposal(auth.uid(), p.cedente_id)
      )
    )
  );