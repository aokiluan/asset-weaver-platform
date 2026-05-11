CREATE OR REPLACE FUNCTION public.cedente_ensure_proposal_on_comite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  default_valor numeric;
  existing_session_id uuid;
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

    -- Garante que a sessão de comitê já esteja aberta automaticamente
    SELECT id INTO existing_session_id
    FROM public.committee_sessions
    WHERE proposal_id = existing_id
    LIMIT 1;

    IF existing_session_id IS NULL THEN
      INSERT INTO public.committee_sessions (proposal_id, voto_secreto, status, created_by)
      VALUES (existing_id, true, 'aberta', COALESCE(auth.uid(), NEW.owner_id, NEW.created_by));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;