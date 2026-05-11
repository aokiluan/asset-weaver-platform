import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

const VOTE_LABEL: Record<string, string> = {
  favoravel: "Favorável",
  desfavoravel: "Desfavorável",
  abstencao: "Abstenção",
};

export interface AtaParticipante {
  nome?: string | null;
  voto: string;
  justificativa?: string | null;
  votou_em?: string | null;
}

export interface AtaPleito {
  valor_solicitado?: number | null;
  prazo_dias?: number | null;
  taxa_sugerida?: number | null;
  limite_global_solicitado?: number | null;
  modalidades?: Record<string, any>;
}

export interface AtaData {
  numero_comite: number;
  realizado_em: string;
  cedente_nome: string;
  cedente_cnpj?: string | null;
  proposta_codigo?: string | null;
  participantes: AtaParticipante[];
  pleito: AtaPleito;
  recomendacao_credito?: string | null;
  pontos_positivos: string[];
  pontos_atencao: string[];
  decisao: "aprovado" | "reprovado";
  totais?: { favoraveis?: number; desfavoraveis?: number; eligible?: number; votaram?: number };
  alcada_nome?: string | null;
  votos_minimos_alcada?: number | null;
  condicoes?: string | null;
}

const slug = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);

export function buildAtaFilename({ numero, cedenteNome, data }: { numero: number; cedenteNome: string; data: string | Date }) {
  const d = typeof data === "string" ? new Date(data) : data;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `ata-comite-${numero}-${slug(cedenteNome) || "cedente"}-${yyyy}-${mm}-${dd}.pdf`;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(0, 128, 255);
  doc.rect(MARGIN, y, CONTENT_W, 6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(text, MARGIN + 2, y + 4.2);
  doc.setTextColor(20);
  return y + 9;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function wrappedText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH = 4.2): number {
  const lines = doc.splitTextToSize(text, maxW);
  for (const ln of lines) {
    y = ensureSpace(doc, y, lineH);
    doc.text(ln, x, y);
    y += lineH;
  }
  return y;
}

export function generateAtaPdf(d: AtaData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${d.numero_comite}º COMITÊ DE CRÉDITO`, MARGIN, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Realizado em ${fmtDateTime(d.realizado_em)}`, MARGIN, 16);

  // Decisão badge
  const decisaoLabel = d.decisao === "aprovado" ? "APROVADO" : "REPROVADO";
  if (d.decisao === "aprovado") doc.setFillColor(34, 197, 94);
  else doc.setFillColor(239, 68, 68);
  const badgeW = 32;
  doc.roundedRect(PAGE_W - MARGIN - badgeW, 6, badgeW, 10, 1.5, 1.5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(decisaoLabel, PAGE_W - MARGIN - badgeW / 2, 12.5, { align: "center" });

  doc.setTextColor(20);
  let y = 28;

  // Cedente
  y = sectionTitle(doc, "CEDENTE", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(d.cedente_nome, MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const meta = [
    d.cedente_cnpj ? `CNPJ: ${d.cedente_cnpj}` : null,
    d.proposta_codigo ? `Proposta: ${d.proposta_codigo}` : null,
    d.alcada_nome ? `Alçada: ${d.alcada_nome}${d.votos_minimos_alcada ? ` (mín. ${d.votos_minimos_alcada})` : ""}` : null,
  ].filter(Boolean).join("   •   ");
  if (meta) doc.text(meta, MARGIN, y);
  y += 8;

  // Pleito
  y = sectionTitle(doc, "PLEITO DE CRÉDITO", y);
  doc.setFontSize(9);
  const pleitoLines: Array<[string, string]> = [
    ["Limite global solicitado", fmtBRL(d.pleito.limite_global_solicitado ?? d.pleito.valor_solicitado ?? null)],
    ["Valor da proposta", fmtBRL(d.pleito.valor_solicitado ?? null)],
    ["Prazo", d.pleito.prazo_dias ? `${d.pleito.prazo_dias} dias` : "—"],
    ["Taxa sugerida", d.pleito.taxa_sugerida != null ? `${d.pleito.taxa_sugerida}% a.m.` : "—"],
  ];
  for (const [k, v] of pleitoLines) {
    y = ensureSpace(doc, y, 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(k, MARGIN, y);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text(v, MARGIN + 70, y);
    y += 5;
  }

  // Modalidades
  const mods = d.pleito.modalidades && typeof d.pleito.modalidades === "object" ? d.pleito.modalidades : {};
  const modList = Object.entries(mods).filter(([, v]: [string, any]) => v && (v.ativo || v.selected || v === true));
  if (modList.length) {
    y += 1;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text("Modalidades", MARGIN, y);
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text(modList.map(([k]) => k).join(", "), MARGIN + 70, y);
    y += 5;
  }
  y += 4;

  // Recomendação do crédito
  if (d.recomendacao_credito) {
    y = ensureSpace(doc, y, 12);
    y = sectionTitle(doc, "RECOMENDAÇÃO DO CRÉDITO", y);
    doc.setFontSize(9);
    y = wrappedText(doc, d.recomendacao_credito, MARGIN, y, CONTENT_W);
    y += 4;
  }

  // Pontos positivos / atenção
  const half = (CONTENT_W - 4) / 2;
  if (d.pontos_positivos.length || d.pontos_atencao.length) {
    y = ensureSpace(doc, y, 30);
    const yStart = y;
    y = sectionTitle(doc, "PONTOS POSITIVOS", y);
    doc.setFontSize(9);
    let yLeft = y;
    for (const p of d.pontos_positivos) {
      yLeft = ensureSpace(doc, yLeft, 4.5);
      yLeft = wrappedText(doc, `• ${p}`, MARGIN, yLeft, half);
    }
    if (!d.pontos_positivos.length) { doc.setTextColor(140); doc.text("—", MARGIN, yLeft); doc.setTextColor(20); yLeft += 4; }

    let yRight = sectionTitle(doc, "PONTOS DE ATENÇÃO", yStart);
    yRight = yStart + 9;
    // redraw on right column
    doc.setFillColor(217, 119, 6);
    doc.rect(MARGIN + half + 4, yStart, half, 6, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PONTOS DE ATENÇÃO", MARGIN + half + 6, yStart + 4.2);
    doc.setTextColor(20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    yRight = yStart + 9;
    for (const p of d.pontos_atencao) {
      yRight = ensureSpace(doc, yRight, 4.5);
      const lines = doc.splitTextToSize(`• ${p}`, half);
      for (const ln of lines) { doc.text(ln, MARGIN + half + 6, yRight); yRight += 4.2; }
    }
    if (!d.pontos_atencao.length) { doc.setTextColor(140); doc.text("—", MARGIN + half + 6, yRight); doc.setTextColor(20); yRight += 4; }

    y = Math.max(yLeft, yRight) + 4;
  }

  // Participantes / votos
  y = ensureSpace(doc, y, 16);
  y = sectionTitle(doc, "VOTAÇÃO", y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Membro", MARGIN, y);
  doc.text("Voto", MARGIN + 90, y);
  doc.text("Data", MARGIN + 130, y);
  y += 4;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  for (const p of d.participantes) {
    y = ensureSpace(doc, y, 7);
    doc.text(p.nome ?? "Membro do comitê", MARGIN, y);
    const lbl = VOTE_LABEL[p.voto] ?? p.voto;
    if (p.voto === "favoravel") doc.setTextColor(22, 163, 74);
    else if (p.voto === "desfavoravel") doc.setTextColor(220, 38, 38);
    else doc.setTextColor(120);
    doc.text(lbl, MARGIN + 90, y);
    doc.setTextColor(20);
    doc.text(p.votou_em ? fmtDateTime(p.votou_em) : "—", MARGIN + 130, y);
    y += 4.5;
    if (p.justificativa) {
      doc.setTextColor(110);
      y = wrappedText(doc, `↳ ${p.justificativa}`, MARGIN + 4, y, CONTENT_W - 4, 4);
      doc.setTextColor(20);
      y += 1;
    }
  }
  if (!d.participantes.length) {
    doc.setTextColor(140);
    doc.text("Nenhum voto registrado.", MARGIN, y);
    doc.setTextColor(20);
    y += 5;
  }

  // Totais
  y += 2;
  y = ensureSpace(doc, y, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const t = d.totais ?? {};
  doc.text(
    `Total: ${t.votaram ?? d.participantes.length} voto(s)   •   Favoráveis: ${t.favoraveis ?? "—"}   •   Desfavoráveis: ${t.desfavoraveis ?? "—"}`,
    MARGIN, y
  );
  y += 8;

  // Condições
  if (d.condicoes && d.condicoes.trim()) {
    y = ensureSpace(doc, y, 14);
    y = sectionTitle(doc, "CONDIÇÕES E OBSERVAÇÕES", y);
    doc.setFontSize(9);
    y = wrappedText(doc, d.condicoes, MARGIN, y, CONTENT_W);
  }

  // Footer em todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `Ata gerada em ${new Date().toLocaleString("pt-BR")}   —   Página ${i} de ${total}`,
      PAGE_W / 2, PAGE_H - 8, { align: "center" }
    );
  }

  return doc;
}

/** Carrega ata por id e gera + baixa o PDF. */
export async function downloadAtaById(minuteId: string) {
  const { data: minute, error } = await supabase
    .from("committee_minutes")
    .select("*, cedentes!inner(razao_social, cnpj), credit_proposals(codigo)")
    .eq("id", minuteId)
    .maybeSingle();
  if (error || !minute) throw new Error(error?.message ?? "Ata não encontrada");

  const data: AtaData = {
    numero_comite: minute.numero_comite,
    realizado_em: minute.realizado_em,
    cedente_nome: (minute as any).cedentes?.razao_social ?? "Cedente",
    cedente_cnpj: (minute as any).cedentes?.cnpj ?? null,
    proposta_codigo: (minute as any).credit_proposals?.codigo ?? null,
    participantes: (minute.participantes as any) ?? [],
    pleito: (minute.pleito as any) ?? {},
    recomendacao_credito: minute.recomendacao_credito,
    pontos_positivos: ((minute.pontos_positivos as any) ?? []).filter(Boolean),
    pontos_atencao: ((minute.pontos_atencao as any) ?? []).filter(Boolean),
    decisao: minute.decisao as "aprovado" | "reprovado",
    totais: (minute.totais as any) ?? {},
    alcada_nome: minute.alcada_nome,
    votos_minimos_alcada: minute.votos_minimos_alcada,
    condicoes: minute.condicoes,
  };

  const doc = generateAtaPdf(data);
  doc.save(buildAtaFilename({
    numero: data.numero_comite,
    cedenteNome: data.cedente_nome,
    data: data.realizado_em,
  }));
}
