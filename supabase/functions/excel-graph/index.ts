import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_excel";

async function gw(path: string, init?: RequestInit) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const EXCEL_API_KEY = Deno.env.get("MICROSOFT_EXCEL_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!EXCEL_API_KEY) throw new Error("MICROSOFT_EXCEL_API_KEY missing");

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": EXCEL_API_KEY,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Graph error [${res.status}]: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão inválida");

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      // List xlsx files in OneDrive (root + recent)
      const data = await gw(
        `/me/drive/root/search(q='.xlsx')?$top=50&$select=id,name,lastModifiedDateTime,webUrl,size,parentReference`
      );
      return new Response(
        JSON.stringify({ files: data.value ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "worksheets") {
      const itemId = body.itemId as string;
      if (!itemId) throw new Error("itemId obrigatório");
      const data = await gw(`/me/drive/items/${itemId}/workbook/worksheets`);
      return new Response(
        JSON.stringify({ worksheets: data.value ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "read") {
      const itemId = body.itemId as string;
      const sheet = body.worksheet as string;
      if (!itemId || !sheet) throw new Error("itemId e worksheet obrigatórios");
      const data = await gw(
        `/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange?$select=values,address,rowCount,columnCount`
      );
      return new Response(
        JSON.stringify({
          values: data.values ?? [],
          address: data.address,
          rowCount: data.rowCount,
          columnCount: data.columnCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Ação desconhecida: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("excel-graph error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
