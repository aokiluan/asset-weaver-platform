
-- Novo enum
CREATE TYPE public.app_role_new AS ENUM (
  'admin','comercial','cadastro','credito','comite','formalizacao','financeiro','gestor_geral'
);

-- Drop policies dependentes
DROP POLICY IF EXISTS "Admin gerencia alçadas (delete)" ON public.approval_levels;
DROP POLICY IF EXISTS "Admin gerencia alçadas (insert)" ON public.approval_levels;
DROP POLICY IF EXISTS "Admin gerencia alçadas (update)" ON public.approval_levels;
DROP POLICY IF EXISTS "Autenticados veem alçadas" ON public.approval_levels;
DROP POLICY IF EXISTS "Visibilidade do histórico segue cedente" ON public.cedente_history;
DROP POLICY IF EXISTS "Editar representantes (insert)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Editar representantes (update)" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Remover representantes" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Visibilidade de representantes segue cedente" ON public.cedente_representantes;
DROP POLICY IF EXISTS "Comercial cria relatório" ON public.cedente_visit_reports;
DROP POLICY IF EXISTS "Editar próprio relatório ou gestor" ON public.cedente_visit_reports;
DROP POLICY IF EXISTS "Remover relatório admin/gestor" ON public.cedente_visit_reports;
DROP POLICY IF EXISTS "Visibilidade do relatório segue cedente" ON public.cedente_visit_reports;
DROP POLICY IF EXISTS "Admin/Gestor removem cedentes" ON public.cedentes;
DROP POLICY IF EXISTS "Comercial cria cedentes" ON public.cedentes;
DROP POLICY IF EXISTS "Editar próprios cedentes ou gestor" ON public.cedentes;
DROP POLICY IF EXISTS "Visibilidade de cedentes" ON public.cedentes;
DROP POLICY IF EXISTS "Admin remove sessão" ON public.committee_sessions;
DROP POLICY IF EXISTS "Comitê/Gestores abrem sessão" ON public.committee_sessions;
DROP POLICY IF EXISTS "Comitê/Gestores atualizam sessão" ON public.committee_sessions;
DROP POLICY IF EXISTS "Ver sessão segue proposta" ON public.committee_sessions;
DROP POLICY IF EXISTS "Comitê vota" ON public.committee_votes;
DROP POLICY IF EXISTS "Membro edita o próprio voto" ON public.committee_votes;
DROP POLICY IF EXISTS "Membro remove o próprio voto" ON public.committee_votes;
DROP POLICY IF EXISTS "Visibilidade de votos segue proposta" ON public.committee_votes;
DROP POLICY IF EXISTS "Análise/Risco criam parecer" ON public.credit_opinions;
DROP POLICY IF EXISTS "Autor edita o próprio parecer" ON public.credit_opinions;
DROP POLICY IF EXISTS "Autor remove o próprio parecer" ON public.credit_opinions;
DROP POLICY IF EXISTS "Visibilidade de pareceres segue proposta" ON public.credit_opinions;
DROP POLICY IF EXISTS "Admin/Gestor removem propostas" ON public.credit_proposals;
DROP POLICY IF EXISTS "Atualizar propostas" ON public.credit_proposals;
DROP POLICY IF EXISTS "Comercial cria propostas" ON public.credit_proposals;
DROP POLICY IF EXISTS "Visibilidade de propostas" ON public.credit_proposals;
DROP POLICY IF EXISTS "Admin remove relatório" ON public.credit_reports;
DROP POLICY IF EXISTS "Análise/Risco atualizam relatório" ON public.credit_reports;
DROP POLICY IF EXISTS "Análise/Risco criam relatório" ON public.credit_reports;
DROP POLICY IF EXISTS "Visibilidade do relatório segue cedente ou proposta" ON public.credit_reports;
DROP POLICY IF EXISTS "Admin gerencia widgets (delete)" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Admin gerencia widgets (insert)" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Admin gerencia widgets (update)" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Autenticados veem widgets" ON public.dashboard_widgets;
DROP POLICY IF EXISTS "Admin gerencia categorias (delete)" ON public.documento_categorias;
DROP POLICY IF EXISTS "Admin gerencia categorias (insert)" ON public.documento_categorias;
DROP POLICY IF EXISTS "Admin gerencia categorias (update)" ON public.documento_categorias;
DROP POLICY IF EXISTS "Autenticados veem categorias de documento" ON public.documento_categorias;
DROP POLICY IF EXISTS "Edição/revisão de documentos" ON public.documentos;
DROP POLICY IF EXISTS "Remoção de documentos" ON public.documentos;
DROP POLICY IF EXISTS "Upload de documentos por quem vê o cedente" ON public.documentos;
DROP POLICY IF EXISTS "Visibilidade de documentos segue cedente" ON public.documentos;
DROP POLICY IF EXISTS "Criar interação no próprio lead" ON public.lead_interactions;
DROP POLICY IF EXISTS "Editar a própria interação" ON public.lead_interactions;
DROP POLICY IF EXISTS "Remover a própria interação" ON public.lead_interactions;
DROP POLICY IF EXISTS "Visibilidade de interações segue lead" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admin/Gestor removem leads" ON public.leads;
DROP POLICY IF EXISTS "Comercial cria leads" ON public.leads;
DROP POLICY IF EXISTS "Editar próprios leads ou gestor" ON public.leads;
DROP POLICY IF EXISTS "Visibilidade de leads" ON public.leads;
DROP POLICY IF EXISTS "Admin/Gestor gerenciam estágios (delete)" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admin/Gestor gerenciam estágios (insert)" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admin/Gestor gerenciam estágios (update)" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Autenticados veem estágios" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Admin insere perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admin remove perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Visibilidade do histórico segue proposta" ON public.proposal_history;
DROP POLICY IF EXISTS "Admin gerencia datasets (delete)" ON public.report_datasets;
DROP POLICY IF EXISTS "Admin gerencia datasets (insert)" ON public.report_datasets;
DROP POLICY IF EXISTS "Admin gerencia datasets (update)" ON public.report_datasets;
DROP POLICY IF EXISTS "Autenticados veem datasets" ON public.report_datasets;
DROP POLICY IF EXISTS "Admin gerencia linhas (delete)" ON public.report_rows;
DROP POLICY IF EXISTS "Admin gerencia linhas (insert)" ON public.report_rows;
DROP POLICY IF EXISTS "Autenticados veem linhas" ON public.report_rows;
DROP POLICY IF EXISTS "Admin gerencia uploads (delete)" ON public.report_uploads;
DROP POLICY IF EXISTS "Admin gerencia uploads (insert)" ON public.report_uploads;
DROP POLICY IF EXISTS "Admin gerencia uploads (update)" ON public.report_uploads;
DROP POLICY IF EXISTS "Autenticados veem uploads" ON public.report_uploads;
DROP POLICY IF EXISTS "Admin gerencia funções (delete)" ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia funções (insert)" ON public.user_roles;
DROP POLICY IF EXISTS "Admin gerencia funções (update)" ON public.user_roles;
DROP POLICY IF EXISTS "Usuário vê as próprias funções" ON public.user_roles;
DROP POLICY IF EXISTS "Admin lê arquivos de relatório" ON storage.objects;
DROP POLICY IF EXISTS "Admin envia arquivos de relatório" ON storage.objects;
DROP POLICY IF EXISTS "Admin atualiza arquivos de relatório" ON storage.objects;
DROP POLICY IF EXISTS "Admin remove arquivos de relatório" ON storage.objects;
DROP POLICY IF EXISTS "Crédito faz upload de anexos do relatório" ON storage.objects;
DROP POLICY IF EXISTS "Crédito remove anexos do relatório" ON storage.objects;
DROP POLICY IF EXISTS "Visibilidade de anexos do relatório segue cedente" ON storage.objects;
DROP POLICY IF EXISTS "Cedente docs - delete admin/gestor" ON storage.objects;
DROP POLICY IF EXISTS "Cedente docs - insert por acesso ao cedente" ON storage.objects;
DROP POLICY IF EXISTS "Cedente docs - select por acesso ao cedente" ON storage.objects;
DROP POLICY IF EXISTS "Cedente docs - update admin/gestor" ON storage.objects;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin_or_gestor_comercial(uuid);
DROP FUNCTION IF EXISTS public.can_view_cedente(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_proposal(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_review_documento(uuid);
DROP FUNCTION IF EXISTS public.can_decide_proposal(uuid);
DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_find_user_by_email(text);

-- Mapear papéis em user_roles
ALTER TABLE public.user_roles ADD COLUMN _new_role text;
UPDATE public.user_roles SET _new_role = CASE role::text
  WHEN 'admin' THEN 'admin'
  WHEN 'comercial' THEN 'comercial'
  WHEN 'gestor_comercial' THEN 'comercial'
  WHEN 'analista_cadastro' THEN 'cadastro'
  WHEN 'analista_credito' THEN 'credito'
  WHEN 'gestor_credito' THEN 'credito'
  WHEN 'gestor_risco' THEN 'credito'
  WHEN 'comite' THEN 'comite'
  WHEN 'financeiro' THEN 'financeiro'
  WHEN 'gestor_financeiro' THEN 'financeiro'
  WHEN 'relacao_investidor' THEN 'financeiro'
  WHEN 'gestor_relacao_investidor' THEN 'financeiro'
  WHEN 'operacional' THEN 'financeiro'
END;

INSERT INTO public.user_roles (user_id, role, _new_role)
SELECT DISTINCT ur.user_id, ur.role, 'gestor_geral'
FROM public.user_roles ur
WHERE ur.role::text IN ('gestor_comercial','gestor_credito','gestor_risco','gestor_financeiro','gestor_relacao_investidor');

-- Mapear author_role em credit_opinions
ALTER TABLE public.credit_opinions ADD COLUMN _new_author_role text;
UPDATE public.credit_opinions SET _new_author_role = CASE author_role::text
  WHEN 'admin' THEN 'admin'
  WHEN 'comercial' THEN 'comercial'
  WHEN 'gestor_comercial' THEN 'comercial'
  WHEN 'analista_cadastro' THEN 'cadastro'
  WHEN 'analista_credito' THEN 'credito'
  WHEN 'gestor_credito' THEN 'credito'
  WHEN 'gestor_risco' THEN 'credito'
  WHEN 'comite' THEN 'comite'
  WHEN 'financeiro' THEN 'financeiro'
  WHEN 'gestor_financeiro' THEN 'financeiro'
  WHEN 'relacao_investidor' THEN 'financeiro'
  WHEN 'gestor_relacao_investidor' THEN 'financeiro'
  WHEN 'operacional' THEN 'financeiro'
END;

-- Trocar colunas
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.user_roles ADD COLUMN role public.app_role_new;
UPDATE public.user_roles SET role = _new_role::public.app_role_new;
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.user_roles DROP COLUMN _new_role;

DELETE FROM public.user_roles a USING public.user_roles b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role = b.role;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE public.credit_opinions DROP COLUMN author_role;
ALTER TABLE public.credit_opinions ADD COLUMN author_role public.app_role_new;
UPDATE public.credit_opinions SET author_role = _new_author_role::public.app_role_new;
ALTER TABLE public.credit_opinions ALTER COLUMN author_role SET NOT NULL;
ALTER TABLE public.credit_opinions DROP COLUMN _new_author_role;

-- Drop e renomeia enum
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Tabela teams + team_id em profiles
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  papel_principal public.app_role NOT NULL,
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Funções
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_geral(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'gestor_geral');
$$;

CREATE OR REPLACE FUNCTION public.is_team_manager_of(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.teams t ON t.id = p.team_id
    WHERE p.id = _target AND t.gestor_id = _viewer AND t.ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_gestor_comercial(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin')
      OR (public.has_role(_user_id, 'comercial') AND public.has_role(_user_id, 'gestor_geral'));
$$;

CREATE OR REPLACE FUNCTION public.can_view_cedente(_user_id uuid, _owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_gestor_geral(_user_id)
    OR public.has_role(_user_id,'cadastro') OR public.has_role(_user_id,'credito')
    OR public.has_role(_user_id,'comite') OR public.has_role(_user_id,'formalizacao')
    OR public.has_role(_user_id,'financeiro') OR _owner_id = _user_id
    OR (_owner_id IS NOT NULL AND public.is_team_manager_of(_user_id, _owner_id));
$$;

CREATE OR REPLACE FUNCTION public.can_view_proposal(_user_id uuid, _cedente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_gestor_geral(_user_id)
    OR public.has_role(_user_id,'cadastro') OR public.has_role(_user_id,'credito')
    OR public.has_role(_user_id,'comite') OR public.has_role(_user_id,'formalizacao')
    OR public.has_role(_user_id,'financeiro')
    OR EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = _cedente_id
               AND (c.owner_id = _user_id OR public.is_team_manager_of(_user_id, c.owner_id)));
$$;

CREATE OR REPLACE FUNCTION public.can_review_documento(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'cadastro')
    OR public.has_role(_user_id,'credito') OR public.has_role(_user_id,'comite')
    OR public.is_gestor_geral(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_decide_proposal(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'credito')
    OR public.has_role(_user_id,'comite') OR public.is_gestor_geral(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE lower(email) = lower(_email)
    AND public.has_role(auth.uid(), 'admin') LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, nome text, email text, ativo boolean, cargo text, team_id uuid, roles public.app_role[], created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome, p.email, p.ativo, p.cargo, p.team_id,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::public.app_role[]) AS roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY p.id, p.nome, p.email, p.ativo, p.cargo, p.team_id, p.created_at
  ORDER BY p.nome;
$$;

-- Recriar policies
CREATE POLICY "Autenticados veem alçadas" ON public.approval_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia alçadas (insert)" ON public.approval_levels FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia alçadas (update)" ON public.approval_levels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia alçadas (delete)" ON public.approval_levels FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de cedentes" ON public.cedentes FOR SELECT TO authenticated USING (public.can_view_cedente(auth.uid(), owner_id));
CREATE POLICY "Comercial cria cedentes" ON public.cedentes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Editar cedentes" ON public.cedentes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
  OR owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), owner_id)
  OR public.has_role(auth.uid(),'cadastro') OR public.has_role(auth.uid(),'credito')
  OR public.has_role(auth.uid(),'comite') OR public.has_role(auth.uid(),'formalizacao')
);
CREATE POLICY "Admin/Gestor removem cedentes" ON public.cedentes FOR DELETE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Visibilidade do histórico segue cedente" ON public.cedente_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_history.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
);

CREATE POLICY "Visibilidade de representantes segue cedente" ON public.cedente_representantes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_representantes.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Editar representantes (insert)" ON public.cedente_representantes FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_representantes.cedente_id
    AND (public.is_admin_or_gestor_comercial(auth.uid()) OR public.has_role(auth.uid(),'cadastro')
         OR c.owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), c.owner_id)))
);
CREATE POLICY "Editar representantes (update)" ON public.cedente_representantes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_representantes.cedente_id
    AND (public.is_admin_or_gestor_comercial(auth.uid()) OR public.has_role(auth.uid(),'cadastro')
         OR c.owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), c.owner_id)))
);
CREATE POLICY "Remover representantes" ON public.cedente_representantes FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_representantes.cedente_id
    AND (public.is_admin_or_gestor_comercial(auth.uid()) OR public.has_role(auth.uid(),'cadastro')
         OR c.owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), c.owner_id)))
);

