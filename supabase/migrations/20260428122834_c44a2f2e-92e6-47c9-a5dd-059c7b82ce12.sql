
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'gestor_comercial',
  'comercial',
  'analista_credito',
  'comite',
  'gestor_risco',
  'financeiro',
  'operacional'
);

CREATE TYPE public.lead_tipo AS ENUM ('cedente', 'investidor');

-- =====================================================
-- FUNÇÃO updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- TABELA: profiles
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TABELA: user_roles
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÃO has_role (security definer evita recursão RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor_comercial(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gestor_comercial')
  );
$$;

-- =====================================================
-- TRIGGER: criar perfil ao registrar usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- POLÍTICAS: profiles
-- =====================================================
CREATE POLICY "Usuário vê o próprio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário atualiza o próprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insere perfis"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove perfis"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS: user_roles
-- =====================================================
CREATE POLICY "Usuário vê as próprias funções"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia funções (insert)"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia funções (update)"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia funções (delete)"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TABELA: pipeline_stages
-- =====================================================
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  cor TEXT DEFAULT '#3b6fa0',
  ativo BOOLEAN NOT NULL DEFAULT true,
  is_ganho BOOLEAN NOT NULL DEFAULT false,
  is_perdido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem estágios"
  ON public.pipeline_stages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Gestor gerenciam estágios (insert)"
  ON public.pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Admin/Gestor gerenciam estágios (update)"
  ON public.pipeline_stages FOR UPDATE TO authenticated
  USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Admin/Gestor gerenciam estágios (delete)"
  ON public.pipeline_stages FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor_comercial(auth.uid()));

-- Estágios padrão
INSERT INTO public.pipeline_stages (nome, ordem, cor, is_ganho, is_perdido) VALUES
  ('Novo', 1, '#94a3b8', false, false),
  ('Qualificação', 2, '#3b6fa0', false, false),
  ('Proposta', 3, '#0ea5e9', false, false),
  ('Negociação', 4, '#f59e0b', false, false),
  ('Ganho', 5, '#10b981', true, false),
  ('Perdido', 6, '#ef4444', false, true);

-- =====================================================
-- TABELA: leads
-- =====================================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo lead_tipo NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  empresa TEXT,
  origem TEXT,
  valor_estimado NUMERIC(15,2),
  observacoes TEXT,
  stage_id UUID REFERENCES public.pipeline_stages(id),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_stage ON public.leads(stage_id);
CREATE INDEX idx_leads_tipo ON public.leads(tipo);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Visibilidade: admin/gestor comercial/analista/comitê/risco veem todos; comercial vê só os próprios
CREATE POLICY "Visibilidade de leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor_comercial')
    OR public.has_role(auth.uid(), 'analista_credito')
    OR public.has_role(auth.uid(), 'comite')
    OR public.has_role(auth.uid(), 'gestor_risco')
    OR owner_id = auth.uid()
  );

CREATE POLICY "Comercial cria leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor_comercial')
    OR public.has_role(auth.uid(), 'comercial')
  );

CREATE POLICY "Editar próprios leads ou gestor"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_gestor_comercial(auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Admin/Gestor removem leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.is_admin_or_gestor_comercial(auth.uid()));

-- =====================================================
-- TABELA: lead_interactions
-- =====================================================
CREATE TABLE public.lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_lead ON public.lead_interactions(lead_id);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade de interações segue lead"
  ON public.lead_interactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'gestor_comercial')
          OR public.has_role(auth.uid(), 'analista_credito')
          OR public.has_role(auth.uid(), 'comite')
          OR public.has_role(auth.uid(), 'gestor_risco')
          OR l.owner_id = auth.uid()
        )
    )
  );

CREATE POLICY "Criar interação no próprio lead"
  ON public.lead_interactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
        AND (
          public.is_admin_or_gestor_comercial(auth.uid())
          OR l.owner_id = auth.uid()
        )
    )
  );

CREATE POLICY "Editar a própria interação"
  ON public.lead_interactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Remover a própria interação"
  ON public.lead_interactions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
