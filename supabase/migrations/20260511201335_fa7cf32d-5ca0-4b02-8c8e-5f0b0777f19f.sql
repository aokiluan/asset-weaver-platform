-- Campos de rastreamento de reapresentação
ALTER TABLE public.credit_proposals
  ADD COLUMN IF NOT EXISTS proposta_anterior_id uuid REFERENCES public.credit_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_reapresentacao text,
  ADD COLUMN IF NOT EXISTS mudancas_reapresentacao text;

-- Atualiza committee_close_if_complete: arquiva cedente como inativo quando reprovado
CREATE OR REPLACE FUNCTION public.committee_close_if_complete(_proposal_id uuid, _force boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  v_numero integer;
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

  SELECT al.nome AS nome, al.votos_minimos AS votos_minimos
  INTO v_alcada
  FROM public.approval_levels al WHERE al.id = v_proposal.approval_level_id;

  SELECT cr.recomendacao, cr.pontos_positivos, cr.pontos_atencao, cr.pleito
  INTO v_report
  FROM public.credit_reports cr
  WHERE cr.cedente_id = v_proposal.cedente_id
  ORDER BY cr.updated_at DESC LIMIT 1;

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
    'pleito_credito', COALESCE(v_report.pleito, '{}'::jsonb),
    'motivo_reapresentacao', v_proposal.motivo_reapresentacao,
    'mudancas_reapresentacao', v_proposal.mudancas_reapresentacao,
    'proposta_anterior_id', v_proposal.proposta_anterior_id
  );

  UPDATE public.committee_sessions
  SET status = 'encerrada',
      revelada_em = COALESCE(revelada_em, now()),
      encerrada_em = now()
  WHERE id = v_session.id;

  UPDATE public.credit_proposals
  SET stage = v_decisao::public.proposal_stage,
      decided_at = now()
  WHERE id = _proposal_id;

  IF v_decisao = 'aprovado' THEN
    UPDATE public.cedentes SET stage = 'formalizacao'::public.cedente_stage
    WHERE id = v_proposal.cedente_id AND stage = 'comite'::public.cedente_stage;
  ELSE
    -- Reprovado: arquiva o cedente em 'inativo'
    UPDATE public.cedentes SET stage = 'inativo'::public.cedente_stage
    WHERE id = v_proposal.cedente_id AND stage = 'comite'::public.cedente_stage;
  END IF;

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
  RETURNING id, numero_comite INTO v_minute_id, v_numero;

  IF v_minute_id IS NULL THEN
    SELECT id, numero_comite INTO v_minute_id, v_numero FROM public.committee_minutes WHERE session_id = v_session.id;
  END IF;

  INSERT INTO public.cedente_history(cedente_id, user_id, evento, detalhes)
  VALUES (v_proposal.cedente_id, NULL, 'ata_comite',
    jsonb_build_object('minute_id', v_minute_id, 'decisao', v_decisao, 'proposal_id', _proposal_id, 'numero_comite', v_numero));

  -- Evento adicional destacando reprovação
  IF v_decisao = 'reprovado' THEN
    INSERT INTO public.cedente_history(cedente_id, user_id, evento, detalhes)
    VALUES (v_proposal.cedente_id, NULL, 'reprovado_comite',
      jsonb_build_object('minute_id', v_minute_id, 'proposal_id', _proposal_id, 'numero_comite', v_numero));
  END IF;

  RETURN v_minute_id;
END;
$function$;

-- RPC: reapresentar proposta ao comitê
CREATE OR REPLACE FUNCTION public.reapresentar_proposta_comite(
  _cedente_id uuid,
  _justificativa text,
  _mudancas text DEFAULT NULL
) RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_last_proposal public.credit_proposals%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'credito') OR public.has_role(v_uid,'comite')) THEN
    RAISE EXCEPTION 'Sem permissão para reapresentar proposta';
  END IF;

  IF _justificativa IS NULL OR length(btrim(_justificativa)) < 30 THEN
    RAISE EXCEPTION 'Justificativa obrigatória (mín. 30 caracteres)';
  END IF;

  SELECT * INTO v_last_proposal
  FROM public.credit_proposals
  WHERE cedente_id = _cedente_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cedente não possui proposta anterior';
  END IF;

  IF v_last_proposal.stage <> 'reprovado'::public.proposal_stage THEN
    RAISE EXCEPTION 'Última proposta não foi reprovada';
  END IF;

  -- Cria nova proposta clonando dados da anterior
  INSERT INTO public.credit_proposals (
    cedente_id, valor_solicitado, prazo_dias, taxa_sugerida,
    garantias, finalidade, observacoes, stage, created_by,
    proposta_anterior_id, motivo_reapresentacao, mudancas_reapresentacao
  ) VALUES (
    _cedente_id, v_last_proposal.valor_solicitado, v_last_proposal.prazo_dias, v_last_proposal.taxa_sugerida,
    v_last_proposal.garantias, v_last_proposal.finalidade, v_last_proposal.observacoes,
    'rascunho'::public.proposal_stage, v_uid,
    v_last_proposal.id, btrim(_justificativa), NULLIF(btrim(COALESCE(_mudancas,'')), '')
  ) RETURNING id INTO v_new_id;

  -- Volta cedente para análise de crédito
  UPDATE public.cedentes
  SET stage = 'analise'::public.cedente_stage
  WHERE id = _cedente_id;

  -- Histórico
  INSERT INTO public.cedente_history(cedente_id, user_id, evento, detalhes)
  VALUES (_cedente_id, v_uid, 'reapresentacao_comite',
    jsonb_build_object(
      'proposta_anterior_id', v_last_proposal.id,
      'nova_proposta_id', v_new_id,
      'justificativa', btrim(_justificativa),
      'mudancas', NULLIF(btrim(COALESCE(_mudancas,'')), '')
    ));

  RETURN v_new_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reapresentar_proposta_comite(uuid, text, text) TO authenticated;