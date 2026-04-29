-- 1. Renomeia a tabela
ALTER TABLE public.cedente_socios RENAME TO cedente_representantes;

-- 2. Renomeia o índice
ALTER INDEX IF EXISTS idx_cedente_socios_cedente RENAME TO idx_cedente_representantes_cedente;

-- 3. Renomeia o trigger
ALTER TRIGGER trg_cedente_socios_updated ON public.cedente_representantes
  RENAME TO trg_cedente_representantes_updated;

-- 4. Renomeia as policies (drop + create com novos nomes mantendo a mesma lógica)
DROP POLICY IF EXISTS "Visibilidade de sócios segue cedente" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Editar sócios (insert)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Editar sócios (update)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Remover sócios" ON public.cedente_representantes;

CREATE POLICY "Visibilidade de representantes segue cedente"
  ON public.cedente_representantes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND public.can_view_cedente(auth.uid(), c.owner_id)
  ));

CREATE POLICY "Editar representantes (insert)"
  ON public.cedente_representantes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND (public.is_admin_or_gestor_comercial(auth.uid())
           OR public.has_role(auth.uid(), 'analista_cadastro'::app_role)
           OR c.owner_id = auth.uid())
  ));

CREATE POLICY "Editar representantes (update)"
  ON public.cedente_representantes FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND (public.is_admin_or_gestor_comercial(auth.uid())
           OR public.has_role(auth.uid(), 'analista_cadastro'::app_role)
           OR c.owner_id = auth.uid())
  ));

CREATE POLICY "Remover representantes"
  ON public.cedente_representantes FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cedentes c
    WHERE c.id = cedente_representantes.cedente_id
      AND (public.is_admin_or_gestor_comercial(auth.uid())
           OR public.has_role(auth.uid(), 'analista_cadastro'::app_role)
           OR c.owner_id = auth.uid())
  ));

-- 5. Novos campos
ALTER TABLE public.cedente_representantes
  ADD COLUMN IF NOT EXISTS qualificacao text,
  ADD COLUMN IF NOT EXISTS participacao_capital numeric,
  ADD COLUMN IF NOT EXISTS fonte text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sincronizado_em timestamp with time zone;

ALTER TABLE public.cedentes
  ADD COLUMN IF NOT EXISTS representantes_sincronizado_em timestamp with time zone;