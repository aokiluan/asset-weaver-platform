import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

interface SchemaCol {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Não autenticado' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verifica usuário e role admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Sessão inválida' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Apenas admin' }, 403);

    const body = await req.json().catch(() => ({}));
    const uploadId: string | undefined = body.upload_id;
    if (!uploadId) return json({ error: 'upload_id obrigatório' }, 400);

    // Busca upload + dataset
    const { data: upload, error: upErr } = await admin
      .from('report_uploads')
      .select('id, dataset_id, storage_path, periodo_referencia, arquivo_nome')
      .eq('id', uploadId)
      .single();
    if (upErr || !upload) return json({ error: 'Upload não encontrado' }, 404);

    const { data: dataset, error: dsErr } = await admin
      .from('report_datasets')
      .select('id, nome, schema')
      .eq('id', upload.dataset_id)
      .single();
    if (dsErr || !dataset) return json({ error: 'Dataset não encontrado' }, 404);

    await admin.from('report_uploads').update({ status: 'processando', erro_msg: null }).eq('id', uploadId);

    // Baixa arquivo
    const { data: file, error: fileErr } = await admin.storage
      .from('report-files')
      .download(upload.storage_path);
    if (fileErr || !file) {
      await admin.from('report_uploads').update({ status: 'erro', erro_msg: 'Falha ao baixar arquivo' }).eq('id', uploadId);
      return json({ error: 'Falha ao baixar arquivo' }, 500);
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    const ext = upload.arquivo_nome.toLowerCase().split('.').pop();

    let rows: Record<string, unknown>[] = [];
    try {
      if (ext === 'csv') {
        const wb = XLSX.read(buf, { type: 'array', raw: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      } else {
        throw new Error('Formato não suportado (use CSV ou XLSX)');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erro de parsing';
      await admin.from('report_uploads').update({ status: 'erro', erro_msg: msg }).eq('id', uploadId);
      return json({ error: msg }, 400);
    }

    const schema: SchemaCol[] = Array.isArray(dataset.schema) ? dataset.schema as SchemaCol[] : [];

    // Normaliza linhas conforme schema (se schema vazio, mantém como veio)
    const normalized = rows.map((r) => {
      if (schema.length === 0) return r;
      const out: Record<string, unknown> = {};
      for (const col of schema) {
        const raw = r[col.key] ?? r[col.label];
        out[col.key] = castValue(raw, col.type);
      }
      return out;
    });

    // Limpa linhas anteriores deste upload (re-processamento)
    await admin.from('report_rows').delete().eq('upload_id', uploadId);

    // Insere em lotes
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < normalized.length; i += BATCH) {
      const slice = normalized.slice(i, i + BATCH).map((dados, idx) => ({
        upload_id: uploadId,
        dataset_id: upload.dataset_id,
        periodo_referencia: upload.periodo_referencia,
        row_index: i + idx,
        dados,
      }));
      const { error: insErr } = await admin.from('report_rows').insert(slice);
      if (insErr) {
        await admin.from('report_uploads').update({ status: 'erro', erro_msg: insErr.message }).eq('id', uploadId);
        return json({ error: insErr.message }, 500);
      }
      inserted += slice.length;
    }

    await admin
      .from('report_uploads')
      .update({ status: 'processado', linhas_total: inserted, erro_msg: null })
      .eq('id', uploadId);

    return json({ ok: true, inserted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro inesperado';
    console.error('ingest-report error', msg);
    return json({ error: msg }, 500);
  }
});

function castValue(v: unknown, type: SchemaCol['type']): unknown {
  if (v === null || v === undefined || v === '') return null;
  if (type === 'number') {
    if (typeof v === 'number') return v;
    const s = String(v).trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'date') {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    // dd/mm/yyyy
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return String(v);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
