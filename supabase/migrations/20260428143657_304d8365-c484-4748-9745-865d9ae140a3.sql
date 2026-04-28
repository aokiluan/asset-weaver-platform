-- ============ Datasets ============
CREATE TABLE public.report_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem datasets"
  ON public.report_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia datasets (insert)"
  ON public.report_datasets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia datasets (update)"
  ON public.report_datasets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia datasets (delete)"
  ON public.report_datasets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_report_datasets_updated
  BEFORE UPDATE ON public.report_datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Uploads ============
CREATE TYPE public.report_upload_status AS ENUM ('pendente','processando','processado','erro');

CREATE TABLE public.report_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.report_datasets(id) ON DELETE CASCADE,
  arquivo_nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  periodo_referencia DATE NOT NULL,
  linhas_total INTEGER NOT NULL DEFAULT 0,
  status public.report_upload_status NOT NULL DEFAULT 'pendente',
  erro_msg TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_uploads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_report_uploads_dataset ON public.report_uploads(dataset_id, periodo_referencia DESC);

CREATE POLICY "Autenticados veem uploads"
  ON public.report_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia uploads (insert)"
  ON public.report_uploads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia uploads (update)"
  ON public.report_uploads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia uploads (delete)"
  ON public.report_uploads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_report_uploads_updated
  BEFORE UPDATE ON public.report_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Rows ============
CREATE TABLE public.report_rows (
  id BIGSERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.report_uploads(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.report_datasets(id) ON DELETE CASCADE,
  periodo_referencia DATE NOT NULL,
  row_index INTEGER NOT NULL,
  dados JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_rows ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_report_rows_dataset_periodo ON public.report_rows(dataset_id, periodo_referencia DESC);
CREATE INDEX idx_report_rows_upload ON public.report_rows(upload_id);

CREATE POLICY "Autenticados veem linhas"
  ON public.report_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia linhas (insert)"
  ON public.report_rows FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia linhas (delete)"
  ON public.report_rows FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ Widgets ============
CREATE TYPE public.dashboard_widget_tipo AS ENUM ('kpi','bar','line','pie','table');

CREATE TABLE public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  dataset_id UUID NOT NULL REFERENCES public.report_datasets(id) ON DELETE CASCADE,
  tipo public.dashboard_widget_tipo NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  largura INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem widgets"
  ON public.dashboard_widgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia widgets (insert)"
  ON public.dashboard_widgets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia widgets (update)"
  ON public.dashboard_widgets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia widgets (delete)"
  ON public.dashboard_widgets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dashboard_widgets_updated
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-files','report-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin lê arquivos de relatório"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin envia arquivos de relatório"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin atualiza arquivos de relatório"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin remove arquivos de relatório"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-files' AND public.has_role(auth.uid(), 'admin'));