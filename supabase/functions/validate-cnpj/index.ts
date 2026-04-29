import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    const clean = String(cnpj ?? "").replace(/\D/g, "");

    if (clean.length !== 14) {
      return new Response(
        JSON.stringify({ success: false, error: "CNPJ inválido (precisa ter 14 dígitos)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (!r.ok) {
      const txt = await r.text();
      return new Response(
        JSON.stringify({ success: false, error: `BrasilAPI ${r.status}: ${txt.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const j = await r.json();

    const data = {
      cnpj: clean,
      razao_social: j.razao_social ?? "",
      nome_fantasia: j.nome_fantasia ?? "",
      capital_social: typeof j.capital_social === "number" ? j.capital_social : Number(j.capital_social) || 0,
      natureza_juridica: j.natureza_juridica ?? "",
      logradouro: j.logradouro ?? "",
      numero: j.numero ?? "",
      bairro: j.bairro ?? "",
      municipio: j.municipio ?? "",
      uf: j.uf ?? "",
      cep: (j.cep ?? "").replace(/\D/g, ""),
      telefone: j.ddd_telefone_1 ?? "",
      email: j.email ?? "",
      data_abertura: j.data_inicio_atividade ?? "",
      situacao: j.descricao_situacao_cadastral ?? "",
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
