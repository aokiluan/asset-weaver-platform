
-- 1) Colunas de versionamento no relatório principal
ALTER TABLE public.cedente_visit_reports
  ADD COLUMN IF NOT EXISTS versao_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS precisa_revisao boolean NOT NULL DEFAULT false;

-- 2) Tabela de versões (snapshots)
CREATE TABLE IF NOT EXISTS public.cedente_visit_report_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.cedente_visit_reports(id) ON DELETE CASCADE,
  cedente_id uuid NOT NULL,
  versao integer NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  motivo_alteracao text,
  -- snapshot dos campos do relatório
  data_visita date,
  tipo_visita text,
  visitante text,
  entrevistado_nome text,
  entrevistado_cargo text,
  entrevistado_cpf text,
  entrevistado_telefone text,
  entrevistado_email text,
  ramo_atividade text,
  faturamento_mensal numeric,
  principais_produtos text,
  qtd_funcionarios integer,
  pct_vendas_pf numeric,
  pct_vendas_pj numeric,
  pct_vendas_cheque numeric,
  pct_vendas_boleto numeric,
  pct_vendas_cartao numeric,
  pct_vendas_outros numeric,
  pct_fat_debito numeric,
  parceiros_financeiros text,
  empresas_ligadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  limite_global_solicitado numeric,
  modalidades jsonb NOT NULL DEFAULT '{}'::jsonb,
  avalistas_solidarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  assinatura_digital_tipo text,
  assinatura_digital_observacao text,
  parecer_comercial text,
  pontos_atencao text,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_visit_report_versions_report_versao
  ON public.cedente_visit_report_versions (report_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_visit_report_versions_cedente
  ON public.cedente_visit_report_versions (cedente_id, versao DESC);

-- 3) RLS
ALTER TABLE public.cedente_visit_report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade de versões segue cedente"
  ON public.cedente_visit_report_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_visit_report_versions.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  ));

CREATE POLICY "Comercial cria versões"
  ON public.cedente_visit_report_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cedentes c
      WHERE c.id = cedente_visit_report_versions.cedente_id
        AND public.can_view_cedente(auth.uid(), c.owner_id)
    )
    AND (public.has_role(auth.uid(),'comercial')
         OR public.has_role(auth.uid(),'admin')
         OR public.is_admin_or_gestor_comercial(auth.uid()))
  );

CREATE POLICY "Admin atualiza versões"
  ON public.cedente_visit_report_versions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove versões"
  ON public.cedente_visit_report_versions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Backfill: cria versão 1 (current) para cada relatório existente que ainda não tenha versões
INSERT INTO public.cedente_visit_report_versions (
  report_id, cedente_id, versao, is_current, motivo_alteracao,
  data_visita, tipo_visita, visitante,
  entrevistado_nome, entrevistado_cargo, entrevistado_cpf, entrevistado_telefone, entrevistado_email,
  ramo_atividade, faturamento_mensal, principais_produtos, qtd_funcionarios,
  pct_vendas_pf, pct_vendas_pj, pct_vendas_cheque, pct_vendas_boleto, pct_vendas_cartao, pct_vendas_outros, pct_fat_debito,
  parceiros_financeiros, empresas_ligadas,
  limite_global_solicitado, modalidades, avalistas_solidarios,
  assinatura_digital_tipo, assinatura_digital_observacao,
  parecer_comercial, pontos_atencao, fotos,
  created_by, created_at
)
SELECT
  r.id, r.cedente_id, 1, true, NULL,
  r.data_visita, r.tipo_visita, r.visitante,
  r.entrevistado_nome, r.entrevistado_cargo, r.entrevistado_cpf, r.entrevistado_telefone, r.entrevistado_email,
  r.ramo_atividade, r.faturamento_mensal, r.principais_produtos, r.qtd_funcionarios,
  r.pct_vendas_pf, r.pct_vendas_pj, r.pct_vendas_cheque, r.pct_vendas_boleto, r.pct_vendas_cartao, r.pct_vendas_outros, r.pct_fat_debito,
  r.parceiros_financeiros, r.empresas_ligadas,
  r.limite_global_solicitado, r.modalidades, r.avalistas_solidarios,
  r.assinatura_digital_tipo, r.assinatura_digital_observacao,
  r.parecer_comercial, r.pontos_atencao, r.fotos,
  r.created_by, r.created_at
FROM public.cedente_visit_reports r
WHERE NOT EXISTS (
  SELECT 1 FROM public.cedente_visit_report_versions v WHERE v.report_id = r.id
);
