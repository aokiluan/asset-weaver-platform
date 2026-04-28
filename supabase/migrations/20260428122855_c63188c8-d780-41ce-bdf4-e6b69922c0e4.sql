
-- Revoga execução pública e libera apenas para authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_gestor_comercial(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_gestor_comercial(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
