
-- Enum status da boleta
DO $$ BEGIN
  CREATE TYPE public.investor_boleta_status AS ENUM (
    'rascunho','aguardando_assinatura','assinada','pagamento_enviado','concluida','cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Catálogo de séries
CREATE TABLE IF NOT EXISTS public.investor_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  indexador text,
  spread numeric,
  prazo_meses integer,
  ativa boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investor_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem séries" ON public.investor_series
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia séries (insert)" ON public.investor_series
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia séries (update)" ON public.investor_series
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia séries (delete)" ON public.investor_series
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_investor_series_updated
  BEFORE UPDATE ON public.investor_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Boletas
CREATE TABLE IF NOT EXISTS public.investor_boletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  series_id uuid REFERENCES public.investor_series(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  valor numeric,
  prazo_meses integer,
  taxa_efetiva numeric,
  status public.investor_boleta_status NOT NULL DEFAULT 'rascunho',
  current_step integer NOT NULL DEFAULT 1,
  dados_investidor jsonb NOT NULL DEFAULT '{}'::jsonb,
  observacoes text,
  contrato_path text,
  contrato_assinado_em timestamptz,
  comprovante_path text,
  pagamento_enviado_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investor_boletas_user ON public.investor_boletas(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_boletas_contact ON public.investor_boletas(contact_id);
CREATE INDEX IF NOT EXISTS idx_investor_boletas_status ON public.investor_boletas(status);

ALTER TABLE public.investor_boletas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê as próprias boletas" ON public.investor_boletas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Usuário cria boletas próprias" ON public.investor_boletas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.investor_contacts c WHERE c.id = contact_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Usuário edita as próprias boletas" ON public.investor_boletas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Usuário remove as próprias boletas" ON public.investor_boletas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_investor_boletas_updated
  BEFORE UPDATE ON public.investor_boletas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico
CREATE TABLE IF NOT EXISTS public.investor_boleta_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boleta_id uuid NOT NULL REFERENCES public.investor_boletas(id) ON DELETE CASCADE,
  user_id uuid,
  evento text NOT NULL,
  status_anterior public.investor_boleta_status,
  status_novo public.investor_boleta_status,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_investor_boleta_history_boleta ON public.investor_boleta_history(boleta_id);
ALTER TABLE public.investor_boleta_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade do histórico segue boleta" ON public.investor_boleta_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.investor_boletas b
    WHERE b.id = boleta_id AND (b.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

-- Trigger de histórico
CREATE OR REPLACE FUNCTION public.log_investor_boleta_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.investor_boleta_history(boleta_id, user_id, evento, status_novo)
    VALUES (NEW.id, NEW.user_id, 'criada', NEW.status);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.investor_boleta_history(boleta_id, user_id, evento, status_anterior, status_novo)
    VALUES (NEW.id, auth.uid(), 'mudanca_status', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investor_boletas_history ON public.investor_boletas;
CREATE TRIGGER trg_investor_boletas_history
  AFTER INSERT OR UPDATE ON public.investor_boletas
  FOR EACH ROW EXECUTE FUNCTION public.log_investor_boleta_change();

-- Storage bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('investor-boletas', 'investor-boletas', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Boletas: usuário vê seus arquivos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'investor-boletas'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "Boletas: usuário envia arquivos próprios" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'investor-boletas'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Boletas: usuário atualiza arquivos próprios" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'investor-boletas'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );
CREATE POLICY "Boletas: usuário remove arquivos próprios" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'investor-boletas'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

-- Seed: 2 séries iniciais inspiradas no Invest Fácil
INSERT INTO public.investor_series (nome, indexador, spread, prazo_meses, ordem)
VALUES
  ('Total Return CDI+1,5% / 12m', 'CDI', 1.5, 12, 1),
  ('Renda Mensal CDI+2,0% / 18m', 'CDI', 2.0, 18, 2)
ON CONFLICT DO NOTHING;
