-- Coluna que rastreia de qual etapa o cedente foi devolvido para 'novo'
ALTER TABLE public.cedentes
ADD COLUMN IF NOT EXISTS returned_from_stage public.cedente_stage;

-- Trigger: ao mudar para 'novo' vindo de analise/comite/formalizacao, registra origem.
-- Ao avançar para qualquer outra etapa, limpa o campo.
CREATE OR REPLACE FUNCTION public.set_cedente_returned_from_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    IF NEW.stage = 'novo'::public.cedente_stage
       AND OLD.stage IN ('analise'::public.cedente_stage,
                         'comite'::public.cedente_stage,
                         'formalizacao'::public.cedente_stage) THEN
      NEW.returned_from_stage := OLD.stage;
    ELSIF NEW.stage <> 'novo'::public.cedente_stage THEN
      NEW.returned_from_stage := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cedentes_returned_from_stage ON public.cedentes;
CREATE TRIGGER trg_cedentes_returned_from_stage
BEFORE UPDATE ON public.cedentes
FOR EACH ROW
EXECUTE FUNCTION public.set_cedente_returned_from_stage();