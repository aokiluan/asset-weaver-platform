
-- Garante unaccent disponível no search_path
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- Helper: slugify
CREATE OR REPLACE FUNCTION public.docfn_slugify(_input text, _max int DEFAULT 40)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT substring(
    regexp_replace(
      regexp_replace(
        lower(public.unaccent(coalesce(_input, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '(^-+|-+$)', '', 'g'
    ),
    1, _max
  );
$$;

-- Helper: abrevia razão social
CREATE OR REPLACE FUNCTION public.docfn_abrev_razao(_razao text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  parts text[];
  filtered text[] := ARRAY[]::text[];
  w text;
  stop text[] := ARRAY['ltda','sa','me','epp','eireli','cia','comercio','industria','servicos','do','da','de','dos','das','e'];
BEGIN
  IF _razao IS NULL OR length(btrim(_razao)) = 0 THEN
    RETURN 'cedente';
  END IF;
  parts := regexp_split_to_array(lower(public.unaccent(_razao)), '\s+');
  FOREACH w IN ARRAY parts LOOP
    w := regexp_replace(w, '[^a-z0-9]', '', 'g');
    IF length(w) > 0 AND NOT (w = ANY(stop)) THEN
      filtered := array_append(filtered, w);
    END IF;
    EXIT WHEN array_length(filtered, 1) >= 2;
  END LOOP;
  IF filtered IS NULL OR array_length(filtered, 1) = 0 THEN
    RETURN substring(public.docfn_slugify(_razao), 1, 18);
  END IF;
  RETURN substring(public.docfn_slugify(array_to_string(filtered, '-')), 1, 18);
END;
$$;

-- 1) Preserva nome original onde ainda não preenchido
UPDATE public.documentos
SET nome_arquivo_original = nome_arquivo
WHERE nome_arquivo_original IS NULL OR nome_arquivo_original = '';

-- 2) Recalcula nome_arquivo
WITH ranked AS (
  SELECT
    d.id,
    d.nome_arquivo,
    d.created_at,
    c.razao_social,
    cat.nome AS categoria_nome,
    ROW_NUMBER() OVER (
      PARTITION BY d.cedente_id, COALESCE(d.categoria_id::text, 'sem-cat')
      ORDER BY d.created_at ASC
    ) AS seq
  FROM public.documentos d
  JOIN public.cedentes c ON c.id = d.cedente_id
  LEFT JOIN public.documento_categorias cat ON cat.id = d.categoria_id
)
UPDATE public.documentos d
SET nome_arquivo =
  to_char(r.created_at, 'YYYY"."MM"."DD')
  || '_' || public.docfn_slugify(COALESCE(r.categoria_nome, 'outros'), 30)
  || '_' || public.docfn_abrev_razao(r.razao_social)
  || '_v' || lpad(r.seq::text, 2, '0')
  || COALESCE(
       (SELECT '.' || lower((regexp_match(r.nome_arquivo, '\.([^.]+)$'))[1])),
       ''
     )
FROM ranked r
WHERE r.id = d.id;
