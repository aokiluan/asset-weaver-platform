-- Tabela de contatos de prospecção de investidores
CREATE TABLE public.investor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('assessoria','investidor_pf','investidor_pj','institucional')),
  stage text NOT NULL DEFAULT 'prospeccao' CHECK (stage IN ('prospeccao','apresentacao','due_diligence','proposta','fechamento','ativo')),
  ticket numeric,
  contact_name text,
  phone text,
  last_contact_date date,
  next_action text,
  notes text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê os próprios contatos"
  ON public.investor_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuário cria contatos próprios"
  ON public.investor_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário edita os próprios contatos"
  ON public.investor_contacts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário remove os próprios contatos"
  ON public.investor_contacts FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_investor_contacts_updated_at
  BEFORE UPDATE ON public.investor_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_investor_contacts_user_id ON public.investor_contacts(user_id);
CREATE INDEX idx_investor_contacts_stage ON public.investor_contacts(stage);