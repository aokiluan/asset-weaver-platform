import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DadosInvestidor {
  nome?: string; cpf_cnpj?: string; rg?: string; orgao_emissor?: string; email?: string;
  cep?: string; endereco?: string; numero?: string; bairro?: string; cidade?: string; estado?: string;
}

function fmtCurrency(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function getQty(valor: number) { return Math.floor(valor / 1000); }
function dateShort(d = new Date()) { return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; }
function dateLong(d = new Date()) {
  const m=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${d.getDate()} de ${m[d.getMonth()]} de ${d.getFullYear()}`;
}
function maturityDate(prazo: number | null) {
  const e = new Date(2025, 4, 5); const m = prazo ?? 12;
  const dt = new Date(e); dt.setMonth(dt.getMonth() + m); return dateShort(dt);
}
function serieIdx(s: any) {
  const sp = s.spread != null ? `${String(s.spread).replace(".",",")}%` : "";
  return [s.indexador ?? "", sp].filter(Boolean).join(" + ");
}
function quantityByExtensive(qty: number): string {
  const units=["","UMA","DUAS","TRÊS","QUATRO","CINCO","SEIS","SETE","OITO","NOVE"];
  const tens=["","DEZ","VINTE","TRINTA","QUARENTA","CINQUENTA","SESSENTA","SETENTA","OITENTA","NOVENTA"];
  const hundreds=["","CEM","DUZENTAS","TREZENTAS","QUATROCENTAS","QUINHENTAS","SEISCENTAS","SETECENTAS","OITOCENTAS","NOVECENTAS"];
  const sp:Record<number,string>={11:"ONZE",12:"DOZE",13:"TREZE",14:"QUATORZE",15:"QUINZE",16:"DEZESSEIS",17:"DEZESSETE",18:"DEZOITO",19:"DEZENOVE"};
  if (qty===0) return "ZERO"; if (qty===1000) return "UMA MIL";
  if (qty>1000){const t=Math.floor(qty/1000);const r=qty%1000;let res=quantityByExtensive(t)+" MIL";if(r>0)res+=" E "+quantityByExtensive(r);return res;}
  const h=Math.floor(qty/100);const t=Math.floor((qty%100)/10);const u=qty%10;const tu=qty%100;
  const parts:string[]=[];
  if(h>0){if(tu===0&&h===1)parts.push("CEM");else if(h===1)parts.push("CENTO");else parts.push(hundreds[h]);}
  if(tu>=11&&tu<=19)parts.push(sp[tu]);else{if(t>0)parts.push(tens[t]);if(u>0)parts.push(units[u]);}
  return parts.join(" E ");
}

function generateBoletim(boleta: any, dados: DadosInvestidor, series: any) {
  const valor = boleta.valor ?? 0; const qty = getQty(valor); const today = dateShort(); const idx = serieIdx(series);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
@page{size:A4;margin:20mm 25mm}body{font-family:'Times New Roman',serif;font-size:11pt;color:#000;margin:0;padding:20px}
h1{text-align:center;font-size:14pt;font-weight:bold;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:8px}
td,th{border:1px solid #000;padding:4px 6px;font-size:10pt;vertical-align:top}th{font-weight:bold;text-align:left;background:#f5f5f5}
.section-title{font-weight:bold;font-size:10pt;margin:12px 0 4px}.signature-block{text-align:center;margin-top:30px}
.signature-line{border-top:1px solid #000;width:300px;margin:40px auto 4px}.italic{font-style:italic}p{margin:4px 0;font-size:10pt}
</style></head><body>
<h1>BOLETIM DE SUBSCRIÇÃO DE DEBÊNTURES SIMPLES</h1>
<p class="section-title">Emissora</p><p>S3 CAPITAL SECURITIZADORA S A</p>
<table><tr><th>Cautelas</th><th>Operação</th><th>Data</th><th>CNPJ</th></tr>
<tr><td class="italic">1</td><td class="italic">Venda</td><td class="italic">${today}</td><td class="italic">60.353.126/0001-71</td></tr></table>
<table><tr><th colspan="2">Logradouro</th><th colspan="2">Bairro</th></tr>
<tr><td colspan="2" class="italic">Avenida Doutor Heitor Nascimento, 196, Sala 76, Bloco A — Edifício Centro Comercial Aliança</td><td colspan="2" class="italic">Morumbi</td></tr>
<tr><th>CEP</th><th>Cidade</th><th colspan="2">UF</th></tr>
<tr><td class="italic">13140-729</td><td class="italic">Paulínia</td><td colspan="2" class="italic">SP</td></tr></table>
<p class="section-title">Característica da Emissão</p>
<p class="italic">Emissão privada, aprovada pela AGE da EMISSORA realizada em 28 de Abril de 2025.</p>
<p>Data da Emissão: 05/05/2025. Série: ${series.nome}. Indexador: ${idx || "—"}. Vencimento: ${maturityDate(series.prazo_meses)}.</p>
<table><tr><th>Adquirente</th><th>CPF/CNPJ</th></tr>
<tr><td class="italic">${(dados.nome ?? "").toUpperCase()}</td><td class="italic">${dados.cpf_cnpj ?? ""}</td></tr>
<tr><th>RG</th><th>Órgão Emissor</th></tr><tr><td class="italic">${dados.rg ?? ""}</td><td class="italic">${dados.orgao_emissor ?? ""}</td></tr>
<tr><th>Endereço</th><th>Email</th></tr><tr><td class="italic">${dados.endereco ?? ""}, ${dados.numero ?? ""}</td><td class="italic">${dados.email ?? ""}</td></tr>
<tr><th>Bairro</th><th>Cidade/UF</th></tr><tr><td class="italic">${dados.bairro ?? ""}</td><td class="italic">${dados.cidade ?? ""}/${dados.estado ?? ""}</td></tr></table>
<table><tr><th>Preço Unit.</th><th>Qtd Subscritas</th><th>Qtd Integralizadas</th><th>Total Integralizado</th></tr>
<tr><td class="italic">R$ 1.000,00</td><td class="italic">${qty}</td><td class="italic">${qty}</td><td class="italic">${fmtCurrency(valor)}</td></tr>
<tr><th>Forma Pagamento</th><th colspan="3">Observações</th></tr><tr><td class="italic">PIX</td><td class="italic" colspan="3"></td></tr></table>
<p style="margin-top:16px">Recebemos a referida integralização no valor acima.</p>
<div class="signature-block"><div class="signature-line"></div><p><strong>Luan Aoki Helena Schuwarten</strong></p><p><strong><em>S3 CAPITAL SECURITIZADORA S A</em></strong></p></div>
<hr style="margin:24px 0;border:0;border-top:1px solid #000"/>
<p class="italic" style="font-size:9pt">Declaro estar de acordo com as condições expressas; recebi cópia da Escritura de Emissão Privada de Debêntures Simples celebrada em 5 de Maio de 2025.</p>
<div class="signature-block"><div class="signature-line"></div><p><strong>Subscritor ou Representante Legal</strong></p></div>
</body></html>`;
}

function generateCertificado(boleta: any, dados: DadosInvestidor, series: any) {
  const valor = boleta.valor ?? 0; const qty = getQty(valor); const qtyExt = quantityByExtensive(qty); const idx = serieIdx(series);
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
@page{size:A4 landscape;margin:15mm 20mm}body{font-family:'Times New Roman',serif;font-size:10pt;color:#000;margin:0;padding:20px}
.header{text-align:center;margin-bottom:20px}.header h1{font-size:13pt;font-weight:bold;margin:0}.header p{font-size:9pt;margin:2px 0}
.center-bold{text-align:center;font-weight:bold;margin:16px 0 8px}.debenture-title{text-align:center;font-weight:bold;font-size:12pt;margin:16px 0}
table{width:60%;margin:0 auto;border-collapse:collapse}td,th{border:1px solid #000;padding:4px 8px;font-size:10pt}th{font-style:italic}
.main-text{font-style:italic;font-size:9.5pt;margin:16px 20px;text-align:justify}.pague-se{text-align:center;font-weight:bold;font-size:10pt;margin:16px 0}
.signatures{display:flex;justify-content:space-between;margin-top:40px;padding:0 40px}.sig-block{text-align:center;width:45%}
.sig-line{border-top:1px solid #000;margin:50px auto 4px;width:280px}.sig-name{font-weight:bold}.sig-title{font-size:9pt;font-style:italic}
</style></head><body>
<div class="header"><h1>S3 CAPITAL SECURITIZADORA S A</h1><p>CNPJ: 60.353.126/0001-71</p><p>Avenida Doutor Heitor Nascimento, 196, Sala 76, Bloco A — Edifício Centro Comercial Aliança — Morumbi — Paulínia-SP — CEP 13140-729</p></div>
<p class="center-bold">Prazo de Duração: Indeterminado</p>
<div class="debenture-title">DEBÊNTURES SIMPLES, CLASSE SÊNIOR — ${series.nome.toUpperCase()}</div>
<table><tr><th>Cautela Nº</th><th>Quantidade</th></tr><tr><td style="text-align:center;font-style:italic">1</td><td style="text-align:center;font-style:italic">${qty}</td></tr></table>
<p class="main-text">Esta cautela representativa de ${qty} (${qtyExt}) debênture(s), no valor nominal unitário de R$ 1.000,00 (UM MIL REAIS), não conversíveis em ações, da emissão privada, série <strong>${series.nome}</strong> (índice ${idx || "—"}), confere ao titular abaixo os direitos previstos na Escritura de Emissão.</p>
<p class="pague-se">PAGUE-SE A ${(dados.nome ?? "").toUpperCase()}, CPF/CNPJ: ${dados.cpf_cnpj ?? ""}</p>
<p style="text-align:center;font-style:italic;margin:8px 0">Paulínia (SP), ${dateLong()}</p>
<div class="signatures">
<div class="sig-block"><div class="sig-line"></div><p>S3 CAPITAL SECURITIZADORA S A</p><p class="sig-title">Diretor Presidente</p><p class="sig-name">Everaldo Fernando Silvério</p></div>
<div class="sig-block"><div class="sig-line"></div><p>S3 CAPITAL SECURITIZADORA S A</p><p class="sig-title">Diretor de Relação com Investidores</p><p class="sig-name">Luan Aoki Helena Schuwarten</p></div>
</div></body></html>`;
}

function combineHtml(a: string, b: string) {
  const body = (h: string) => h.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? h;
  const styles = (h: string) => h.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>${styles(a)}.page-break{page-break-before:always;margin-top:40px}${styles(b)}</style></head><body>${body(a)}<div class="page-break"></div>${body(b)}</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("AUTENTIQUE_API_KEY");
    if (!apiKey) throw new Error("AUTENTIQUE_API_KEY não configurada");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { boletaId, sandbox = false } = await req.json();
    if (!boletaId) throw new Error("boletaId obrigatório");

    const { data: boleta, error: bErr } = await supabase
      .from("investor_boletas").select("*").eq("id", boletaId).single();
    if (bErr || !boleta) throw new Error("Boleta não encontrada");

    if (!boleta.series_id) throw new Error("Selecione uma série antes de assinar");
    const { data: series, error: sErr } = await supabase
      .from("investor_series").select("*").eq("id", boleta.series_id).single();
    if (sErr || !series) throw new Error("Série não encontrada");

    const dados = (boleta.dados_investidor ?? {}) as DadosInvestidor;
    if (!dados.nome || !dados.cpf_cnpj || !dados.email) {
      throw new Error("Nome, CPF/CNPJ e e-mail do investidor são obrigatórios");
    }

    const html = combineHtml(generateBoletim(boleta, dados, series), generateCertificado(boleta, dados, series));
    const stripCpf = (c: string) => c.replace(/\D/g, "");
    const signers = [
      { name: "Everaldo Fernando Silvério", email: "everaldo.silverio@s3g.capital", cpf: stripCpf("191.926.008-08") },
      { name: "Luan Aoki Helena Schuwarten", email: "luan.schuwarten@s3g.capital", cpf: stripCpf("452.428.128-26") },
      { name: dados.nome, email: dados.email, cpf: stripCpf(dados.cpf_cnpj) },
    ];

    const now = new Date();
    const datePrefix = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;
    const documentName = `${datePrefix} - Boletim e Certificado - ${dados.nome} - ${boletaId}`;

    const mutation = `mutation CreateDoc($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!, $sandbox: Boolean) {
      createDocument(document: $document, signers: $signers, file: $file, sandbox: $sandbox) {
        id name signatures { public_id link { short_link } user { id name email } }
      }
    }`;
    const variables = {
      document: { name: documentName },
      signers: signers.map((s) => ({ email: s.email, action: "SIGN", configs: { cpf: s.cpf } })),
      sandbox,
    };
    const blob = new Blob([html], { type: "text/html" });
    const fd = new FormData();
    fd.append("operations", JSON.stringify({ query: mutation, variables }));
    fd.append("map", JSON.stringify({ "0": ["variables.file"] }));
    fd.append("0", blob, `${documentName}.html`);

    const resp = await fetch("https://api.autentique.com.br/v2/graphql", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: fd,
    });
    const result = await resp.json();
    if (!resp.ok || result.errors) {
      console.error("Autentique error:", JSON.stringify(result));
      throw new Error(`Autentique [${resp.status}]: ${JSON.stringify(result.errors || result)}`);
    }
    const doc = result.data.createDocument;
    const signerLinks = (doc.signatures || []).map((s: any) => ({
      name: s.user?.name || "", email: s.user?.email || "",
      link: s.link?.short_link || "", publicId: s.public_id || "",
    }));

    await supabase.from("signature_tracking").insert({
      boleta_id: boletaId,
      autentique_document_id: doc.id,
      document_name: documentName,
      status: "pending",
      signers: signerLinks.map((s: any) => ({ name: s.name, email: s.email, publicId: s.publicId, signed: false })),
    });
    await supabase.from("investor_boletas").update({
      status: "aguardando_assinatura", current_step: 3,
    }).eq("id", boletaId);

    return new Response(JSON.stringify({ success: true, document: { id: doc.id, name: doc.name, signerLinks } }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-to-autentique error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
