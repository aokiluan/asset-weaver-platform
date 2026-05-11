import type jsPDF from "jspdf";
import s3BrandUrl from "@/assets/s3-logo-brand.png";
import s3HorizontalUrl from "@/assets/s3-logo-horizontal.png";
import s3HorizontalWhiteUrl from "@/assets/s3-logo-horizontal-white.png";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let cachedBrand: string | null = null;
let cachedHorizontal: string | null = null;
let cachedHorizontalWhite: string | null = null;

export async function loadS3Brand(): Promise<string | null> {
  if (!cachedBrand) cachedBrand = await urlToDataUrl(s3BrandUrl);
  return cachedBrand;
}
export async function loadS3Horizontal(variant: "color" | "white" = "color"): Promise<string | null> {
  if (variant === "white") {
    if (!cachedHorizontalWhite) cachedHorizontalWhite = await urlToDataUrl(s3HorizontalWhiteUrl);
    return cachedHorizontalWhite;
  }
  if (!cachedHorizontal) cachedHorizontal = await urlToDataUrl(s3HorizontalUrl);
  return cachedHorizontal;
}

// Conversion: 1 mm = 2.83465 pt
const MM_TO_PT = 2.83465;
const toUnit = (mm: number, unit: "mm" | "pt") => (unit === "pt" ? mm * MM_TO_PT : mm);

export interface BrandingOptions {
  unit?: "mm" | "pt";
  variant?: "color" | "white";
  /** Logo width in mm (will be converted to doc unit). Default 38mm. */
  headerWidthMm?: number;
  /** Watermark width in mm. Default 90mm. */
  watermarkWidthMm?: number;
  watermarkOpacity?: number;
  /** Top offset in mm for the header logo (from page top). Default 8mm. */
  headerTopMm?: number;
  /** Right margin in mm for the header logo. Default 15mm (or 20mm depending on doc). */
  headerRightMm?: number;
  /** Apply header on every page (default false = only page 1). */
  headerOnAllPages?: boolean;
}

/** Marca d'água com o brasão S3, centralizada, opacidade baixa, em todas as páginas. */
export async function applyS3Watermark(doc: jsPDF, opts: BrandingOptions = {}) {
  const dataUrl = await loadS3Brand();
  if (!dataUrl) return;
  const unit = opts.unit ?? "mm";
  const opacity = opts.watermarkOpacity ?? 0.06;
  const wmWmm = opts.watermarkWidthMm ?? 90;
  // proporção brasão ~509x716 ⇒ h/w ≈ 1.406
  const wmHmm = wmWmm * (716 / 509);
  const w = toUnit(wmWmm, unit);
  const h = toUnit(wmHmm, unit);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  const total = doc.getNumberOfPages();
  const anyDoc = doc as any;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    let gs: any = null;
    if (typeof anyDoc.GState === "function" && typeof anyDoc.setGState === "function") {
      gs = new anyDoc.GState({ opacity });
      anyDoc.setGState(gs);
    }
    try {
      doc.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST");
    } catch { /* ignore */ }
    if (gs && typeof anyDoc.setGState === "function") {
      anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
    }
  }
}

/** Logo horizontal S3 no canto superior direito. Default só na pág. 1. */
export async function applyS3HeaderLogo(doc: jsPDF, opts: BrandingOptions = {}) {
  const variant = opts.variant ?? "color";
  const dataUrl = await loadS3Horizontal(variant);
  if (!dataUrl) return;
  const unit = opts.unit ?? "mm";
  const wMm = opts.headerWidthMm ?? 38;
  // proporção 1920x800 ⇒ h/w = 0.4167
  const hMm = wMm * (800 / 1920);
  const rightMm = opts.headerRightMm ?? 15;
  const topMm = opts.headerTopMm ?? 8;
  const w = toUnit(wMm, unit);
  const h = toUnit(hMm, unit);
  const right = toUnit(rightMm, unit);
  const top = toUnit(topMm, unit);
  const pageW = doc.internal.pageSize.getWidth();
  const x = pageW - right - w;
  const total = doc.getNumberOfPages();
  const pages = opts.headerOnAllPages ? Array.from({ length: total }, (_, i) => i + 1) : [1];
  for (const p of pages) {
    doc.setPage(p);
    try {
      doc.addImage(dataUrl, "PNG", x, top, w, h, undefined, "FAST");
    } catch { /* ignore */ }
  }
}

/** Aplica header (pág. 1) + watermark (todas as páginas). Chame APÓS gerar todo o conteúdo. */
export async function applyS3Branding(doc: jsPDF, opts: BrandingOptions = {}) {
  await applyS3HeaderLogo(doc, opts);
  await applyS3Watermark(doc, opts);
}