CREATE POLICY "Visibilidade do relatório segue cedente" ON public.cedente_visit_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_visit_reports.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Comercial cria relatório" ON public.cedente_visit_reports FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = cedente_visit_reports.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
  AND (public.has_role(auth.uid(),'comercial') OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "Editar próprio relatório ou gestor" ON public.cedente_visit_reports FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.is_admin_or_gestor_comercial(auth.uid())
);
CREATE POLICY "Remover relatório admin/gestor" ON public.cedente_visit_reports FOR DELETE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Ver sessão segue proposta" ON public.committee_sessions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.credit_proposals p WHERE p.id = committee_sessions.proposal_id AND public.can_view_proposal(auth.uid(), p.cedente_id))
);
CREATE POLICY "Comitê/Gestores abrem sessão" ON public.committee_sessions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')
  OR public.has_role(auth.uid(),'credito') OR public.is_gestor_geral(auth.uid())
);
CREATE POLICY "Comitê/Gestores atualizam sessão" ON public.committee_sessions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')
  OR public.has_role(auth.uid(),'credito') OR public.is_gestor_geral(auth.uid())
);
CREATE POLICY "Admin remove sessão" ON public.committee_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de votos segue proposta" ON public.committee_votes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.credit_proposals p WHERE p.id = committee_votes.proposal_id AND public.can_view_proposal(auth.uid(), p.cedente_id))
);
CREATE POLICY "Comitê vota" ON public.committee_votes FOR INSERT TO authenticated WITH CHECK (
  voter_id = auth.uid() AND (public.has_role(auth.uid(),'comite') OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "Membro edita o próprio voto" ON public.committee_votes FOR UPDATE TO authenticated USING (voter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Membro remove o próprio voto" ON public.committee_votes FOR DELETE TO authenticated USING (voter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de pareceres segue proposta" ON public.credit_opinions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.credit_proposals p WHERE p.id = credit_opinions.proposal_id AND public.can_view_proposal(auth.uid(), p.cedente_id))
);
CREATE POLICY "Crédito cria parecer" ON public.credit_opinions FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND (public.has_role(auth.uid(),'credito') OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "Autor edita o próprio parecer" ON public.credit_opinions FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Autor remove o próprio parecer" ON public.credit_opinions FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de propostas" ON public.credit_proposals FOR SELECT TO authenticated USING (public.can_view_proposal(auth.uid(), cedente_id));
CREATE POLICY "Comercial cria propostas" ON public.credit_proposals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comercial'));
CREATE POLICY "Atualizar propostas" ON public.credit_proposals FOR UPDATE TO authenticated USING (
  public.is_admin_or_gestor_comercial(auth.uid()) OR public.can_decide_proposal(auth.uid())
  OR (created_by = auth.uid() AND stage = 'rascunho'::proposal_stage)
);
CREATE POLICY "Admin/Gestor removem propostas" ON public.credit_proposals FOR DELETE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Visibilidade do relatório segue cedente ou proposta" ON public.credit_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = credit_reports.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
  OR (proposal_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.credit_proposals p WHERE p.id = credit_reports.proposal_id AND public.can_view_proposal(auth.uid(), p.cedente_id)))
);
CREATE POLICY "Crédito cria relatório" ON public.credit_reports FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'credito') OR public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
);
CREATE POLICY "Crédito atualiza relatório" ON public.credit_reports FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'credito') OR public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
);
CREATE POLICY "Admin remove relatório" ON public.credit_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autenticados veem widgets" ON public.dashboard_widgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia widgets (insert)" ON public.dashboard_widgets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia widgets (update)" ON public.dashboard_widgets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia widgets (delete)" ON public.dashboard_widgets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autenticados veem categorias de documento" ON public.documento_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia categorias (insert)" ON public.documento_categorias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia categorias (update)" ON public.documento_categorias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia categorias (delete)" ON public.documento_categorias FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de documentos segue cedente" ON public.documentos FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = documentos.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Upload de documentos por quem vê o cedente" ON public.documentos FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id = documentos.cedente_id AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Edição/revisão de documentos" ON public.documentos FOR UPDATE TO authenticated USING (
  public.can_review_documento(auth.uid()) OR uploaded_by = auth.uid()
);
CREATE POLICY "Remoção de documentos" ON public.documentos FOR DELETE TO authenticated USING (
  public.is_admin_or_gestor_comercial(auth.uid()) OR uploaded_by = auth.uid()
);

