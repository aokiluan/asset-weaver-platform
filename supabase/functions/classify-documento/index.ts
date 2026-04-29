// Classifica documento via Lovable AI (Gemini multimodal)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado" }, 401);
    }
    if (!lovableKey) {
      return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    }

    const { documento_id } = await req.json();
    if (!documento_id || typeof documento_id !== "string") {
      return json({ error: "documento_id obrigatório" }, 400);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Carrega documento + categorias ativas
    const [{ data: doc, error: docErr }, { data: cats }] = await Promise.all([
      admin
        .from("documentos")
        .select("id, nome_arquivo, mime_type, storage_path, cedente_id")
        .eq("id", documento_id)
        .maybeSingle(),
      admin
        .from("documento_categorias")
        .select("id, nome, descricao")
        .eq("ativo", true)
        .order("ordem"),
    ]);

    if (docErr || !doc) return json({ error: "Documento não encontrado" }, 404);
    const categorias = cats ?? [];
    if (categorias.length === 0) {
      await admin
        .from("documentos")
        .update({ classificacao_status: "erro" })
        .eq("id", documento_id);
      return json({ error: "Nenhuma categoria cadastrada" }, 400);
    }

    // Marca como analisando
    await admin
      .from("documentos")
      .update({ classificacao_status: "analisando" })
      .eq("id", documento_id);

    // Baixa arquivo (signed URL) e converte para base64
    const { data: signed, error: sErr } = await admin.storage
      .from("cedente-docs")
      .createSignedUrl(doc.storage_path, 120);
    if (sErr || !signed) {
      await admin
        .from("documentos")
        .update({ classificacao_status: "erro" })
        .eq("id", documento_id);
      return json({ error: "Erro ao gerar URL do arquivo" }, 500);
    }

    const fileResp = await fetch(signed.signedUrl);
    if (!fileResp.ok) {
      await admin
        .from("documentos")
        .update({ classificacao_status: "erro" })
        .eq("id", documento_id);
      return json({ error: "Falha ao baixar arquivo" }, 500);
    }
    const buf = new Uint8Array(await fileResp.arrayBuffer());
    // base64 em chunks p/ não estourar stack
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);
    const mime = doc.mime_type || guessMime(doc.nome_arquivo);

    const catList = categorias
      .map((c, i) => `${i + 1}. id="${c.id}" — ${c.nome}${c.descricao ? `: ${c.descricao}` : ""}`)
      .join("\n");

    const systemPrompt = `Você é um classificador de documentos de cadastro de empresas (cedentes em operação de crédito). Receberá um arquivo (PDF ou imagem) e a lista de categorias possíveis. Escolha EXATAMENTE UMA categoria pela id, baseado no conteúdo do arquivo. Se não tiver certeza, escolha a mais provável e use confianca baixa.`;
    const userPrompt = `Categorias possíveis:\n${catList}\n\nNome do arquivo: "${doc.nome_arquivo}"\n\nClassifique o arquivo abaixo retornando a id da categoria mais adequada.`;

    // Conteúdo multimodal
    const contentParts: any[] = [{ type: "text", text: userPrompt }];
    if (mime === "application/pdf" || mime.startsWith("image/")) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${b64}` },
      });
    }

    const aiBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contentParts },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "classificar_documento",
            description: "Retorna a categoria escolhida para o documento.",
            parameters: {
              type: "object",
              properties: {
                categoria_id: {
                  type: "string",
                  description: "ID exato da categoria escolhida",
                  enum: categorias.map((c) => c.id),
                },
                confianca: {
                  type: "string",
                  enum: ["alta", "media", "baixa"],
                },
                motivo: { type: "string" },
              },
              required: ["categoria_id", "confianca", "motivo"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "classificar_documento" },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway", aiResp.status, txt);
      await admin
        .from("documentos")
        .update({ classificacao_status: "erro" })
        .eq("id", documento_id);
      if (aiResp.status === 429) return json({ error: "Limite de requisições atingido. Tente novamente em instantes." }, 429);
      if (aiResp.status === 402) return json({ error: "Sem créditos de IA. Adicione créditos em Lovable Cloud." }, 402);
      return json({ error: "Falha na IA", detalhe: txt.slice(0, 200) }, 500);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments)
      : null;

    if (!args?.categoria_id || !categorias.find((c) => c.id === args.categoria_id)) {
      await admin
        .from("documentos")
        .update({ classificacao_status: "erro" })
        .eq("id", documento_id);
      return json({ error: "IA não retornou categoria válida" }, 500);
    }

    await admin
      .from("documentos")
      .update({
        categoria_sugerida_id: args.categoria_id,
        classificacao_status: "sugerido",
      })
      .eq("id", documento_id);

    return json({
      success: true,
      categoria_id: args.categoria_id,
      confianca: args.confianca,
      motivo: args.motivo,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro interno", detalhe: String(e) }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function guessMime(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    default: return "application/octet-stream";
  }
}
