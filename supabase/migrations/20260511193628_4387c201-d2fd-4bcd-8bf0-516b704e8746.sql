
-- ===== Comitê: encerramento automático + ata =====

-- 1) Sequence p/ número do comitê
CREATE SEQUENCE IF NOT EXISTS public.committee_minutes_numero_seq START 1;

-- 2) Tabela de atas (snapshot imutável da sessão encerrada)
CREATE TABLE IF NOT EXISTS public.committee_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.committee_sessions(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.credit_proposals(id) ON DELETE CASCADE,
  cedente_id uuid NOT NULL REFERENCES public.cedentes(id) ON DELETE CASCADE,
  numero_comite integer NOT NULL DEFAULT nextval('public.committee_minutes_numero_seq'),
  realizado_em timestamptz NOT NULL DEFAULT now(),
  participantes jsonb NOT NULL DEFAULT '[]'::jsonb,
  pleito jsonb NOT NULL DEFAULT '{}'::jsonb,
  recomendacao_credito text,
  pontos_positivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  pontos_atencao jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisao text NOT NULL CHECK (decisao IN ('aprovado','reprovado')),
  totais jsonb NOT NULL DEFAULT '{}'::jsonb,
  alcada_nome text,
  votos_minimos_alcada integer,
  condicoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_minutes_cedente ON public.committee_minutes(cedente_id);
CREATE INDEX IF NOT EXISTS idx_minutes_realizado ON public.committee_minutes(realizado_em DESC);

ALTER TABLE public.committee_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver ata segue proposta"
  ON public.committee_minutes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.credit_proposals p
    WHERE p.id = committee_minutes.proposal_id
    AND public.can_view_proposal(auth.uid(), p.cedente_id)));

CREATE POLICY "Admin/Comitê edita condições da ata"
  ON public.committee_minutes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite'));

CREATE POLICY "Admin remove ata"
  ON public.committee_minutes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_committee_minutes_updated_at
  BEFORE UPDATE ON public.committee_minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Função: ids dos membros elegíveis a votar
CREATE OR REPLACE FUNCTION public.committee_eligible_voter_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT ur.user_id), ARRAY[]::uuid[])
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'comite'::public.app_role
    AND p.ativo = true;
$$;

