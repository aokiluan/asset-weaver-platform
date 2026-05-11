-- Colunas
ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS cadastro_revisado_em timestamptz,
  ADD COLUMN IF NOT EXISTS cadastro_revisado_por uuid;

-- Backfill: cedentes com contrato assinado contam a partir da assinatura
UPDATE public.cedentes
SET cadastro_revisado_em = minuta_assinada_em
WHERE minuta_assinada = true
  AND cadastro_revisado_em IS NULL
  AND minuta_assinada_em IS NOT NULL;

-- Índice para queries de "vencidos"
CREATE INDEX IF NOT EXISTS idx_cedentes_renovacao
  ON public.cedentes (cadastro_revisado_em)
  WHERE minuta_assinada = true;

-- RPC para marcar como revisado
CREATE OR REPLACE FUNCTION public.marcar_cadastro_revisado(_cedente_id uuid, _observacao text DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin') OR
    public.has_role(v_uid, 'formalizacao') OR
    public.has_role(v_uid, 'cadastro') OR
    public.is_gestor_geral(v_uid)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para marcar renovação cadastral';
  END IF;

  UPDATE public.cedentes
  SET cadastro_revisado_em = v_now,
      cadastro_revisado_por = v_uid
  WHERE id = _cedente_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cedente não encontrado';
  END IF;

  INSERT INTO public.cedente_history(cedente_id, user_id, evento, detalhes)
  VALUES (_cedente_id, v_uid, 'cadastro_revisado',
    jsonb_build_object(
      'revisado_em', v_now,
      'observacao', NULLIF(btrim(COALESCE(_observacao, '')), '')
    ));

  RETURN v_now;
END;
$function$;