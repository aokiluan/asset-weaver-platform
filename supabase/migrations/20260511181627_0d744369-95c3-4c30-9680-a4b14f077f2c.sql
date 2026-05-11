DROP POLICY IF EXISTS "Editar cedentes" ON public.cedentes;

CREATE POLICY "Editar cedentes"
ON public.cedentes
FOR UPDATE
TO authenticated
USING (public.can_edit_cedente(auth.uid(), stage, owner_id))
WITH CHECK (
  public.can_edit_cedente(
    auth.uid(),
    (SELECT c.stage FROM public.cedentes c WHERE c.id = cedentes.id),
    (SELECT c.owner_id FROM public.cedentes c WHERE c.id = cedentes.id)
  )
);