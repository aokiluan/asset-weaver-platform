-- Campos extras em cedentes
ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS capital_social numeric,
  ADD COLUMN IF NOT EXISTS natureza_juridica text,
  ADD COLUMN IF NOT EXISTS data_abertura date,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS logradouro text;

-- Tabela de sócios / representantes legais
CREATE TABLE IF NOT EXISTS public.cedente_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id uuid NOT NULL REFERENCES public.cedentes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sexo text,
  data_nascimento date,
  cpf text,
  rg text,
  orgao_emissor text,
  data_expedicao date,
  naturalidade text,
  nacionalidade text,
  nome_pai text,
  nome_mae text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  endereco_cep text,
  estado_civil text,
  conjuge_nome text,
  conjuge_sexo text,
  conjuge_data_nascimento date,
  conjuge_cpf text,
  conjuge_rg text,
  conjuge_orgao_emissor text,
  conjuge_data_expedicao date,
  conjuge_naturalidade text,
  conjuge_nacionalidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cedente_socios_cedente ON public.cedente_socios(cedente_id);

ALTER TABLE public.cedente_socios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade de sócios segue cedente"
  ON public.cedente_socios FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_socios.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  ));

CREATE POLICY "Editar sócios (insert)"
  ON public.cedente_socios FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_socios.cedente_id
      AND (
        public.is_admin_or_gestor_comercial(auth.uid())
        OR public.has_role(auth.uid(), 'analista_cadastro')
        OR c.owner_id = auth.uid()
      )
  ));

CREATE POLICY "Editar sócios (update)"
  ON public.cedente_socios FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_socios.cedente_id
      AND (
        public.is_admin_or_gestor_comercial(auth.uid())
        OR public.has_role(auth.uid(), 'analista_cadastro')
        OR c.owner_id = auth.uid()
      )
  ));

CREATE POLICY "Remover sócios"
  ON public.cedente_socios FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_socios.cedente_id
      AND (
        public.is_admin_or_gestor_comercial(auth.uid())
        OR public.has_role(auth.uid(), 'analista_cadastro')
        OR c.owner_id = auth.uid()
      )
  ));

CREATE TRIGGER trg_cedente_socios_updated
  BEFORE UPDATE ON public.cedente_socios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();