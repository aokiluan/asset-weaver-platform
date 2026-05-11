import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { applyS3Branding, applyS3HeaderLogo } from "./pdf-branding";
import {
  SECTION_ORDER,
  SECTION_LABEL,
  SECTION_FIELDS,
  SectionKey,
  RECOMENDACAO_OPTIONS,
} from "./credit-report";


interface Attachment { path: string; name: string; caption?: string }

const MARGIN = 15;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

async function fetchSignedImage(path: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const { data } = await supabase.storage.from("report-files").createSignedUrl(path, 600);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dim.w, h: dim.h };
  } catch {
    return null;
  }
}

function fmtVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return String(v);
  return String(v);
}

export async function generateCreditReportPdf(
  report: any,
  cedenteNome?: string,
  mode: "download" | "blob" = "download",
): Promise<{ blob: Blob; url: string } | void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureSpace = (h: number) => {
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeWrapped = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
    const { size = 10, bold = false, color = [30, 30, 30] } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    for (const line of lines) {
      ensureSpace(size * 0.5);
      doc.text(line, MARGIN, y);
      y += size * 0.45;
    }
  };

  const hr = () => {
    ensureSpace(2);
    doc.setDrawColor(220);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 3;
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Relatório de análise de crédito", MARGIN, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(cedenteNome ?? "", MARGIN, 18);
  doc.text(new Date().toLocaleDateString("pt-BR"), PAGE_W - MARGIN, 18, { align: "right" });
  y = 30;

  // Sections
  for (const key of SECTION_ORDER) {
    const sectionData = report?.[key] ?? {};
    const fields = SECTION_FIELDS[key as SectionKey];

    ensureSpace(10);
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y - 4, CONTENT_W, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(SECTION_LABEL[key as SectionKey], MARGIN + 2, y + 1);
    y += 6;

    for (const f of fields) {
      const val = sectionData[f.key];
      writeWrapped(f.label, { size: 9, bold: true, color: [71, 85, 105] });
      writeWrapped(fmtVal(val), { size: 10 });
      y += 1;

      // Attachments for this field
      const atts: Attachment[] = sectionData?.__attachments?.[f.key] ?? [];
      for (const att of atts) {
        const img = await fetchSignedImage(att.path);
        if (!img) continue;
        const maxW = CONTENT_W;
        const maxH = 90;
        const ratio = img.w / img.h;
        let w = maxW;
        let h = w / ratio;
        if (h > maxH) { h = maxH; w = h * ratio; }
        ensureSpace(h + 6);
        try {
          doc.addImage(img.dataUrl, "PNG", MARGIN, y, w, h);
        } catch {}
        y += h + 1;
        if (att.caption || att.name) {
          writeWrapped(att.caption ?? att.name, { size: 8, color: [100, 116, 139] });
        }
        y += 2;
      }
      y += 2;
    }
    hr();
  }

  // Pareceres / conclusão
  const blocks: Array<[string, string | null | undefined]> = [
    ["Parecer analista de crédito", report?.parecer_analista],
    ["Pontos positivos", report?.pontos_positivos],
    ["Pontos de atenção", report?.pontos_atencao],
    ["Conclusão", report?.conclusao],
  ];

  ensureSpace(10);
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Pareceres e conclusão", MARGIN + 2, y + 1);
  y += 6;

  for (const [label, val] of blocks) {
    writeWrapped(label, { size: 9, bold: true, color: [71, 85, 105] });
    writeWrapped(fmtVal(val), { size: 10 });
    y += 3;
  }

  if (report?.recomendacao) {
    const opt = RECOMENDACAO_OPTIONS.find((o) => o.value === report.recomendacao);
    writeWrapped("Recomendação final", { size: 9, bold: true, color: [71, 85, 105] });
    writeWrapped(opt?.label ?? report.recomendacao, { size: 11, bold: true });
  }

  // Footer with page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const filename = `relatorio-credito-${(cedenteNome ?? "cedente").replace(/\s+/g, "-").toLowerCase()}.pdf`;
  if (mode === "blob") {
    const blob = doc.output("blob");
    return { blob, url: URL.createObjectURL(blob) };
  }
  doc.save(filename);
}
