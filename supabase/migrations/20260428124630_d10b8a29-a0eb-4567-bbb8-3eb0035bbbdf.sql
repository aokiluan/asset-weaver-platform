
-- =========================================================
-- TABLE: cedentes
-- =========================================================
CREATE TYPE public.cedente_status AS ENUM ('prospect', 'em_analise', 'aprovado', 'reprovado', 'inativo');

CREATE TABLE public.cedentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  setor TEXT,
  faturamento_medio NUMERIC(18,2),
  status public.cedente_status NOT NULL DEFAULT 'prospect',
  limite_aprovado NUMERIC(18,2),
  observacoes TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cedentes_owner ON public.cedentes(owner_id);
CREATE INDEX idx_cedentes_status ON public.cedentes(status);
CREATE INDEX idx_cedentes_lead ON public.cedentes(lead_id);

ALTER TABLE public.cedentes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cedentes_updated_at
  BEFORE UPDATE ON public.cedentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: pode ver cedente?
CREATE OR REPLACE FUNCTION public.can_view_cedente(_user_id uuid, _owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco')
    OR _owner_id = _user_id;
$$;

-- RLS cedentes
CREATE POLICY "Visibilidade de cedentes"
ON public.cedentes FOR SELECT TO authenticated
USING (public.can_view_cedente(auth.uid(), owner_id));

CREATE POLICY "Comercial cria cedentes"
ON public.cedentes FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor_comercial')
  OR public.has_role(auth.uid(), 'comercial')
);

CREATE POLICY "Editar próprios cedentes ou gestor"
ON public.cedentes FOR UPDATE TO authenticated
USING (public.is_admin_or_gestor_comercial(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "Admin/Gestor removem cedentes"
ON public.cedentes FOR DELETE TO authenticated
USING (public.is_admin_or_gestor_comercial(auth.uid()));

-- =========================================================
-- TABLE: documento_categorias
-- =========================================================
CREATE TABLE public.documento_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documento_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem categorias de documento"
ON public.documento_categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia categorias (insert)"
ON public.documento_categorias FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia categorias (update)"
ON public.documento_categorias FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia categorias (delete)"
ON public.documento_categorias FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.documento_categorias (nome, descricao, obrigatorio, ordem) VALUES
  ('Contrato Social', 'Contrato social vigente', true, 1),
  ('Última Alteração Contratual', 'Última alteração do contrato social', false, 2),
  ('Cartão CNPJ', 'Comprovante de inscrição CNPJ', true, 3),
  ('Balanço Patrimonial', 'Balanço dos últimos 2 exercícios', true, 4),
  ('DRE', 'Demonstração do Resultado do Exercício', true, 5),
  ('Faturamento 12 meses', 'Relatório de faturamento dos últimos 12 meses', true, 6),
  ('Certidão Federal', 'Certidão negativa de débitos federais', true, 7),
  ('Certidão Estadual', 'Certidão negativa estadual', true, 8),
  ('Certidão Municipal', 'Certidão negativa municipal', true, 9),
  ('Certidão Trabalhista', 'Certidão negativa de débitos trabalhistas', true, 10),
  ('Comprovante de Endereço', 'Comprovante de endereço da empresa', false, 11),
  ('RG/CPF Sócios', 'Documentos pessoais dos sócios', true, 12),
  ('Outros', 'Outros documentos complementares', false, 99);

-- =========================================================
-- TABLE: documentos
-- =========================================================
CREATE TYPE public.documento_status AS ENUM ('pendente', 'aprovado', 'reprovado');

CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cedente_id UUID NOT NULL REFERENCES public.cedentes(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.documento_categorias(id) ON DELETE SET NULL,
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamanho_bytes BIGINT,
  mime_type TEXT,
  status public.documento_status NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  uploaded_by UUID NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_cedente ON public.documentos(cedente_id);
CREATE INDEX idx_documentos_status ON public.documentos(status);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: pode revisar (aprovar/reprovar) documento?
CREATE OR REPLACE FUNCTION public.can_review_documento(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'gestor_comercial')
    OR public.has_role(_user_id, 'analista_credito')
    OR public.has_role(_user_id, 'comite')
    OR public.has_role(_user_id, 'gestor_risco');
$$;

CREATE POLICY "Visibilidade de documentos segue cedente"
ON public.documentos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = documentos.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

CREATE POLICY "Upload de documentos por quem vê o cedente"
ON public.documentos FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = documentos.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

CREATE POLICY "Edição/revisão de documentos"
ON public.documentos FOR UPDATE TO authenticated
USING (
  public.can_review_documento(auth.uid())
  OR uploaded_by = auth.uid()
);

CREATE POLICY "Remoção de documentos"
ON public.documentos FOR DELETE TO authenticated
USING (
  public.is_admin_or_gestor_comercial(auth.uid())
  OR uploaded_by = auth.uid()
);

-- =========================================================
-- STORAGE BUCKET: cedente-docs (privado)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cedente-docs', 'cedente-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Convenção de path: {cedente_id}/{documento_id}-{nome_arquivo}
-- A primeira pasta é o cedente_id, usada para validar acesso.

CREATE POLICY "Cedente docs - select por acesso ao cedente"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cedente-docs'
  AND EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

CREATE POLICY "Cedente docs - insert por acesso ao cedente"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cedente-docs'
  AND EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

CREATE POLICY "Cedente docs - update admin/gestor"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cedente-docs'
  AND public.is_admin_or_gestor_comercial(auth.uid())
);

CREATE POLICY "Cedente docs - delete admin/gestor"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cedente-docs'
  AND public.is_admin_or_gestor_comercial(auth.uid())
);
