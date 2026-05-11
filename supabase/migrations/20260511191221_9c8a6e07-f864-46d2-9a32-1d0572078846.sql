CREATE OR REPLACE FUNCTION public.ensure_committee_session_for_proposal(_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_session_id uuid;
  proposal_record public.credit_proposals%ROWTYPE;
BEGIN
  IF _proposal_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
    INTO proposal_record
  FROM public.credit_proposals
  WHERE id = _proposal_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF proposal_record.stage <> 'comite'::public.proposal_stage THEN
    RETURN NULL;
  END IF;

  SELECT id
    INTO existing_session_id
  FROM public.committee_sessions
  WHERE proposal_id = _proposal_id
  LIMIT 1;

  IF existing_session_id IS NOT NULL THEN
    RETURN existing_session_id;
  END IF;

  INSERT INTO public.committee_sessions (proposal_id, voto_secreto, status, created_by)
  VALUES (_proposal_id, true, 'aberta', proposal_record.created_by)
  ON CONFLICT (proposal_id) DO NOTHING
  RETURNING id INTO existing_session_id;

  IF existing_session_id IS NULL THEN
    SELECT id
      INTO existing_session_id
    FROM public.committee_sessions
    WHERE proposal_id = _proposal_id
    LIMIT 1;
  END IF;

  RETURN existing_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cedente_ensure_proposal_on_comite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
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
      VALUES (NEW.id, default_valor, 'comite'::proposal_stage, COALESCE(auth.uid(), NEW.owner_id, NEW.created_by))
      RETURNING id INTO existing_id;
    END IF;

    PERFORM public.ensure_committee_session_for_proposal(existing_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.credit_proposal_ensure_committee_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'comite'::public.proposal_stage
     AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage) THEN
    PERFORM public.ensure_committee_session_for_proposal(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_proposal_ensure_committee_session ON public.credit_proposals;
CREATE TRIGGER trg_credit_proposal_ensure_committee_session
  AFTER INSERT OR UPDATE OF stage ON public.credit_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_proposal_ensure_committee_session();

INSERT INTO public.committee_sessions (proposal_id, voto_secreto, status, created_by)
SELECT p.id, true, 'aberta', p.created_by
FROM public.credit_proposals p
LEFT JOIN public.committee_sessions s
  ON s.proposal_id = p.id
WHERE p.stage = 'comite'::public.proposal_stage
  AND s.id IS NULL
ON CONFLICT (proposal_id) DO NOTHING;