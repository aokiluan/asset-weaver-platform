ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_boletas;
ALTER TABLE public.investor_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.investor_boletas REPLICA IDENTITY FULL;