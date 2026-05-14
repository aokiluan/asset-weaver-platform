
ALTER TABLE public.investor_boletas
  ADD COLUMN IF NOT EXISTS investidor_id uuid;

CREATE INDEX IF NOT EXISTS idx_investor_boletas_investidor ON public.investor_boletas(investidor_id);

ALTER TABLE public.signature_tracking
  ADD COLUMN IF NOT EXISTS signed_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage policies for bucket investor-boletas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Investor boletas: select own/admin') THEN
    CREATE POLICY "Investor boletas: select own/admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'investor-boletas' AND (
        public.has_role(auth.uid(),'admin')
        OR public.can_access_module(auth.uid(),'financeiro_mod')
        OR EXISTS (
          SELECT 1 FROM public.investor_boletas b
          WHERE b.user_id = auth.uid()
            AND (
              name LIKE b.investidor_id::text || '/%'
              OR name LIKE '%/' || b.id::text || '/%'
            )
        )
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Investor boletas: insert authenticated') THEN
    CREATE POLICY "Investor boletas: insert authenticated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'investor-boletas');
  END IF;
END$$;
