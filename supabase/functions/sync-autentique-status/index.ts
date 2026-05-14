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

function onlyDigits(s: any): string { return String(s ?? "").replace(/\D/g, ""); }
function slug(s: string): string {
  return (s || "doc").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "").slice(0, 40) || "doc";
}

export async function promoteBoletaToInvestidor(
  supabase: any, boletaId: string, trackingId: string, autentiqueDocId: string, apiKey: string,
) {
  const nowIso = new Date().toISOString();
  const { data: boleta } = await supabase
    .from("investor_boletas").select("*").eq("id", boletaId).maybeSingle();
  if (!boleta) return;

  // 1) Upsert investidor
  const dados = (boleta.dados_investidor || {}) as Record<string, any>;
  const docDigits = onlyDigits(dados.cpf_cnpj || dados.cnpj || dados.cpf);
  let investidorId: string | null = boleta.investidor_id ?? null;

  if (docDigits) {
    const tipoPessoa = docDigits.length === 11 ? "pf" : "pj";
    const nome = String(dados.nome || dados.razao_social || "Investidor").trim();
    const upsertPayload: Record<string, any> = {
      cnpj: docDigits,
      tipo_pessoa: tipoPessoa,
      razao_social: nome,
      nome_fantasia: dados.nome_fantasia ?? null,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      endereco: dados.endereco ?? dados.logradouro ?? null,
      numero: dados.numero ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      estado: dados.estado ?? null,
      cep: dados.cep ? onlyDigits(dados.cep) : null,
      status: "ativo",
      created_by: boleta.user_id ?? null,
      owner_id: boleta.user_id ?? null,
    };
    const { data: inv, error: invErr } = await supabase
      .from("investidores")
      .upsert(upsertPayload, { onConflict: "cnpj" })
      .select("id").maybeSingle();
    if (invErr) console.error("upsert investidor:", invErr);
    if (inv?.id) investidorId = inv.id;

    // valor_investido = soma de boletas concluídas (incluindo a atual) deste cnpj
    if (investidorId) {
      const { data: sum } = await supabase
        .from("investor_boletas").select("valor")
        .eq("investidor_id", investidorId).eq("status", "concluida");
      const total = ((sum as any[]) || []).reduce((a, r) => a + Number(r.valor || 0), 0)
        + Number(boleta.valor || 0);
      await supabase.from("investidores").update({ valor_investido: total }).eq("id", investidorId);
    }
  }

  // 2) Atualiza boleta como concluída + vincula investidor
  await supabase.from("investor_boletas").update({
    status: "concluida",
    contrato_assinado_em: nowIso,
    concluida_em: nowIso,
    current_step: 3,
    investidor_id: investidorId,
  }).eq("id", boletaId);

  // 3) Promove o contato no CRM
  if (boleta.contact_id) {
    await supabase.from("investor_contacts").update({
      stage: "investidor_ativo",
      last_contact_date: nowIso.slice(0, 10),
    }).eq("id", boleta.contact_id);
  }

  // 4) Baixa PDFs assinados do Autentique e salva no bucket
  const signedFiles: Array<{ name: string; storage_path: string; saved_at: string }> = [];
  if (investidorId) {
    try {
      const q = `query { document(id: ${JSON.stringify(autentiqueDocId)}) {
        name files { signed pades original }
      } }`;
      const r = await fetch("https://api.autentique.com.br/v2/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const j = await r.json();
      const doc = j?.data?.document;
      const files = doc?.files || {};
      const baseName = slug(doc?.name || "boleta");
      const items: Array<[string, string | null]> = [
        ["assinado", files.signed || null],
        ["pades", files.pades || null],
      ];
      for (const [tag, url] of items) {
        if (!url) continue;
        try {
          const fr = await fetch(url);
          if (!fr.ok) continue;
          const bytes = new Uint8Array(await fr.arrayBuffer());
          const path = `${investidorId}/${boletaId}/${baseName}-${tag}.pdf`;
          const { error: upErr } = await supabase.storage
            .from("investor-boletas")
            .upload(path, bytes, { contentType: "application/pdf", upsert: true });
          if (upErr) { console.error("storage upload:", upErr); continue; }
          signedFiles.push({ name: `${baseName}-${tag}.pdf`, storage_path: path, saved_at: nowIso });
        } catch (e) { console.error("download/upload pdf:", e); }
      }
    } catch (e) { console.error("autentique files fetch:", e); }
  }

  if (signedFiles.length > 0) {
    await supabase.from("signature_tracking")
      .update({ signed_files: signedFiles }).eq("id", trackingId);
  }
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
      await promoteBoletaToInvestidor(supabase, tracking.boleta_id, tracking.id, tracking.autentique_document_id, apiKey);
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
