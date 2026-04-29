ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS enviado_analise_em timestamptz;

CREATE OR REPLACE FUNCTION public.set_cedente_enviado_analise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    IF NEW.stage = 'cadastro' AND OLD.stage = 'novo' THEN
      NEW.enviado_analise_em := now();
    ELSIF NEW.stage = 'novo' THEN
      NEW.enviado_analise_em := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cedente_enviado_analise ON public.cedentes;
CREATE TRIGGER trg_set_cedente_enviado_analise
BEFORE UPDATE ON public.cedentes
FOR EACH ROW
EXECUTE FUNCTION public.set_cedente_enviado_analise();