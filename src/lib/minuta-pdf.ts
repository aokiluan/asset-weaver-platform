import jsPDF from "jspdf";

export interface MinutaData {
  cedente: {
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
    setor: string | null;
    faturamento_medio: number | null;
  };
  proposta?: {
    codigo: string;
    valor_aprovado: number | null;
    prazo_dias: number | null;
    taxa_sugerida: number | null;
    finalidade: string | null;
    garantias: string | null;
    decided_at: string | null;
  } | null;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const today = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Gera a minuta padrão de formalização do cedente e dispara o download em PDF.
 * Estrutura inspirada em contrato-padrão de cessão para securitizadoras.
 */
export function generateMinutaPDF(data: MinutaData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeTitle = (text: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, pageW / 2, y, { align: "center" });
    y += 8;
  };

  const writeSection = (text: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(text, margin, y);
    y += 6;
  };

  const writeParagraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureSpace(5.5);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 2;
  };

  const writeKV = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const labelW = doc.getTextWidth(`${label}: `);
    doc.text(`${label}: `, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, maxW - labelW);
    if (lines.length === 0) {
      y += 5.5;
      return;
    }
    doc.text(lines[0], margin + labelW, y);
    y += 5.5;
    for (let i = 1; i < lines.length; i++) {
      ensureSpace(5.5);
      doc.text(lines[i], margin, y);
      y += 5.5;
    }
  };

  // CABEÇALHO
  writeTitle("INSTRUMENTO PARTICULAR DE CONTRATO DE CESSÃO");
  writeTitle("DE DIREITOS CREDITÓRIOS");
  y += 4;

  writeParagraph(
    "Pelo presente instrumento particular, e na melhor forma de direito, as partes adiante qualificadas têm, entre si, justo e acordado o presente Contrato de Cessão de Direitos Creditórios, mediante as cláusulas e condições a seguir estabelecidas.",
  );

  // QUALIFICAÇÃO DA CEDENTE
  writeSection("I — QUALIFICAÇÃO DA CEDENTE");
  const c = data.cedente;
  writeKV("Razão Social", c.razao_social);
  if (c.nome_fantasia) writeKV("Nome Fantasia", c.nome_fantasia);
  writeKV("CNPJ", c.cnpj);
  const enderecoCompleto = [c.endereco, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade ?? c.estado, c.cep ? `CEP ${c.cep}` : null]
    .filter(Boolean)
    .join(", ");
  if (enderecoCompleto) writeKV("Endereço", enderecoCompleto);
  if (c.email) writeKV("E-mail", c.email);
  if (c.telefone) writeKV("Telefone", c.telefone);
  if (c.setor) writeKV("Setor de atuação", c.setor);
  if (c.faturamento_medio != null) writeKV("Faturamento médio", fmtBRL(c.faturamento_medio));
  y += 2;

  // QUALIFICAÇÃO DA CESSIONÁRIA
  writeSection("II — QUALIFICAÇÃO DA CESSIONÁRIA");
  writeParagraph(
    "SECURITIZADORA, sociedade anônima inscrita no CNPJ sob nº [•], com sede em [•], doravante denominada simplesmente CESSIONÁRIA.",
  );

  // OBJETO
  writeSection("III — DO OBJETO");
  writeParagraph(
    "O presente instrumento tem por objeto a cessão, pela CEDENTE em favor da CESSIONÁRIA, de direitos creditórios performados e a performar, originados de operações comerciais regulares da CEDENTE, observados os termos, valores e prazos estabelecidos nas cláusulas seguintes.",
  );

  // CONDIÇÕES APROVADAS
  if (data.proposta) {
    writeSection("IV — CONDIÇÕES APROVADAS PELA ÁREA DE CRÉDITO");
    writeKV("Código da proposta", data.proposta.codigo);
    writeKV("Limite aprovado", fmtBRL(data.proposta.valor_aprovado));
    writeKV("Prazo", data.proposta.prazo_dias ? `${data.proposta.prazo_dias} dias` : "—");
    writeKV(
      "Taxa de desconto",
      data.proposta.taxa_sugerida != null ? `${data.proposta.taxa_sugerida}% ao mês` : "a definir caso a caso",
    );
    if (data.proposta.finalidade) writeKV("Finalidade", data.proposta.finalidade);
    if (data.proposta.garantias) writeKV("Garantias", data.proposta.garantias);
    if (data.proposta.decided_at) {
      writeKV("Aprovado em", new Date(data.proposta.decided_at).toLocaleDateString("pt-BR"));
    }
    y += 2;
  }

  // CLÁUSULAS GERAIS
  writeSection("V — DECLARAÇÕES E OBRIGAÇÕES DA CEDENTE");
  writeParagraph(
    "5.1. A CEDENTE declara, sob as penas da lei, que os direitos creditórios objeto desta cessão são líquidos, certos, exigíveis e livres de qualquer ônus, gravame ou contestação.",
  );
  writeParagraph(
    "5.2. A CEDENTE responde solidariamente pela existência, legitimidade e exigibilidade dos créditos cedidos, bem como pela veracidade das informações prestadas e dos documentos apresentados.",
  );
  writeParagraph(
    "5.3. A CEDENTE compromete-se a manter atualizadas as informações cadastrais e a comunicar à CESSIONÁRIA, por escrito e em até 5 (cinco) dias úteis, qualquer alteração societária, contábil ou financeira relevante.",
  );

  writeSection("VI — DAS CONDIÇÕES GERAIS");
  writeParagraph(
    "6.1. O presente contrato passa a vigorar a partir da data de sua assinatura, por prazo indeterminado, podendo ser denunciado por qualquer das partes mediante aviso prévio de 30 (trinta) dias.",
  );
  writeParagraph(
    "6.2. As partes elegem o foro da comarca da sede da CESSIONÁRIA para dirimir quaisquer dúvidas ou controvérsias oriundas deste instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.",
  );

  // ASSINATURAS
  writeSection("VII — ASSINATURAS");
  writeParagraph(`E, por estarem assim justas e contratadas, as partes firmam o presente instrumento eletronicamente, em ${today()}.`);
  y += 6;

  ensureSpace(40);
  // Linhas de assinatura
  const colW = (maxW - 10) / 2;
  doc.setDrawColor(0);
  doc.line(margin, y + 12, margin + colW, y + 12);
  doc.line(margin + colW + 10, y + 12, margin + maxW, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("CEDENTE", margin + colW / 2, y + 17, { align: "center" });
  doc.text(c.razao_social, margin + colW / 2, y + 21, { align: "center" });
  doc.text(`CNPJ ${c.cnpj}`, margin + colW / 2, y + 25, { align: "center" });
  doc.text("CESSIONÁRIA", margin + colW + 10 + colW / 2, y + 17, { align: "center" });
  doc.text("Securitizadora", margin + colW + 10 + colW / 2, y + 21, { align: "center" });

  // Rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Minuta gerada em ${today()} • Página ${i} de ${total}`,
      pageW / 2,
      pageH - 8,
      { align: "center" },
    );
    doc.setTextColor(0);
  }

  return doc;
}

export function downloadMinutaPDF(data: MinutaData) {
  const doc = generateMinutaPDF(data);
  const safeName = data.cedente.razao_social.replace(/[^\w\s-]+/g, "").trim().replace(/\s+/g, "_");
  doc.save(`minuta_${safeName}_${Date.now()}.pdf`);
}
