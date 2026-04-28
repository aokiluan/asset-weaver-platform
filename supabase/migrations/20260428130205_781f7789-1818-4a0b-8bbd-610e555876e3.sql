
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  ativo BOOLEAN,
  cargo TEXT,
  roles app_role[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id, p.nome, p.email, p.ativo, p.cargo,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::app_role[]) AS roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE public.has_role(auth.uid(), 'admin')
  GROUP BY p.id, p.nome, p.email, p.ativo, p.cargo, p.created_at
  ORDER BY p.nome;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE lower(email) = lower(_email)
    AND public.has_role(auth.uid(), 'admin')
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_find_user_by_email(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(TEXT) TO authenticated;
