import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { applyS3Branding } from "./pdf-branding";


export interface VisitReportSnapshot {
  data_visita?: string | null;
  tipo_visita?: string | null;
  visitante?: string | null;
  entrevistado_nome?: string | null;
  entrevistado_cargo?: string | null;
  entrevistado_cpf?: string | null;
  entrevistado_telefone?: string | null;
  entrevistado_email?: string | null;
  ramo_atividade?: string | null;
  faturamento_mensal?: any;
  principais_produtos?: string | null;
  qtd_funcionarios?: any;
  pct_vendas_pf?: any;
  pct_vendas_pj?: any;
  pct_vendas_boleto?: any;
  pct_vendas_cartao?: any;
  pct_fat_debito?: any;
  pct_vendas_cheque?: any;
  pct_vendas_outros?: any;
  parceiros_financeiros?: string | null;
  empresas_ligadas?: any[];
  limite_global_solicitado?: any;
  modalidades?: Record<string, any>;
  avalistas_solidarios?: any[];
  parecer_comercial?: string | null;
  pontos_atencao?: string | null;
  fotos?: { path: string; name: string }[];
}

export async function generateVisitReportPdf(
  snapshot: VisitReportSnapshot,
  cedenteId: string,
  versaoLabel?: string,
  mode: "download" | "blob" = "download",
): Promise<{ blob: Blob; url: string } | void> {
  const { data: ced } = await supabase
    .from("cedentes")
    .select("razao_social, nome_fantasia, cnpj")
    .eq("id", cedenteId)
    .maybeSingle();

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };
  const h1 = (t: string) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(t, margin, y); y += 18;
    doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 10;
  };
  const h2 = (t: string) => {
    ensureSpace(20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(t, margin, y); y += 14;
  };
  const kv = (k: string, v: any) => {
    if (v === null || v === undefined || v === "") return;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    const klabel = `${k}: `;
    const kw = doc.getTextWidth(klabel);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(v), pageW - margin * 2 - kw);
    ensureSpace(lines.length * 12 + 2);
    doc.setFont("helvetica", "bold"); doc.text(klabel, margin, y);
    doc.setFont("helvetica", "normal"); doc.text(lines, margin + kw, y);
    y += lines.length * 12 + 2;
  };
  const para = (t: string) => {
    if (!t) return;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(t, pageW - margin * 2);
    ensureSpace(lines.length * 12 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  };

  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Relatório Comercial de Visita", margin, y); y += 22;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}${versaoLabel ? ` — ${versaoLabel}` : ""}`, margin, y); y += 16;

  h1("Cedente");
  kv("Razão social", ced?.razao_social);
  kv("Nome fantasia", ced?.nome_fantasia);
  kv("CNPJ", ced?.cnpj);

  h1("1. Dados da visita");
  kv("Data", snapshot.data_visita);
  kv("Tipo", snapshot.tipo_visita);
  kv("Visitante", snapshot.visitante);
  kv("Entrevistado", snapshot.entrevistado_nome);
  kv("Cargo", snapshot.entrevistado_cargo);
  kv("CPF", snapshot.entrevistado_cpf);
  kv("Telefone", snapshot.entrevistado_telefone);
  kv("E-mail", snapshot.entrevistado_email);

  h1("2. Negócio");
  kv("Ramo de atividade", snapshot.ramo_atividade);
  kv("Faturamento mensal", snapshot.faturamento_mensal);
  kv("Principais produtos", snapshot.principais_produtos);
  kv("Funcionários", snapshot.qtd_funcionarios);
  h2("Distribuição de vendas (%)");
  kv("PF", snapshot.pct_vendas_pf);
  kv("PJ", snapshot.pct_vendas_pj);
  h2("Forma de faturamento (%)");
  kv("Boleto", snapshot.pct_vendas_boleto);
  kv("Cartão", snapshot.pct_vendas_cartao);
  kv("Débito em conta", snapshot.pct_fat_debito);
  kv("Cheque", snapshot.pct_vendas_cheque);
  kv("Outros", snapshot.pct_vendas_outros);

  h1("3. Adicionais");
  kv("Parceiros financeiros", snapshot.parceiros_financeiros);
  const empresas = snapshot.empresas_ligadas || [];
  if (empresas.length) {
    h2("Empresas ligadas");
    empresas.forEach((e: any, i: number) => {
      para(`${i + 1}. ${e.nome || "-"} | CNPJ: ${e.cnpj || "-"} | Relação: ${e.relacao || "-"}`);
    });
  }

  h1("4. Pleito");
  kv("Limite global solicitado", snapshot.limite_global_solicitado);
  const modLabels: Record<string, string> = {
    desconto_convencional: "Desconto convencional",
    comissaria: "Comissária",
    comissaria_escrow: "Comissária com conta escrow",
    nota_comercial: "Nota comercial",
  };
  h2("Modalidades operacionais");
  Object.entries(snapshot.modalidades || {}).forEach(([k, m]: any) => {
    if (!m?.ativo) return;
    para(`• ${modLabels[k] || k} — Limite: ${m.limite || "-"} | Prazo: ${m.prazo_medio || "-"} dias | Taxa: ${m.taxa || "-"}% a.m.${m.observacao ? ` | Obs: ${m.observacao}` : ""}`);
  });
  const avalistas = snapshot.avalistas_solidarios || [];
  if (avalistas.length) {
    h2("Avalistas solidários");
    avalistas.forEach((a: any, i: number) => para(`${i + 1}. ${a.nome || "-"} — CPF: ${a.cpf || "-"}`));
  }

  h1("5. Parecer comercial");
  para(snapshot.parecer_comercial || "-");
  if (snapshot.pontos_atencao) { h2("Pontos de atenção"); para(snapshot.pontos_atencao); }

  const fotos = snapshot.fotos || [];
  if (fotos.length) {
    for (const foto of fotos) {
      try {
        const { data: signed } = await supabase.storage.from("cedente-docs").createSignedUrl(foto.path, 300);
        if (!signed?.signedUrl) continue;
        const resp = await fetch(signed.signedUrl);
        const blob = await resp.blob();
        const dataUrl: string = await new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = dataUrl;
        });
        doc.addPage(); y = margin;
        doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(foto.name, margin, y); y += 14;
        const maxW = pageW - margin * 2;
        const maxH = pageH - y - margin;
        const ratio = Math.min(maxW / img.width, maxH / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, fmt, margin, y, w, h);
      } catch { /* ignore foto erro */ }
    }
  }

  const versaoSuffix = versaoLabel ? `_${versaoLabel.replace(/[^\w]+/g, "-").toLowerCase()}` : "";
  const fileName = `relatorio-comercial_${(ced?.razao_social || "cedente").replace(/[^\w]+/g, "-").toLowerCase()}_${snapshot.data_visita || new Date().toISOString().slice(0, 10)}${versaoSuffix}.pdf`;
  if (mode === "blob") {
    const blob = doc.output("blob");
    return { blob, url: URL.createObjectURL(blob) };
  }
  doc.save(fileName);
}
