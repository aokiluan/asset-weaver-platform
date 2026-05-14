import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TS { name: string; email: string; publicId?: string; signed: boolean }

function norm(v?: string | null) { return (v || "").trim().toLowerCase(); }
function parseSigners(v: unknown): TS[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return [];
    const s = x as Record<string, unknown>;
    return [{
      name: typeof s.name === "string" ? s.name : "",
      email: typeof s.email === "string" ? s.email : "",
      publicId: typeof s.publicId === "string" ? s.publicId : undefined,
      signed: Boolean(s.signed),
    }];
  });
}
function same(a: TS, b: TS) {
  if (a.publicId && b.publicId && a.publicId === b.publicId) return true;
  if (norm(a.email) && norm(a.email) === norm(b.email)) return true;
  return Boolean(norm(a.name) && norm(a.name) === norm(b.name));
}
function merge(existing: TS[], remote: TS[]): TS[] {
  if (existing.length === 0) return remote;
  const merged = existing.map((c) => {
    const m = remote.find((r) => same(c, r));
    return m ? { ...c, name: m.name || c.name, email: m.email || c.email, publicId: m.publicId || c.publicId, signed: m.signed } : c;
  });
  const missing = remote.filter((r) => !merged.some((c) => same(c, r)));
  return [...merged, ...missing];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("AUTENTIQUE_API_KEY");
    if (!apiKey) throw new Error("AUTENTIQUE_API_KEY não configurada");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const boletaId = typeof body?.boletaId === "string" ? body.boletaId : null;
    const documentId = typeof body?.documentId === "string" ? body.documentId : null;
    if (!boletaId && !documentId) {
      return new Response(JSON.stringify({ success: false, error: "boletaId ou documentId obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const q = supabase.from("signature_tracking").select("*").order("created_at", { ascending: false }).limit(1);
    const { data: rows, error } = boletaId ? await q.eq("boleta_id", boletaId) : await q.eq("autentique_document_id", documentId!);
    if (error) throw error;
    const tracking = rows?.[0];
    if (!tracking) {
      return new Response(JSON.stringify({ success: true, tracking: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const query = `query { document(id: ${JSON.stringify(tracking.autentique_document_id)}) {
      id name signatures { public_id name email user { name email } user_data { name email } signed { created_at } }
    } }`;
    const resp = await fetch("https://api.autentique.com.br/v2/graphql", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const result = await resp.json();
    if (!resp.ok || result.errors) {
      console.error("Autentique status error:", JSON.stringify(result));
      throw new Error(`Autentique [${resp.status}]`);
    }
    const document = result?.data?.document;
    if (!document) throw new Error("Documento não encontrado");

    const remote: TS[] = (document.signatures || []).map((s: any) => ({
      name: s.user?.name || s.user_data?.name || s.name || "",
      email: s.user?.email || s.user_data?.email || s.email || "",
      publicId: s.public_id || "",
      signed: Boolean(s.signed),
    }));

    const current = parseSigners(tracking.signers);
    const merged = merge(current, remote);
    const allSigned = merged.length > 0 && merged.every((s) => s.signed);
    const someSigned = merged.some((s) => s.signed);
    const nextStatus = allSigned ? "finished" : someSigned ? "in_progress" : "pending";
    const nextFinishedAt = allSigned ? (tracking.finished_at || new Date().toISOString()) : null;
    const changed = JSON.stringify(current) !== JSON.stringify(merged) || tracking.status !== nextStatus || tracking.finished_at !== nextFinishedAt;

    let record = tracking;
    if (changed) {
      const { data: upd, error: uErr } = await supabase.from("signature_tracking").update({
        signers: merged, status: nextStatus, finished_at: nextFinishedAt,
      }).eq("id", tracking.id).select("*").single();
      if (uErr) throw uErr;
      record = upd;
    }

    if (allSigned) {
      await supabase.from("investor_boletas").update({
        status: "concluida",
        contrato_assinado_em: new Date().toISOString(),
        concluida_em: new Date().toISOString(),
        current_step: 3,
      }).eq("id", tracking.boleta_id);
    }

    return new Response(JSON.stringify({
      success: true,
      tracking: changed ? record : { ...record, signers: merged, status: nextStatus, finished_at: nextFinishedAt },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("sync-autentique-status error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
