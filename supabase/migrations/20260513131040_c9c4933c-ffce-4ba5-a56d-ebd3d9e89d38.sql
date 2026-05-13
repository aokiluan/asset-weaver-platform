
-- 1. permission_profiles
CREATE TABLE public.permission_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem perfis" ON public.permission_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin cria perfis" ON public.permission_profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin atualiza perfis" ON public.permission_profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin remove perfis nao sistema" ON public.permission_profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND is_system = false);

CREATE TRIGGER trg_permission_profiles_updated_at
  BEFORE UPDATE ON public.permission_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. profile_role_bindings
CREATE TABLE public.profile_role_bindings (
  profile_id uuid NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  app_role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, app_role)
);

ALTER TABLE public.profile_role_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem vinculos" ON public.profile_role_bindings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia vinculos (insert)" ON public.profile_role_bindings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia vinculos (delete)" ON public.profile_role_bindings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3. stage_permissions
CREATE TABLE public.stage_permissions (
  profile_id uuid NOT NULL REFERENCES public.permission_profiles(id) ON DELETE CASCADE,
  stage public.cedente_stage NOT NULL,
  can_send boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, stage)
);

ALTER TABLE public.stage_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem matriz" ON public.stage_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insere matriz" ON public.stage_permissions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin atualiza matriz" ON public.stage_permissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin remove matriz" ON public.stage_permissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_stage_permissions_updated_at
  BEFORE UPDATE ON public.stage_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed perfis base + bindings + matrix
WITH base(nome, descricao, app_role, ordem) AS (
  VALUES
    ('Administrador',  'Acesso total ao sistema',                           'admin'::public.app_role,        10),
    ('Gestor geral',   'Visão executiva e movimenta toda a esteira',        'gestor_geral'::public.app_role, 20),
    ('Comercial',      'Origina cedentes e envia para cadastro',            'comercial'::public.app_role,    30),
    ('Cadastro',       'Valida documentos e libera para análise',           'cadastro'::public.app_role,     40),
    ('Crédito',        'Monta o parecer de crédito',                        'credito'::public.app_role,      50),
    ('Comitê',         'Vota e delibera sobre as propostas',                'comite'::public.app_role,       60),
    ('Formalização',   'Gera minuta e coleta assinaturas',                  'formalizacao'::public.app_role, 70),
    ('Financeiro',     'Acompanha cedentes em operação',                    'financeiro'::public.app_role,   80)
),
inserted_profiles AS (
  INSERT INTO public.permission_profiles (nome, descricao, is_system, ordem)
  SELECT b.nome, b.descricao, true, b.ordem FROM base b
  RETURNING id, nome
)
INSERT INTO public.profile_role_bindings (profile_id, app_role)
SELECT ip.id, b.app_role
FROM inserted_profiles ip
JOIN base b ON b.nome = ip.nome;

-- Matriz inicial (replica STAGE_PERMISSIONS)
WITH matrix(role_name, stage, can_send) AS (
  VALUES
    -- novo
    ('admin','novo',true),('gestor_geral','novo',true),('comercial','novo',true),
    -- cadastro
    ('admin','cadastro',true),('gestor_geral','cadastro',true),('cadastro','cadastro',true),
    -- analise
    ('admin','analise',true),('gestor_geral','analise',true),('credito','analise',true),
    -- comite
    ('admin','comite',true),('gestor_geral','comite',true),('comite','comite',true),('credito','comite',true),
    -- formalizacao
    ('admin','formalizacao',true),('gestor_geral','formalizacao',true),('formalizacao','formalizacao',true)
),
all_cells AS (
  SELECT pp.id AS profile_id,
         s.stage::public.cedente_stage,
         COALESCE(m.can_send, false) AS can_send
  FROM public.permission_profiles pp
  CROSS JOIN (VALUES ('novo'),('cadastro'),('analise'),('comite'),('formalizacao'),('ativo'),('inativo')) AS s(stage)
  LEFT JOIN public.profile_role_bindings prb ON prb.profile_id = pp.id
  LEFT JOIN matrix m ON m.role_name = prb.app_role::text AND m.stage = s.stage
)
INSERT INTO public.stage_permissions (profile_id, stage, can_send)
SELECT profile_id, stage, bool_or(can_send)
FROM all_cells
GROUP BY profile_id, stage;

-- 5. RPC helper
CREATE OR REPLACE FUNCTION public.list_stage_permissions()
RETURNS TABLE (
  profile_id uuid,
  profile_nome text,
  profile_descricao text,
  profile_ativo boolean,
  profile_is_system boolean,
  profile_ordem integer,
  app_roles public.app_role[],
  stage public.cedente_stage,
  can_send boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.id,
    pp.nome,
    pp.descricao,
    pp.ativo,
    pp.is_system,
    pp.ordem,
    COALESCE((SELECT array_agg(prb.app_role ORDER BY prb.app_role) FROM public.profile_role_bindings prb WHERE prb.profile_id = pp.id), ARRAY[]::public.app_role[]),
    sp.stage,
    sp.can_send
  FROM public.permission_profiles pp
  LEFT JOIN public.stage_permissions sp ON sp.profile_id = pp.id
  ORDER BY pp.ordem, pp.nome, sp.stage;
$$;
