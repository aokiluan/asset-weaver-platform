// Padronização global de nomes de documentos do dossiê.
// Padrão: aaaa.mm.dd_categoria_cedenteAbreviado_vNN.ext
// Ex.: 2026.05.12_contrato-social_abc-manut_v01.pdf

const STOPWORDS = new Set([
  "ltda", "sa", "s/a", "me", "epp", "eireli", "cia", "comercio", "comércio",
  "industria", "indústria", "servicos", "serviços", "do", "da", "de", "dos",
  "das", "e", "the", "and",
]);

export function slugify(input: string, max = 40): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
}

export function abreviarRazaoSocial(razao: string, max = 18): string {
  if (!razao) return "cedente";
  const palavras = razao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.replace(/[^\w]/g, "")));

  const sel = palavras.slice(0, 2).join("-");
  return slugify(sel || razao, max);
}

export function getExt(name: string): string {
  const m = name.match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : "";
}

export function dateStrYMD(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

export interface BuildNameInput {
  /** Nome original do arquivo (para extrair extensão). */
  originalName: string;
  /** Nome da categoria (será slugificado). Use "outros" para anexo livre. */
  categoria: string;
  /** Razão social do cedente. */
  cedente: string;
  /** Número de versão (1-based). */
  versao: number;
  /** Data — default = hoje. */
  data?: Date;
  /** Descrição curta opcional, incorporada ao nome entre cedente e versão. */
  descricao?: string;
}

export function buildDocumentoFileName(p: BuildNameInput): string {
  const ext = getExt(p.originalName);
  const cat = slugify(p.categoria || "outros", 30);
  const ced = abreviarRazaoSocial(p.cedente);
  const v = `v${String(Math.max(1, p.versao)).padStart(2, "0")}`;
  const date = dateStrYMD(p.data ?? new Date());
  const desc = p.descricao ? slugify(p.descricao, 24) : "";
  const base = desc
    ? `${date}_${cat}_${ced}_${desc}_${v}`
    : `${date}_${cat}_${ced}_${v}`;
  return ext ? `${base}.${ext}` : base;
}
