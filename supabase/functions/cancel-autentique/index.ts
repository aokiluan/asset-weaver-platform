import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("AUTENTIQUE_API_KEY");
    if (!apiKey) throw new Error("AUTENTIQUE_API_KEY não configurada");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const boletaId = typeof body?.boletaId === "string" ? body.boletaId : null;
    const motivo = typeof body?.motivo === "string" ? body.motivo : null;
    if (!boletaId) {
      return new Response(JSON.stringify({ success: false, error: "boletaId obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pega trackings ativos (não finalizados) da boleta
    const { data: trackings, error: tErr } = await supabase
      .from("signature_tracking")
      .select("*")
      .eq("boleta_id", boletaId);
    if (tErr) throw tErr;

    const errors: string[] = [];
    for (const t of trackings ?? []) {
      if (!t.autentique_document_id) continue;
      try {
        const mutation = `mutation { deleteDocument(id: ${JSON.stringify(t.autentique_document_id)}) }`;
        const resp = await fetch("https://api.autentique.com.br/v2/graphql", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: mutation }),
        });
        const result = await resp.json();
        if (!resp.ok || result.errors) {
          console.error("Autentique delete error:", JSON.stringify(result));
          errors.push(`Doc ${t.autentique_document_id}: ${result.errors?.[0]?.message || resp.status}`);
        }
        await supabase.from("signature_tracking")
          .update({ status: "cancelled" })
          .eq("id", t.id);
      } catch (e) {
        console.error("delete fail", e);
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    const { error: bErr } = await supabase.from("investor_boletas").update({
      status: "cancelada",
      cancelada_em: new Date().toISOString(),
      cancelamento_motivo: motivo,
    }).eq("id", boletaId);
    if (bErr) throw bErr;

    return new Response(JSON.stringify({ success: true, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("cancel-autentique error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
