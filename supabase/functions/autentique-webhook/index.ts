import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: any): string { return String(s ?? "").replace(/\D/g, ""); }
function slug(s: string): string {
  return (s || "doc").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "").slice(0, 40) || "doc";
}

async function promoteBoletaToInvestidor(
  supabase: any, boletaId: string, trackingId: string, autentiqueDocId: string, apiKey: string | undefined,
) {
  const nowIso = new Date().toISOString();
  const { data: boleta } = await supabase
    .from("investor_boletas").select("*").eq("id", boletaId).maybeSingle();
  if (!boleta) return;

  const dados = (boleta.dados_investidor || {}) as Record<string, any>;
  const docDigits = onlyDigits(dados.cpf_cnpj || dados.cnpj || dados.cpf);
  let investidorId: string | null = boleta.investidor_id ?? null;

  if (docDigits) {
    const tipoPessoa = docDigits.length === 11 ? "pf" : "pj";
    const nome = String(dados.nome || dados.razao_social || "Investidor").trim();
    const upsertPayload: Record<string, any> = {
      cnpj: docDigits, tipo_pessoa: tipoPessoa, razao_social: nome,
      nome_fantasia: dados.nome_fantasia ?? null,
      email: dados.email ?? null, telefone: dados.telefone ?? null,
      endereco: dados.endereco ?? dados.logradouro ?? null,
      numero: dados.numero ?? null, bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null, estado: dados.estado ?? null,
      cep: dados.cep ? onlyDigits(dados.cep) : null,
      status: "ativo",
      created_by: boleta.user_id ?? null, owner_id: boleta.user_id ?? null,
    };
    const { data: inv, error: invErr } = await supabase
      .from("investidores").upsert(upsertPayload, { onConflict: "cnpj" })
      .select("id").maybeSingle();
    if (invErr) console.error("upsert investidor:", invErr);
    if (inv?.id) investidorId = inv.id;

    if (investidorId) {
      const { data: sum } = await supabase
        .from("investor_boletas").select("valor")
        .eq("investidor_id", investidorId).eq("status", "concluida");
      const total = ((sum as any[]) || []).reduce((a, r) => a + Number(r.valor || 0), 0)
        + Number(boleta.valor || 0);
      await supabase.from("investidores").update({ valor_investido: total }).eq("id", investidorId);
    }
  }

  await supabase.from("investor_boletas").update({
    status: "concluida", contrato_assinado_em: nowIso, concluida_em: nowIso,
    current_step: 3, investidor_id: investidorId,
  }).eq("id", boletaId);

  if (boleta.contact_id) {
    await supabase.from("investor_contacts").update({
      stage: "investidor_ativo", last_contact_date: nowIso.slice(0, 10),
    }).eq("id", boleta.contact_id);
  }

  const signedFiles: Array<{ name: string; storage_path: string; saved_at: string }> = [];
  if (investidorId && apiKey) {
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
          const fr = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
          if (!fr.ok) { console.warn(`autentique ${tag} ${fr.status}`); continue; }
          const bytes = new Uint8Array(await fr.arrayBuffer());
          if (bytes.byteLength < 1024) { console.warn(`autentique ${tag} arquivo vazio`); continue; }
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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const apiKey = Deno.env.get("AUTENTIQUE_API_KEY");
    const payload = await req.json();
    console.log("Autentique webhook:", JSON.stringify(payload));
    const event = payload?.event;
    if (!event) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const eventType = event.type;
    const eventData = event.data;

    async function markFinishedIfNeeded(docId: string) {
      const { data: tracking } = await supabase.from("signature_tracking").select("id, boleta_id").eq("autentique_document_id", docId).single();
      if (tracking) {
        await promoteBoletaToInvestidor(supabase, tracking.boleta_id, tracking.id, docId, apiKey);
      }
    }

    if (eventType === "document.finished" || eventType === "document.updated") {
      const docId = eventData?.id;
      if (docId) {
        const signatures = eventData?.signatures || [];
        const updatedSigners = signatures.map((sig: any) => ({
          name: sig.user?.name || sig.name || "",
          email: sig.user?.email || sig.email || "",
          publicId: sig.public_id || "",
          signed: !!sig.signed,
        }));
        const isFinished = eventType === "document.finished" || (updatedSigners.length > 0 && updatedSigners.every((s: any) => s.signed));
        const upd: Record<string, any> = { status: isFinished ? "finished" : "in_progress" };
        if (updatedSigners.length > 0) upd.signers = updatedSigners;
        if (isFinished) upd.finished_at = new Date().toISOString();
        await supabase.from("signature_tracking").update(upd).eq("autentique_document_id", docId);
        if (isFinished) await markFinishedIfNeeded(docId);
      }
    }

    if (eventType === "signature.accepted") {
      const docId = eventData?.document;
      const signerEmail = eventData?.user?.email;
      if (docId && signerEmail) {
        const { data: tracking } = await supabase.from("signature_tracking").select("*").eq("autentique_document_id", docId).single();
        if (tracking) {
          const signers = (tracking.signers as any[]) || [];
          const updated = signers.map((s: any) => s.email === signerEmail ? { ...s, signed: true } : s);
          const allSigned = updated.every((s: any) => s.signed);
          const upd: Record<string, any> = { signers: updated, status: allSigned ? "finished" : "in_progress" };
          if (allSigned) upd.finished_at = new Date().toISOString();
          await supabase.from("signature_tracking").update(upd).eq("autentique_document_id", docId);
          if (allSigned) await markFinishedIfNeeded(docId);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("webhook error:", err);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