CREATE POLICY "Visibilidade de interações segue lead" ON public.lead_interactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_interactions.lead_id
    AND (public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
         OR public.has_role(auth.uid(),'credito') OR public.has_role(auth.uid(),'comite')
         OR l.owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), l.owner_id)))
);
CREATE POLICY "Criar interação no próprio lead" ON public.lead_interactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_interactions.lead_id
    AND (public.is_admin_or_gestor_comercial(auth.uid()) OR l.owner_id = auth.uid()))
);
CREATE POLICY "Editar a própria interação" ON public.lead_interactions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Remover a própria interação" ON public.lead_interactions FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade de leads" ON public.leads FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
  OR public.has_role(auth.uid(),'credito') OR public.has_role(auth.uid(),'comite')
  OR owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), owner_id)
);
CREATE POLICY "Comercial cria leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comercial')
);
CREATE POLICY "Editar leads" ON public.leads FOR UPDATE TO authenticated USING (
  public.is_admin_or_gestor_comercial(auth.uid()) OR owner_id = auth.uid() OR public.is_team_manager_of(auth.uid(), owner_id)
);
CREATE POLICY "Admin/Gestor removem leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Autenticados veem estágios" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/Gestor gerenciam estágios (insert)" ON public.pipeline_stages FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor_comercial(auth.uid()));
CREATE POLICY "Admin/Gestor gerenciam estágios (update)" ON public.pipeline_stages FOR UPDATE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));
CREATE POLICY "Admin/Gestor gerenciam estágios (delete)" ON public.pipeline_stages FOR DELETE TO authenticated USING (public.is_admin_or_gestor_comercial(auth.uid()));

