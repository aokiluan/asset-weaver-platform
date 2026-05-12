
-- ============================================================
-- 1. Tabela cedente_revalidacao_ciclos
-- ============================================================
CREATE TYPE public.revalidacao_status AS ENUM ('aberto', 'concluido', 'cancelado');
CREATE TYPE public.revalidacao_decisao AS ENUM ('mantido', 'alterado', 'encerrado');

CREATE TABLE public.cedente_revalidacao_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cedente_id uuid NOT NULL,
  numero integer NOT NULL,
  etapa_atual public.cedente_stage NOT NULL DEFAULT 'cadastro'::public.cedente_stage,
  status public.revalidacao_status NOT NULL DEFAULT 'aberto'::public.revalidacao_status,
  decisao public.revalidacao_decisao,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  iniciado_por uuid NOT NULL,
  concluido_em timestamptz,
  concluido_por uuid,
  cancelado_em timestamptz,
  cancelado_por uuid,
  cancelamento_motivo text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cedente_id, numero)
);

CREATE INDEX idx_revalidacao_ciclos_cedente ON public.cedente_revalidacao_ciclos(cedente_id);
CREATE INDEX idx_revalidacao_ciclos_status ON public.cedente_revalidacao_ciclos(status);

ALTER TABLE public.cedente_revalidacao_ciclos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade de ciclos segue cedente"
ON public.cedente_revalidacao_ciclos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cedentes c
  WHERE c.id = cedente_revalidacao_ciclos.cedente_id
    AND public.can_view_cedente(auth.uid(), c.owner_id)
));

CREATE POLICY "Admin atualiza ciclos"
ON public.cedente_revalidacao_ciclos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'cadastro') OR
  public.is_gestor_geral(auth.uid())
);

CREATE POLICY "Admin remove ciclos"
ON public.cedente_revalidacao_ciclos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- INSERT acontece via RPC SECURITY DEFINER; sem policy explícita.

CREATE TRIGGER trg_revalidacao_ciclos_updated
BEFORE UPDATE ON public.cedente_revalidacao_ciclos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Coluna ciclo_id em artefatos (nullable = legado)
-- ============================================================
ALTER TABLE public.documentos
  ADD COLUMN ciclo_id uuid REFERENCES public.cedente_revalidacao_ciclos(id) ON DELETE SET NULL;

ALTER TABLE public.cedente_visit_reports
  ADD COLUMN ciclo_id uuid REFERENCES public.cedente_revalidacao_ciclos(id) ON DELETE SET NULL;

ALTER TABLE public.credit_reports
  ADD COLUMN ciclo_id uuid REFERENCES public.cedente_revalidacao_ciclos(id) ON DELETE SET NULL;

ALTER TABLE public.committee_sessions
  ADD COLUMN ciclo_id uuid REFERENCES public.cedente_revalidacao_ciclos(id) ON DELETE SET NULL;

CREATE INDEX idx_documentos_ciclo ON public.documentos(ciclo_id);
CREATE INDEX idx_visit_reports_ciclo ON public.cedente_visit_reports(ciclo_id);
CREATE INDEX idx_credit_reports_ciclo ON public.credit_reports(ciclo_id);
CREATE INDEX idx_committee_sessions_ciclo ON public.committee_sessions(ciclo_id);