-- 4) Função: encerra a sessão se todos os elegíveis já votaram (ou se forçado)
CREATE OR REPLACE FUNCTION public.committee_close_if_complete(_proposal_id uuid, _force boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_session public.committee_sessions%ROWTYPE;
  v_proposal public.credit_proposals%ROWTYPE;
  v_eligible uuid[];
  v_voted_count integer;
  v_fav integer;
  v_desfav integer;
  v_decisao text;
  v_minute_id uuid;
  v_alcada record;
  v_report record;
  v_visit record;
  v_participantes jsonb;
  v_pontos_pos jsonb;
  v_pontos_at jsonb;
  v_pleito jsonb;
BEGIN
  SELECT * INTO v_session FROM public.committee_sessions WHERE proposal_id = _proposal_id LIMIT 1;
  IF NOT FOUND OR v_session.status <> 'aberta' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_proposal FROM public.credit_proposals WHERE id = _proposal_id;
  IF NOT FOUND OR v_proposal.stage <> 'comite'::public.proposal_stage THEN
    RETURN NULL;
  END IF;

  v_eligible := public.committee_eligible_voter_ids();

  SELECT count(*) INTO v_voted_count
  FROM public.committee_votes
  WHERE proposal_id = _proposal_id AND voter_id = ANY(v_eligible);

  IF NOT _force AND (array_length(v_eligible,1) IS NULL OR v_voted_count < array_length(v_eligible,1)) THEN
    RETURN NULL;
  END IF;

  SELECT
    count(*) FILTER (WHERE decisao = 'favoravel') AS fav,
    count(*) FILTER (WHERE decisao = 'desfavoravel') AS desfav
  INTO v_fav, v_desfav
  FROM public.committee_votes WHERE proposal_id = _proposal_id;

  v_decisao := CASE WHEN v_fav > v_desfav THEN 'aprovado' ELSE 'reprovado' END;

  -- snapshot participantes
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'voter_id', v.voter_id,
    'nome', p.nome,
    'voto', v.decisao,
    'justificativa', v.justificativa,
    'votou_em', v.created_at,
    'checklist_completo', v.checklist_completo
  ) ORDER BY p.nome), '[]'::jsonb)
  INTO v_participantes
  FROM public.committee_votes v
  LEFT JOIN public.profiles p ON p.id = v.voter_id
  WHERE v.proposal_id = _proposal_id;

  -- alçada
  SELECT al.nome AS nome, al.votos_minimos AS votos_minimos
  INTO v_alcada
  FROM public.approval_levels al WHERE al.id = v_proposal.approval_level_id;

  -- relatório de crédito
  SELECT cr.recomendacao, cr.pontos_positivos, cr.pontos_atencao, cr.pleito
  INTO v_report
  FROM public.credit_reports cr
  WHERE cr.cedente_id = v_proposal.cedente_id
  ORDER BY cr.updated_at DESC LIMIT 1;

  -- relatório de visita (pleito)
  SELECT vr.limite_global_solicitado, vr.modalidades
  INTO v_visit
  FROM public.cedente_visit_reports vr
  WHERE vr.cedente_id = v_proposal.cedente_id
  ORDER BY vr.updated_at DESC LIMIT 1;

  v_pontos_pos := COALESCE(
    CASE WHEN v_report.pontos_positivos IS NOT NULL AND v_report.pontos_positivos <> ''
      THEN to_jsonb(string_to_array(v_report.pontos_positivos, E'\n'))
    END, '[]'::jsonb);

  v_pontos_at := COALESCE(
    CASE WHEN v_report.pontos_atencao IS NOT NULL AND v_report.pontos_atencao <> ''
      THEN to_jsonb(string_to_array(v_report.pontos_atencao, E'\n'))
    END, '[]'::jsonb);

  v_pleito := jsonb_build_object(
    'valor_solicitado', v_proposal.valor_solicitado,
    'prazo_dias', v_proposal.prazo_dias,
    'taxa_sugerida', v_proposal.taxa_sugerida,
    'limite_global_solicitado', v_visit.limite_global_solicitado,
    'modalidades', COALESCE(v_visit.modalidades, '{}'::jsonb),
    'pleito_credito', COALESCE(v_report.pleito, '{}'::jsonb)
  );

  -- encerra sessão
  UPDATE public.committee_sessions
  SET status = 'encerrada',
      revelada_em = COALESCE(revelada_em, now()),
      encerrada_em = now()
  WHERE id = v_session.id;

  -- decide proposta
  UPDATE public.credit_proposals
  SET stage = v_decisao::public.proposal_stage,
      decided_at = now()
  WHERE id = _proposal_id;

  -- se aprovado, move cedente para formalização
  IF v_decisao = 'aprovado' THEN
    UPDATE public.cedentes SET stage = 'formalizacao'::public.cedente_stage
    WHERE id = v_proposal.cedente_id AND stage = 'comite'::public.cedente_stage;
  END IF;

  -- cria ata (idempotente)
  INSERT INTO public.committee_minutes(
    session_id, proposal_id, cedente_id, realizado_em,
    participantes, pleito, recomendacao_credito,
    pontos_positivos, pontos_atencao,
    decisao, totais, alcada_nome, votos_minimos_alcada
  ) VALUES (
    v_session.id, _proposal_id, v_proposal.cedente_id, now(),
    v_participantes, v_pleito, v_report.recomendacao,
    v_pontos_pos, v_pontos_at,
    v_decisao,
    jsonb_build_object('favoraveis', v_fav, 'desfavoraveis', v_desfav, 'eligible', array_length(v_eligible,1), 'votaram', v_voted_count),
    v_alcada.nome, v_alcada.votos_minimos
  )
  ON CONFLICT (session_id) DO NOTHING
  RETURNING id INTO v_minute_id;

  IF v_minute_id IS NULL THEN
    SELECT id INTO v_minute_id FROM public.committee_minutes WHERE session_id = v_session.id;
  END IF;

  -- registra no histórico do cedente
  INSERT INTO public.cedente_history(cedente_id, user_id, evento, detalhes)
  VALUES (v_proposal.cedente_id, NULL, 'ata_comite',
    jsonb_build_object('minute_id', v_minute_id, 'decisao', v_decisao, 'proposal_id', _proposal_id));

  RETURN v_minute_id;
END;
$function$;

-- 5) Trigger em committee_votes
CREATE OR REPLACE FUNCTION public.tg_committee_votes_autoclose()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.committee_close_if_complete(NEW.proposal_id, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_votes_autoclose ON public.committee_votes;
CREATE TRIGGER trg_committee_votes_autoclose
  AFTER INSERT OR UPDATE ON public.committee_votes
  FOR EACH ROW EXECUTE FUNCTION public.tg_committee_votes_autoclose();
