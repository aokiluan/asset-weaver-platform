
-- 1) Suporte a respostas em thread (futuro)
ALTER TABLE public.cedente_history
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.cedente_history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cedente_history_cedente_created
  ON public.cedente_history (cedente_id, created_at DESC);

-- 2) Permitir INSERT de comentários por qualquer usuário que enxerga o cedente
DROP POLICY IF EXISTS "Comentar no histórico do cedente" ON public.cedente_history;
CREATE POLICY "Comentar no histórico do cedente"
ON public.cedente_history
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND evento = 'COMENTARIO'
  AND EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_history.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

-- 3) Atualiza trigger para gravar a observação informada no envio em detalhes.comentario
CREATE OR REPLACE FUNCTION public.log_cedente_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.cedente_history (cedente_id, user_id, evento, stage_novo)
    VALUES (NEW.id, NEW.created_by, 'criado', NEW.stage);
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    _det := '{}'::jsonb;
    IF NEW.observacoes IS NOT NULL
       AND NEW.observacoes <> ''
       AND NEW.observacoes IS DISTINCT FROM OLD.observacoes THEN
      _det := jsonb_build_object('comentario', NEW.observacoes);
    END IF;
    INSERT INTO public.cedente_history (cedente_id, user_id, evento, stage_anterior, stage_novo, detalhes)
    VALUES (NEW.id, auth.uid(), 'mudanca_estagio', OLD.stage, NEW.stage, _det);
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Realtime para histórico
ALTER TABLE public.cedente_history REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cedente_history'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.cedente_history';
  END IF;
END $$;
