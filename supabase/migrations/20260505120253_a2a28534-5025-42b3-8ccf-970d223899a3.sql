
-- Add attachments_top column for top-level pareceres
ALTER TABLE public.credit_reports
ADD COLUMN IF NOT EXISTS attachments_top jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Storage policies for report-files bucket (cedentes/<id>/credit-report/...)
CREATE POLICY "Crédito faz upload de anexos do relatório"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'report-files'
  AND (storage.foldername(name))[1] = 'cedentes'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analista_credito')
    OR public.has_role(auth.uid(), 'gestor_credito')
    OR public.has_role(auth.uid(), 'gestor_risco')
  )
);

CREATE POLICY "Crédito remove anexos do relatório"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'report-files'
  AND (storage.foldername(name))[1] = 'cedentes'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'analista_credito')
    OR public.has_role(auth.uid(), 'gestor_credito')
    OR public.has_role(auth.uid(), 'gestor_risco')
  )
);

CREATE POLICY "Visibilidade de anexos do relatório segue cedente"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'report-files'
  AND (storage.foldername(name))[1] = 'cedentes'
  AND EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);
