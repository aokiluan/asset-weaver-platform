CREATE TABLE public.role_module_permissions (
  role        text NOT NULL,
  module_key  text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES public.profiles(id),
  PRIMARY KEY (role, module_key)
);

ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura autenticada"
  ON public.role_module_permissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Escrita somente admin"
  ON public.role_module_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_role_module_permissions_updated_at
  BEFORE UPDATE ON public.role_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_module_permissions (role, module_key, enabled)
SELECT r.role, m.module_key, true
FROM
  (VALUES
    ('admin'), ('gestor_geral'), ('comercial'), ('cadastro'),
    ('credito'), ('comite'), ('formalizacao'), ('financeiro')
  ) AS r(role),
  (VALUES
    ('gestao'), ('operacao'), ('diretorio'), ('config'), ('financeiro_mod'), ('bi')
  ) AS m(module_key)
ON CONFLICT DO NOTHING;