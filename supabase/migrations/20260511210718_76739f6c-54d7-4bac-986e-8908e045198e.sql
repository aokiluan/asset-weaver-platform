
ALTER TABLE public.documento_categorias
  ADD COLUMN IF NOT EXISTS requer_conciliacao boolean NOT NULL DEFAULT true;

INSERT INTO public.documento_categorias (nome, descricao, obrigatorio, requer_conciliacao, ordem, ativo)
SELECT 'Outros / Anexos gerais',
       'Documentos complementares ao dossiê do cedente (não entram na fila de conciliação)',
       false, false, 999, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.documento_categorias WHERE nome = 'Outros / Anexos gerais'
);
