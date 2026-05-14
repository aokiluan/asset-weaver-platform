import type { BoletaDadosInvestidor, InvestorBoleta, InvestorSeries } from "./investor-boletas";

function fmtCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getQuantityDebentures(valor: number): number {
  return Math.floor(valor / 1000);
}

function quantityByExtensive(qty: number): string {
  const units = ["", "UMA", "DUAS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
  const tens = ["", "DEZ", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const hundreds = ["", "CEM", "DUZENTAS", "TREZENTAS", "QUATROCENTAS", "QUINHENTAS", "SEISCENTAS", "SETECENTAS", "OITOCENTAS", "NOVECENTAS"];
  const specials: Record<number, string> = {
    11: "ONZE", 12: "DOZE", 13: "TREZE", 14: "QUATORZE", 15: "QUINZE",
    16: "DEZESSEIS", 17: "DEZESSETE", 18: "DEZOITO", 19: "DEZENOVE",
  };
  if (qty === 0) return "ZERO";
  if (qty === 1000) return "UMA MIL";
  if (qty > 1000) {
    const thousands = Math.floor(qty / 1000);
    const remainder = qty % 1000;
    let result = quantityByExtensive(thousands) + " MIL";
    if (remainder > 0) result += " E " + quantityByExtensive(remainder);
    return result;
  }
  const h = Math.floor(qty / 100);
  const t = Math.floor((qty % 100) / 10);
  const u = qty % 10;
  const tu = qty % 100;
  const parts: string[] = [];
  if (h > 0) {
    if (tu === 0 && h === 1) parts.push("CEM");
    else if (h === 1) parts.push("CENTO");
    else parts.push(hundreds[h]);
  }
  if (tu >= 11 && tu <= 19) {
    parts.push(specials[tu]);
  } else {
    if (t > 0) parts.push(tens[t]);
    if (u > 0) parts.push(units[u]);
  }
  return parts.join(" E ");
}

function dateShort(d = new Date()): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function dateLong(d = new Date()): string {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function maturityDate(prazoMeses: number | null, base: Date = new Date()): string {
  const m = prazoMeses ?? 12;
  const dt = new Date(base);
  dt.setMonth(dt.getMonth() + m);
  return dateShort(dt);
}

function serieIndex(s: InvestorSeries): string {
  const idx = s.indexador ?? "";
  const sp = s.spread != null ? `${s.spread.toString().replace(".", ",")}%` : "";
  return [idx, sp].filter(Boolean).join(" + ");
}

interface DocInput {
  boleta: InvestorBoleta;
  dados: BoletaDadosInvestidor;
  series: InvestorSeries;
}

export function generateBoletimHtml({ boleta, dados, series }: DocInput): string {
  const valor = boleta.valor ?? 0;
  const qty = getQuantityDebentures(valor);
  const today = dateShort();
  const idx = serieIndex(series);
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
@page { size: A4; margin: 20mm 25mm; }
body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; margin: 0; padding: 20px; }
h1 { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 4px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
td, th { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; vertical-align: top; }
th { font-weight: bold; text-align: left; background: #f5f5f5; }
.section-title { font-weight: bold; font-size: 10pt; margin: 12px 0 4px; }
.signature-block { text-align: center; margin-top: 30px; }
.signature-line { border-top: 1px solid #000; width: 300px; margin: 40px auto 4px; }
.italic { font-style: italic; }
p { margin: 4px 0; font-size: 10pt; }
</style></head><body>

<h1>BOLETIM DE SUBSCRIÇÃO DE DEBÊNTURES SIMPLES</h1>

<p class="section-title">Emissora</p>
<p>S3 CAPITAL SECURITIZADORA S A</p>

<table>
  <tr><th>Número de cautelas</th><th>Operação</th><th>Data de Subscrição</th><th>CNPJ/MF</th></tr>
  <tr><td class="italic">1</td><td class="italic">Venda</td><td class="italic">${today}</td><td class="italic">60.353.126/0001-71</td></tr>
</table>

<table>
  <tr><th colspan="2">Logradouro</th><th colspan="2">Bairro</th></tr>
  <tr><td colspan="2" class="italic">Avenida Doutor Heitor Nascimento, 196, Sala 76, Bloco A — Edifício Centro Comercial Aliança</td><td colspan="2" class="italic">Morumbi</td></tr>
  <tr><th>CEP</th><th>Cidade</th><th colspan="2">UF</th></tr>
  <tr><td class="italic">13140-729</td><td class="italic">Paulínia</td><td colspan="2" class="italic">SP</td></tr>
</table>

<p class="section-title">Característica da Emissão</p>
<p class="italic">Emissão privada, aprovada pela Assembleia Geral Extraordinária da <strong>EMISSORA</strong> realizada em 28 de Abril de 2025.</p>
<p>Data da Emissão: <span class="italic">05/05/2025</span>. Valor Total da Emissão: <span class="italic">R$ 20.000.000,00 (VINTE MILHÕES DE REAIS)</span>, em 11 (ONZE) séries.</p>
<p>Classe: <span class="italic">Sênior.</span> Série: <span class="italic">${series.nome}</span>. Indexador: <span class="italic">${idx || "—"}</span>. Data Vencimento: <span class="italic">${maturityDate(series.prazo_meses)}</span>.</p>

<table>
  <tr><th>Nome do Adquirente</th><th>CPF/CNPJ</th></tr>
  <tr><td class="italic">${(dados.nome ?? "").toUpperCase()}</td><td class="italic">${dados.cpf_cnpj ?? ""}</td></tr>
  <tr><th>Carteira de Identidade</th><th>Órgão Emissor</th></tr>
  <tr><td class="italic">${dados.rg ?? ""}</td><td class="italic">${dados.orgao_emissor ?? ""}</td></tr>
  <tr><th>Endereço</th><th>Email</th></tr>
  <tr><td class="italic">${dados.endereco ?? ""}, ${dados.numero ?? ""}</td><td class="italic">${dados.email ?? ""}</td></tr>
  <tr><th>Bairro</th><th>Cidade/UF</th></tr>
  <tr><td class="italic">${dados.bairro ?? ""}</td><td class="italic">${dados.cidade ?? ""}/${dados.estado ?? ""}</td></tr>
</table>

<table>
  <tr>
    <th>Preço Unitário</th>
    <th>Qtd. Debêntures Subscritas</th>
    <th>Qtd. Integralizadas</th>
    <th>Valor Total Integralizado</th>
  </tr>
  <tr>
    <td class="italic">R$ 1.000,00</td>
    <td class="italic">${qty}</td>
    <td class="italic">${qty}</td>
    <td class="italic">${fmtCurrency(valor)}</td>
  </tr>
  <tr><th>Forma de Pagamento</th><th colspan="3">Observações</th></tr>
  <tr><td class="italic">PIX</td><td class="italic" colspan="3"></td></tr>
</table>

<p style="margin-top: 16px;">Recebemos a referida integralização no valor acima.</p>

<div class="signature-block">
  <div class="signature-line"></div>
  <p><strong>Luan Aoki Helena Schuwarten</strong></p>
  <p><strong><em>S3 CAPITAL SECURITIZADORA S A</em></strong></p>
</div>

<hr style="margin: 24px 0; border: 0; border-top: 1px solid #000;" />

<p class="italic" style="font-size: 9pt;">
Declaro(amos) para todos os fins que estou(amos) de acordo com as condições expressas no presente recibo; além de ter(mos) recebido uma cópia do instrumento Particular da Escritura da Emissão Privada de Debêntures Simples, celebrada em 5 de Maio de 2025.
</p>

<div class="signature-block">
  <div class="signature-line"></div>
  <p><strong>Subscritor ou Representante Legal</strong></p>
</div>

</body></html>`;
}

export function generateCertificadoHtml({ boleta, dados, series }: DocInput): string {
  const valor = boleta.valor ?? 0;
  const qty = getQuantityDebentures(valor);
  const qtyExt = quantityByExtensive(qty);
  const idx = serieIndex(series);
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><style>
@page { size: A4 landscape; margin: 15mm 20mm; }
body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; margin: 0; padding: 20px; }
.header { text-align: center; margin-bottom: 20px; }
.header h1 { font-size: 13pt; font-weight: bold; margin: 0; }
.header p { font-size: 9pt; margin: 2px 0; }
.center-bold { text-align: center; font-weight: bold; margin: 16px 0 8px; }
.debenture-title { text-align: center; font-weight: bold; font-size: 12pt; margin: 16px 0; }
table { width: 60%; margin: 0 auto; border-collapse: collapse; }
td, th { border: 1px solid #000; padding: 4px 8px; font-size: 10pt; }
th { font-style: italic; }
.main-text { font-style: italic; font-size: 9.5pt; margin: 16px 20px; text-align: justify; }
.pague-se { text-align: center; font-weight: bold; font-size: 10pt; margin: 16px 0; }
.signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
.sig-block { text-align: center; width: 45%; }
.sig-line { border-top: 1px solid #000; margin: 50px auto 4px; width: 280px; }
.sig-name { font-weight: bold; }
.sig-title { font-size: 9pt; font-style: italic; }
</style></head><body>

<div class="header">
  <h1>S3 CAPITAL SECURITIZADORA S A</h1>
  <p>CNPJ/MF: 60.353.126/0001-71</p>
  <p>Avenida Doutor Heitor Nascimento, 196, Sala 76, Bloco A — Edifício Centro Comercial Aliança — Morumbi — Paulínia-SP — CEP: 13140-729</p>
</div>

<p class="center-bold">Prazo de Duração da Sociedade: Indeterminado</p>

<div class="debenture-title">DEBÊNTURES SIMPLES, CLASSE SÊNIOR — ${series.nome.toUpperCase()}</div>

<table>
  <tr><th>Cautela Nº</th><th>Quantidade de Debêntures</th></tr>
  <tr><td style="text-align: center; font-style: italic;">1</td><td style="text-align: center; font-style: italic;">${qty}</td></tr>
</table>

<p class="main-text">
Esta cautela representativa de ${qty} (${qtyExt}) debênture(s), no valor nominal unitário de R$ 1.000,00 (UM MIL REAIS), não conversível(eis) em ação(ões), da emissão privada, série <strong>${series.nome}</strong> (índice ${idx || "—"}), e demais características especificadas na Escritura de Emissão, confere ao titular abaixo os direitos que a Lei e a Escritura de Emissão lhe asseguram.
</p>

<p class="pague-se">PAGUE-SE ESTA(S) DEBÊNTURE(S) A ${(dados.nome ?? "").toUpperCase()}, CPF/CNPJ: ${dados.cpf_cnpj ?? ""}</p>

<p style="text-align: center; font-style: italic; margin: 8px 0;">Paulínia (SP), ${dateLong()}</p>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p>S3 CAPITAL SECURITIZADORA S A</p>
    <p class="sig-title">Diretor Presidente</p>
    <p class="sig-name">Everaldo Fernando Silvério</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p>S3 CAPITAL SECURITIZADORA S A</p>
    <p class="sig-title">Diretor de Relação com Investidores</p>
    <p class="sig-name">Luan Aoki Helena Schuwarten</p>
  </div>
</div>

</body></html>`;
}
