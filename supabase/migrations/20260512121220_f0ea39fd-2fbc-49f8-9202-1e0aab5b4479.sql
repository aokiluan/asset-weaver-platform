CREATE TABLE public.investidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL UNIQUE,
  tipo_pessoa text NOT NULL DEFAULT 'pj' CHECK (tipo_pessoa IN ('pf','pj')),
  email text,
  telefone text,
  endereco text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  valor_investido numeric DEFAULT 0,
  perfil text,
  observacoes text,
  status text NOT NULL DEFAULT 'ativo',
  owner_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visibilidade de investidores"
ON public.investidores FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_gestor_geral(auth.uid())
  OR public.has_role(auth.uid(),'financeiro')
  OR public.has_role(auth.uid(),'comercial')
  OR owner_id = auth.uid()
);

CREATE POLICY "Criar investidores"
ON public.investidores FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.is_gestor_geral(auth.uid())
  OR public.has_role(auth.uid(),'financeiro')
);

CREATE POLICY "Editar investidores"
ON public.investidores FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_gestor_geral(auth.uid())
  OR public.has_role(auth.uid(),'financeiro')
);

CREATE POLICY "Remover investidores"
ON public.investidores FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.is_gestor_geral(auth.uid())
);

CREATE TRIGGER tg_investidores_updated_at
BEFORE UPDATE ON public.investidores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();