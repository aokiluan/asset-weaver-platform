DROP POLICY IF EXISTS "Comercial cria cedentes" ON public.cedentes;
CREATE POLICY "Comercial cria cedentes" ON public.cedentes
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'comercial'::app_role)
  OR is_gestor_geral(auth.uid())
);