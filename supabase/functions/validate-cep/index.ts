import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    const clean = String(cep ?? "").replace(/\D/g, "");

    if (clean.length !== 8) {
      return new Response(
        JSON.stringify({ success: false, error: "CEP inválido (precisa ter 8 dígitos)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!r.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `ViaCEP ${r.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const j = await r.json();
    if (j.erro) {
      return new Response(
        JSON.stringify({ success: false, error: "CEP não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = {
      cep: clean,
      logradouro: j.logradouro ?? "",
      bairro: j.bairro ?? "",
      cidade: j.localidade ?? "",
      estado: j.uf ?? "",
    };

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
