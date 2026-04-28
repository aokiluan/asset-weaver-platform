
REVOKE EXECUTE ON FUNCTION public.can_view_cedente(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_review_documento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_cedente(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_documento(uuid) TO authenticated;
