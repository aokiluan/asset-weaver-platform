-- Backfill: sincroniza o nome do contato com o nome do investidor da boleta mais recente
UPDATE public.investor_contacts c
SET name = sub.nome
FROM (
  SELECT DISTINCT ON (b.contact_id)
    b.contact_id,
    NULLIF(TRIM(b.dados_investidor->>'nome'), '') AS nome
  FROM public.investor_boletas b
  WHERE b.dados_investidor ? 'nome'
    AND NULLIF(TRIM(b.dados_investidor->>'nome'), '') IS NOT NULL
  ORDER BY b.contact_id, b.updated_at DESC
) sub
WHERE c.id = sub.contact_id
  AND c.name IS DISTINCT FROM sub.nome;