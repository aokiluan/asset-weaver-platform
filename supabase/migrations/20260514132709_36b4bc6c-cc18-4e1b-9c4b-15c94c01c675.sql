-- Add status to enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'investor_boleta_status' AND e.enumlabel = 'aguardando_assinatura'
  ) THEN
    ALTER TYPE public.investor_boleta_status ADD VALUE 'aguardando_assinatura';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.signature_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boleta_id uuid NOT NULL REFERENCES public.investor_boletas(id) ON DELETE CASCADE,
  autentique_document_id text NOT NULL UNIQUE,
  document_name text,
  status text NOT NULL DEFAULT 'pending',
  signers jsonb NOT NULL DEFAULT '[]'::jsonb,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_tracking_boleta ON public.signature_tracking(boleta_id);

ALTER TABLE public.signature_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade do tracking segue boleta"
ON public.signature_tracking FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.investor_boletas b
  WHERE b.id = signature_tracking.boleta_id
    AND (b.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE TRIGGER trg_signature_tracking_updated_at
BEFORE UPDATE ON public.signature_tracking
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();