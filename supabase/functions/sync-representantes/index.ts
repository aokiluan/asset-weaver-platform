// Sincroniza representantes legais (QSA) de um cedente via BrasilAPI
// Estratégia idempotente: NÃO apaga registros existentes. Apenas insere
// representantes novos (por CPF) que ainda não existam para o cedente.
// Isso preserva qualquer dado complementar já preenchido pelo usuário.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QsaItem {
  nome_socio?: string;
  cnpj_cpf_do_socio?: string;
  qualificacao_socio?: string;
  codigo_qualificacao_socio?: number;
  percentual_capital_social?: number;
  data_entrada_sociedade?: string;
}

const normalizeCpf = (v?: string | null) =>
  (v ?? "").toString().replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cedente_id } = await req.json();
    if (!cedente_id || typeof cedente_id !== "string") {
      return new Response(JSON.stringify({ error: "cedente_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente com JWT do usuário (valida sessão e RLS de leitura)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se o usuário pode ver o cedente
    const { data: cedente, error: cedErr } = await userClient
      .from("cedentes")
      .select("id, cnpj")
      .eq("id", cedente_id)
      .maybeSingle();

    if (cedErr || !cedente) {
      return new Response(JSON.stringify({ error: "Cedente não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cnpjLimpo = (cedente.cnpj || "").replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consulta BrasilAPI
    const brResp = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
    );
    if (!brResp.ok) {
      const txt = await brResp.text();
      return new Response(
        JSON.stringify({
          error: "Falha ao consultar BrasilAPI",
          detalhe: txt.slice(0, 200),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const cnpjData = await brResp.json();
    const qsa: QsaItem[] = Array.isArray(cnpjData?.qsa) ? cnpjData.qsa : [];

    // Cliente service-role para ler/inserir contornando RLS
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Busca representantes já existentes para deduplicar por CPF (ou por nome,
    // quando o CPF do QSA não está disponível).
    const { data: existentes, error: exErr } = await adminClient
      .from("cedente_representantes")
      .select("id, cpf, nome")
      .eq("cedente_id", cedente_id);

    if (exErr) {
      return new Response(
        JSON.stringify({ error: "Erro ao ler existentes", detalhe: exErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const cpfsExistentes = new Set(
      (existentes ?? [])
        .map((r) => normalizeCpf(r.cpf as string | null))
        .filter((v) => v.length > 0),
    );
    const nomesExistentes = new Set(
      (existentes ?? [])
        .map((r) => (r.nome ?? "").trim().toUpperCase())
        .filter((v) => v.length > 0),
    );

    const now = new Date().toISOString();
    const novos = qsa
      .map((s) => {
        const cpfLimpo = normalizeCpf(s.cnpj_cpf_do_socio);
        const nomeNorm = (s.nome_socio ?? "").trim().toUpperCase();
        return {
          row: {
            cedente_id,
            nome: s.nome_socio || "—",
            cpf: s.cnpj_cpf_do_socio || null,
            qualificacao: s.qualificacao_socio || null,
            participacao_capital:
              typeof s.percentual_capital_social === "number"
                ? s.percentual_capital_social
                : null,
            fonte: "receita",
            sincronizado_em: now,
          },
          cpfLimpo,
          nomeNorm,
        };
      })
      .filter(({ cpfLimpo, nomeNorm }) => {
        if (cpfLimpo && cpfsExistentes.has(cpfLimpo)) return false;
        if (!cpfLimpo && nomeNorm && nomesExistentes.has(nomeNorm)) return false;
        return true;
      })
      .map(({ row }) => row);

    let inseridos = 0;
    if (novos.length > 0) {
      const { error: insErr } = await adminClient
        .from("cedente_representantes")
        .insert(novos);
      if (insErr) {
        return new Response(
          JSON.stringify({ error: "Erro ao salvar", detalhe: insErr.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      inseridos = novos.length;
    }

    await adminClient
      .from("cedentes")
      .update({ representantes_sincronizado_em: now })
      .eq("id", cedente_id);

    return new Response(
      JSON.stringify({
        success: true,
        total: qsa.length,
        inseridos,
        preservados: (existentes ?? []).length,
        sincronizado_em: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Erro interno", detalhe: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
