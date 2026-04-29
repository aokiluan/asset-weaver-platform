ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS categoria_sugerida_id uuid REFERENCES public.documento_categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classificacao_status text NOT NULL DEFAULT 'pendente';