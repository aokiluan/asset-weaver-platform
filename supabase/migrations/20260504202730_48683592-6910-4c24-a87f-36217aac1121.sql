ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS nome_arquivo_original text;
UPDATE public.documentos SET nome_arquivo_original = nome_arquivo WHERE nome_arquivo_original IS NULL;