
-- Função: garante uma proposta de crédito para o cedente.
-- Se já existir, retorna a mais recente; senão cria uma com defaults.
CREATE OR REPLACE FUNCTION public.ensure_proposal_for_cedente(_cedente_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
  ced RECORD;
  default_valor numeric;
BEGIN
  -- Permissão: só quem pode ver a proposta deste cedente pode disparar
  IF NOT public.can_view_proposal(auth.uid(), _cedente_id) THEN
    RAISE EXCEPTION 'Sem permissão para acessar propostas deste cedente';
  END IF;

  SELECT id INTO existing_id
  FROM public.credit_proposals
  WHERE cedente_id = _cedente_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  SELECT * INTO ced FROM public.cedentes WHERE id = _cedente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cedente não encontrado';
  END IF;

  default_valor := COALESCE(ced.limite_aprovado, ced.faturamento_medio, 0);

  INSERT INTO public.credit_proposals (cedente_id, valor_solicitado, stage, created_by)
  VALUES (_cedente_id, default_valor, 'comite'::proposal_stage, COALESCE(auth.uid(), ced.owner_id, ced.created_by))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Função interna usada no trigger (sem checagem de auth.uid, pois roda em update do cedente)
CREATE OR REPLACE FUNCTION public.cedente_ensure_proposal_on_comite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  ced RECORD;
  default_valor numeric;
BEGIN
  IF NEW.stage = 'comite'::cedente_stage
     AND (OLD.stage IS DISTINCT FROM NEW.stage) THEN

    SELECT id INTO existing_id
    FROM public.credit_proposals
    WHERE cedente_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF existing_id IS NULL THEN
      default_valor := COALESCE(NEW.limite_aprovado, NEW.faturamento_medio, 0);
      INSERT INTO public.credit_proposals (cedente_id, valor_solicitado, stage, created_by)
      VALUES (NEW.id, default_valor, 'comite'::proposal_stage, COALESCE(auth.uid(), NEW.owner_id, NEW.created_by));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cedente_ensure_proposal_on_comite ON public.cedentes;
CREATE TRIGGER trg_cedente_ensure_proposal_on_comite
  AFTER UPDATE OF stage ON public.cedentes
  FOR EACH ROW
  EXECUTE FUNCTION public.cedente_ensure_proposal_on_comite();
