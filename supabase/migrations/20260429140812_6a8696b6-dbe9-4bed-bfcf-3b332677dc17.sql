ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS minuta_assinada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minuta_assinada_em timestamptz,
  ADD COLUMN IF NOT EXISTS minuta_assinada_por uuid;