-- ============================================================
-- 3. RPC: iniciar_ciclo_revalidacao
-- ============================================================
CREATE OR REPLACE FUNCTION public.iniciar_ciclo_revalidacao(_cedente_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_proximo integer;
  v_ciclo_id uuid;
  v_cedente public.cedentes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    public.has_role(v_uid,'admin') OR
    public.has_role(v_uid,'cadastro') OR
    public.is_gestor_geral(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para iniciar revalidação';
  END IF;

  SELECT * INTO v_cedente FROM public.cedentes WHERE id = _cedente_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cedente não encontrado';
  END IF;

  IF v_cedente.stage <> 'ativo'::public.cedente_stage THEN
    RAISE EXCEPTION 'Apenas cedentes Ativos podem entrar em revalidação';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cedente_revalidacao_ciclos
    WHERE cedente_id = _cedente_id AND status = 'aberto'::public.revalidacao_status
  ) THEN
    RAISE EXCEPTION 'Já existe um ciclo de revalidação em aberto';
  END IF;

  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_proximo
  FROM public.cedente_revalidacao_ciclos
  WHERE cedente_id = _cedente_id;

  INSERT INTO public.cedente_revalidacao_ciclos (
    cedente_id, numero, etapa_atual, status, iniciado_por
  ) VALUES (
    _cedente_id, v_proximo, 'cadastro'::public.cedente_stage, 'aberto'::public.revalidacao_status, v_uid
  ) RETURNING id INTO v_ciclo_id;

  INSERT INTO public.cedente_history (cedente_id, user_id, evento, detalhes)
  VALUES (_cedente_id, v_uid, 'revalidacao_iniciada',
    jsonb_build_object('ciclo_id', v_ciclo_id, 'numero', v_proximo));

  RETURN v_ciclo_id;
END;
$$;

-- ============================================================
-- 4. RPC: concluir_ciclo_revalidacao
-- ============================================================
CREATE OR REPLACE FUNCTION public.concluir_ciclo_revalidacao(
  _ciclo_id uuid,
  _decisao public.revalidacao_decisao,
  _observacoes text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_ciclo public.cedente_revalidacao_ciclos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    public.has_role(v_uid,'admin') OR
    public.has_role(v_uid,'cadastro') OR
    public.is_gestor_geral(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para concluir revalidação';
  END IF;

  SELECT * INTO v_ciclo FROM public.cedente_revalidacao_ciclos WHERE id = _ciclo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;
  IF v_ciclo.status <> 'aberto'::public.revalidacao_status THEN
    RAISE EXCEPTION 'Ciclo não está aberto';
  END IF;

  UPDATE public.cedente_revalidacao_ciclos
  SET status = 'concluido'::public.revalidacao_status,
      decisao = _decisao,
      concluido_em = v_now,
      concluido_por = v_uid,
      observacoes = NULLIF(btrim(COALESCE(_observacoes, '')), '')
  WHERE id = _ciclo_id;

  IF _decisao = 'encerrado'::public.revalidacao_decisao THEN
    UPDATE public.cedentes
    SET stage = 'inativo'::public.cedente_stage
    WHERE id = v_ciclo.cedente_id;
  ELSE
    UPDATE public.cedentes
    SET cadastro_revisado_em = v_now,
        cadastro_revisado_por = v_uid
    WHERE id = v_ciclo.cedente_id;
  END IF;

  INSERT INTO public.cedente_history (cedente_id, user_id, evento, detalhes)
  VALUES (v_ciclo.cedente_id, v_uid, 'revalidacao_concluida',
    jsonb_build_object(
      'ciclo_id', _ciclo_id,
      'numero', v_ciclo.numero,
      'decisao', _decisao,
      'observacoes', NULLIF(btrim(COALESCE(_observacoes, '')), '')
    ));

  RETURN v_now;
END;
$$;

-- ============================================================
-- 5. RPC: cancelar_ciclo_revalidacao
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancelar_ciclo_revalidacao(
  _ciclo_id uuid,
  _motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ciclo public.cedente_revalidacao_ciclos%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (public.has_role(v_uid,'admin') OR public.is_gestor_geral(v_uid)) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar revalidação';
  END IF;

  IF _motivo IS NULL OR length(btrim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento é obrigatório';
  END IF;

  SELECT * INTO v_ciclo FROM public.cedente_revalidacao_ciclos WHERE id = _ciclo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;
  IF v_ciclo.status <> 'aberto'::public.revalidacao_status THEN
    RAISE EXCEPTION 'Ciclo não está aberto';
  END IF;

  UPDATE public.cedente_revalidacao_ciclos
  SET status = 'cancelado'::public.revalidacao_status,
      cancelado_em = now(),
      cancelado_por = v_uid,
      cancelamento_motivo = btrim(_motivo)
  WHERE id = _ciclo_id;

  INSERT INTO public.cedente_history (cedente_id, user_id, evento, detalhes)
  VALUES (v_ciclo.cedente_id, v_uid, 'revalidacao_cancelada',
    jsonb_build_object('ciclo_id', _ciclo_id, 'numero', v_ciclo.numero, 'motivo', btrim(_motivo)));
END;
$$;
