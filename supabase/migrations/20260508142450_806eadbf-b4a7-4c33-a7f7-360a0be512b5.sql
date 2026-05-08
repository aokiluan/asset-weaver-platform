-- ============================================================
-- Função: quem pode editar dados do cedente conforme a etapa
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_edit_cedente(_user_id uuid, _stage public.cedente_stage, _owner_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.is_gestor_geral(_user_id)
    OR CASE _stage
      WHEN 'novo'         THEN (_owner_id = _user_id) OR (_owner_id IS NOT NULL AND public.is_team_manager_of(_user_id, _owner_id)) OR public.has_role(_user_id, 'comercial')
      WHEN 'cadastro'     THEN public.has_role(_user_id, 'cadastro')
      WHEN 'analise'      THEN public.has_role(_user_id, 'credito')
      WHEN 'comite'       THEN public.has_role(_user_id, 'comite')
      WHEN 'formalizacao' THEN public.has_role(_user_id, 'formalizacao')
      ELSE false
    END
$$;

-- ============================================================
-- cedentes: substituir policy de UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Editar cedentes" ON public.cedentes;
CREATE POLICY "Editar cedentes"
  ON public.cedentes
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_cedente(auth.uid(), stage, owner_id));

-- ============================================================
-- cedente_representantes: amarrar à etapa do cedente
-- ============================================================
DROP POLICY IF EXISTS "Editar representantes (insert)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Editar representantes (update)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Remover representantes" ON public.cedente_representantes;

CREATE POLICY "Editar representantes (insert)"
  ON public.cedente_representantes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
  ));

CREATE POLICY "Editar representantes (update)"
  ON public.cedente_representantes FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
  ));

CREATE POLICY "Remover representantes"
  ON public.cedente_representantes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
  ));

-- ============================================================
-- documentos: amarrar INSERT/UPDATE/DELETE à etapa
-- (mantém regra de quem fez upload poder editar/remover o próprio)
-- ============================================================
DROP POLICY IF EXISTS "Upload de documentos por quem vê o cedente" ON public.documentos;
DROP POLICY IF EXISTS "Edição/revisão de documentos" ON public.documentos;
DROP POLICY IF EXISTS "Remoção de documentos" ON public.documentos;

CREATE POLICY "Upload de documentos por etapa"
  ON public.documentos FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = documentos.cedente_id
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
  );

CREATE POLICY "Edição de documentos por etapa"
  ON public.documentos FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.can_review_documento(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = documentos.cedente_id
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
  );

CREATE POLICY "Remoção de documentos por etapa"
  ON public.documentos FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin_or_gestor_comercial(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = documentos.cedente_id
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
  );

-- ============================================================
-- cedente_visit_reports: edição segue etapa
-- ============================================================
DROP POLICY IF EXISTS "Editar próprio relatório ou gestor" ON public.cedente_visit_reports;
CREATE POLICY "Editar relatório de visita por etapa"
  ON public.cedente_visit_reports FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gestor_comercial(auth.uid())
    OR (created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = cedente_visit_reports.cedente_id
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    ))
  );

-- ============================================================
-- cedente_visit_report_versions: criar versão segue etapa
-- ============================================================
DROP POLICY IF EXISTS "Comercial cria versões" ON public.cedente_visit_report_versions;
CREATE POLICY "Cria versão de visita por etapa"
  ON public.cedente_visit_report_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = cedente_visit_report_versions.cedente_id
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
  );

-- ============================================================
-- credit_reports: criar/atualizar restrito a etapa "analise"
-- (admin e gestor_geral mantêm acesso pleno via can_edit_cedente)
-- ============================================================
DROP POLICY IF EXISTS "Crédito cria relatório" ON public.credit_reports;
DROP POLICY IF EXISTS "Crédito atualiza relatório" ON public.credit_reports;

CREATE POLICY "Cria relatório de crédito por etapa"
  ON public.credit_reports FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = credit_reports.cedente_id
        AND c.stage IN ('analise'::public.cedente_stage, 'comite'::public.cedente_stage)
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_geral(auth.uid())
  );

CREATE POLICY "Atualiza relatório de crédito por etapa"
  ON public.credit_reports FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = credit_reports.cedente_id
        AND c.stage IN ('analise'::public.cedente_stage, 'comite'::public.cedente_stage)
        AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_gestor_geral(auth.uid())
  );

-- ============================================================
-- credit_report_versions: criar versão segue etapa
-- ============================================================
DROP POLICY IF EXISTS "Crédito cria versões" ON public.credit_report_versions;
CREATE POLICY "Cria versão de crédito por etapa"
  ON public.credit_report_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.cedentes c
        WHERE c.id = credit_report_versions.cedente_id
          AND c.stage IN ('analise'::public.cedente_stage, 'comite'::public.cedente_stage)
          AND public.can_edit_cedente(auth.uid(), c.stage, c.owner_id)
      )
      OR public.has_role(auth.uid(), 'admin')
      OR public.is_gestor_geral(auth.uid())
    )
  );

-- ============================================================
-- credit_opinions: pareceres só durante análise/comitê
-- ============================================================
DROP POLICY IF EXISTS "Crédito cria parecer" ON public.credit_opinions;
CREATE POLICY "Crédito cria parecer na etapa correta"
  ON public.credit_opinions FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'credito')
        AND EXISTS (
          SELECT 1 FROM public.credit_proposals p
          JOIN public.cedentes c ON c.id = p.cedente_id
          WHERE p.id = credit_opinions.proposal_id
            AND c.stage IN ('analise'::public.cedente_stage, 'comite'::public.cedente_stage)
        )
      )
    )
  );

-- ============================================================
-- committee_votes: voto só com cedente em etapa "comite"
-- ============================================================
DROP POLICY IF EXISTS "Comitê vota" ON public.committee_votes;
CREATE POLICY "Comitê vota na etapa correta"
  ON public.committee_votes FOR INSERT TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'comite')
        AND EXISTS (
          SELECT 1 FROM public.credit_proposals p
          JOIN public.cedentes c ON c.id = p.cedente_id
          WHERE p.id = committee_votes.proposal_id
            AND c.stage = 'comite'::public.cedente_stage
        )
      )
    )
  );