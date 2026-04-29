
ALTER TABLE public.cedente_visit_reports
  ALTER COLUMN participantes DROP NOT NULL,
  ALTER COLUMN contexto DROP NOT NULL,
  ALTER COLUMN percepcoes DROP NOT NULL,
  ALTER COLUMN recomendacao DROP NOT NULL;

ALTER TABLE public.cedente_visit_reports
  ADD COLUMN IF NOT EXISTS tipo_visita text,
  ADD COLUMN IF NOT EXISTS visitante text,
  ADD COLUMN IF NOT EXISTS entrevistado_nome text,
  ADD COLUMN IF NOT EXISTS entrevistado_cargo text,
  ADD COLUMN IF NOT EXISTS entrevistado_cpf text,
  ADD COLUMN IF NOT EXISTS entrevistado_telefone text,
  ADD COLUMN IF NOT EXISTS entrevistado_email text,
  ADD COLUMN IF NOT EXISTS ramo_atividade text,
  ADD COLUMN IF NOT EXISTS faturamento_mensal numeric,
  ADD COLUMN IF NOT EXISTS principais_produtos text,
  ADD COLUMN IF NOT EXISTS qtd_funcionarios integer,
  ADD COLUMN IF NOT EXISTS pct_vendas_pf numeric,
  ADD COLUMN IF NOT EXISTS pct_vendas_pj numeric,
  ADD COLUMN IF NOT EXISTS pct_vendas_cheque numeric,
  ADD COLUMN IF NOT EXISTS pct_vendas_boleto numeric,
  ADD COLUMN IF NOT EXISTS pct_vendas_cartao numeric,
  ADD COLUMN IF NOT EXISTS pct_vendas_outros numeric,
  ADD COLUMN IF NOT EXISTS parceiros_financeiros text,
  ADD COLUMN IF NOT EXISTS empresas_ligadas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS limite_global_solicitado numeric,
  ADD COLUMN IF NOT EXISTS modalidades jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS avalistas_solidarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assinatura_digital_tipo text,
  ADD COLUMN IF NOT EXISTS assinatura_digital_observacao text,
  ADD COLUMN IF NOT EXISTS parecer_comercial text;
