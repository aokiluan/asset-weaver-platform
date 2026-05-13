CREATE TYPE public.investor_activity_type AS ENUM ('ligacao', 'email', 'reuniao', 'nota', 'tarefa');

CREATE TABLE public.investor_contact_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.investor_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  type public.investor_activity_type NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investor_contact_activities_contact ON public.investor_contact_activities(contact_id, occurred_at DESC);

ALTER TABLE public.investor_contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê as próprias atividades"
  ON public.investor_contact_activities FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.investor_contacts c
    WHERE c.id = investor_contact_activities.contact_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Usuário cria atividades próprias"
  ON public.investor_contact_activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.investor_contacts c
    WHERE c.id = investor_contact_activities.contact_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Usuário edita as próprias atividades"
  ON public.investor_contact_activities FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário remove as próprias atividades"
  ON public.investor_contact_activities FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());