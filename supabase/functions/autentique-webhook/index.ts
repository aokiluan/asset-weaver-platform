import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = await req.json();
    console.log("Autentique webhook:", JSON.stringify(payload));
    const event = payload?.event;
    if (!event) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const eventType = event.type;
    const eventData = event.data;

    async function markFinishedIfNeeded(docId: string) {
      const { data: tracking } = await supabase.from("signature_tracking").select("boleta_id").eq("autentique_document_id", docId).single();
      if (tracking) {
        const nowIso = new Date().toISOString();
        await supabase.from("investor_boletas").update({
          status: "concluida",
          contrato_assinado_em: nowIso,
          concluida_em: nowIso,
          current_step: 3,
        }).eq("id", tracking.boleta_id);
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