CREATE POLICY "Usuário vê o próprio perfil" ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.is_gestor_geral(auth.uid())
);
CREATE POLICY "Usuário atualiza o próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (
  auth.uid() = id OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin insere perfis" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin remove perfis" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visibilidade do histórico segue proposta" ON public.proposal_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.credit_proposals p WHERE p.id = proposal_history.proposal_id AND public.can_view_proposal(auth.uid(), p.cedente_id))
);

CREATE POLICY "Autenticados veem datasets" ON public.report_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia datasets (insert)" ON public.report_datasets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia datasets (update)" ON public.report_datasets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia datasets (delete)" ON public.report_datasets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autenticados veem linhas" ON public.report_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia linhas (insert)" ON public.report_rows FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia linhas (delete)" ON public.report_rows FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autenticados veem uploads" ON public.report_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia uploads (insert)" ON public.report_uploads FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia uploads (update)" ON public.report_uploads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia uploads (delete)" ON public.report_uploads FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Usuário vê as próprias funções" ON public.user_roles FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin gerencia funções (insert)" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia funções (update)" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia funções (delete)" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Autenticados veem equipes" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia equipes (insert)" ON public.teams FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia equipes (update)" ON public.teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia equipes (delete)" ON public.teams FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admin lê arquivos de relatório" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'report-files' AND public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin envia arquivos de relatório" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'report-files' AND public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin atualiza arquivos de relatório" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'report-files' AND public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admin remove arquivos de relatório" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'report-files' AND public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Crédito faz upload de anexos do relatório" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'report-files' AND (storage.foldername(name))[1] = 'cedentes'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'credito') OR public.is_gestor_geral(auth.uid()))
);
CREATE POLICY "Crédito remove anexos do relatório" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'report-files' AND (storage.foldername(name))[1] = 'cedentes'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'credito') OR public.is_gestor_geral(auth.uid()))
);
CREATE POLICY "Visibilidade de anexos do relatório segue cedente" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'report-files' AND (storage.foldername(name))[1] = 'cedentes'
  AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id::text = (storage.foldername(name))[2] AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Cedente docs - select por acesso ao cedente" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'cedente-docs' AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id::text = (storage.foldername(name))[1] AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Cedente docs - insert por acesso ao cedente" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'cedente-docs' AND EXISTS (SELECT 1 FROM public.cedentes c WHERE c.id::text = (storage.foldername(name))[1] AND public.can_view_cedente(auth.uid(), c.owner_id))
);
CREATE POLICY "Cedente docs - update admin/gestor" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'cedente-docs' AND public.is_admin_or_gestor_comercial(auth.uid())
);
CREATE POLICY "Cedente docs - delete admin/gestor" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'cedente-docs' AND public.is_admin_or_gestor_comercial(auth.uid())
);
