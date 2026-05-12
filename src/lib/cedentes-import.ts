import * as XLSX from "xlsx";

export type CedenteStatus = "prospect" | "em_analise" | "aprovado" | "reprovado" | "inativo";

export const CEDENTE_FIELDS = [
  { key: "razao_social", label: "Razão social", required: true },
  { key: "cnpj", label: "CNPJ", required: true },
  { key: "nome_fantasia", label: "Nome fantasia" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado (UF)" },
  { key: "setor", label: "Setor" },
  { key: "status", label: "Status" },
  { key: "limite_aprovado", label: "Limite aprovado" },
  { key: "faturamento_medio", label: "Faturamento médio" },
  { key: "observacoes", label: "Observações" },
] as const;

export type CedenteFieldKey = typeof CEDENTE_FIELDS[number]["key"];

export const VALID_STATUS: CedenteStatus[] = ["prospect", "em_analise", "aprovado", "reprovado", "inativo"];

const STATUS_ALIASES: Record<string, CedenteStatus> = {
  "prospect": "prospect",
  "prospecto": "prospect",
  "em analise": "em_analise",
  "em análise": "em_analise",
  "em_analise": "em_analise",
  "analise": "em_analise",
  "análise": "em_analise",
  "aprovado": "aprovado",
  "reprovado": "reprovado",
  "inativo": "inativo",
};

export function normalizeHeader(h: string): string {
  return h
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_TO_FIELD: Record<string, CedenteFieldKey> = {
  razao_social: "razao_social", razao: "razao_social", nome: "razao_social",
  cnpj: "cnpj",
  nome_fantasia: "nome_fantasia", fantasia: "nome_fantasia",
  email: "email", e_mail: "email",
  telefone: "telefone", fone: "telefone", celular: "telefone",
  endereco: "endereco", logradouro: "endereco",
  cidade: "cidade", municipio: "cidade",
  estado: "estado", uf: "estado",
  setor: "setor", segmento: "setor",
  status: "status", situacao: "status",
  limite_aprovado: "limite_aprovado", limite: "limite_aprovado",
  faturamento_medio: "faturamento_medio", faturamento: "faturamento_medio",
  observacoes: "observacoes", obs: "observacoes", observacao: "observacoes",
};

export function autoMapColumns(headers: string[]): Record<number, CedenteFieldKey | "">  {
  const map: Record<number, CedenteFieldKey | ""> = {};
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h);
    map[i] = HEADER_TO_FIELD[norm] ?? "";
  });
  return map;
}

export function cleanCNPJ(v: string): string {
  return (v ?? "").toString().replace(/\D/g, "");
}

export function isValidCNPJ(raw: string): boolean {
  const c = cleanCNPJ(raw);
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string) => {
    let sum = 0;
    const weights = base.length === 12
      ? [5,4,3,2,9,8,7,6,5,4,3,2]
      : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return d1 === parseInt(c[12], 10) && d2 === parseInt(c[13], 10);
}

export function parseNumber(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = v.toString().trim()
    .replace(/[R$\s]/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseStatus(v: any): CedenteStatus | null {
  if (!v) return "prospect";
  const norm = v.toString().trim().toLowerCase();
  return STATUS_ALIASES[norm] ?? null;
}

export type ParsedRow = {
  rowIndex: number; // origem na planilha (1-indexed, sem header)
  raw: Record<string, any>;
  mapped: Partial<Record<CedenteFieldKey, any>>;
  errors: string[];
  warnings: string[];
  status: "valid" | "warning" | "error";
};

export type SheetData = {
  headers: string[];
  rows: any[][];
};

export async function parseFile(file: File): Promise<SheetData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: "", raw: false });
  const filtered = json.filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null));
  if (filtered.length === 0) return { headers: [], rows: [] };
  const headers = (filtered[0] as any[]).map((h) => h?.toString() ?? "");
  const rows = filtered.slice(1) as any[][];
  return { headers, rows };
}

export function validateRows(
  data: SheetData,
  mapping: Record<number, CedenteFieldKey | "">,
  existingCnpjs: Set<string>,
): ParsedRow[] {
  const seen = new Set<string>();
  return data.rows.map((row, idx) => {
    const mapped: Partial<Record<CedenteFieldKey, any>> = {};
    const raw: Record<string, any> = {};
    Object.entries(mapping).forEach(([colIdx, field]) => {
      if (!field) return;
      const value = row[Number(colIdx)];
      raw[field] = value;
      if (value === "" || value == null) return;
      if (field === "limite_aprovado" || field === "faturamento_medio") {
        mapped[field] = parseNumber(value);
      } else if (field === "status") {
        mapped[field] = parseStatus(value);
      } else if (field === "cnpj") {
        mapped[field] = cleanCNPJ(value);
      } else if (field === "estado") {
        mapped[field] = value.toString().trim().toUpperCase().slice(0, 2);
      } else {
        mapped[field] = value.toString().trim();
      }
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mapped.razao_social) errors.push("Razão social obrigatória");
    if (!mapped.cnpj) errors.push("CNPJ obrigatório");
    else if (!isValidCNPJ(mapped.cnpj as string)) errors.push("CNPJ inválido");

    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email as string)) {
      errors.push("E-mail inválido");
    }
    if (raw.status && !mapped.status) errors.push("Status inválido");

    if (mapped.cnpj && errors.length === 0) {
      const c = mapped.cnpj as string;
      if (existingCnpjs.has(c)) warnings.push("CNPJ já existe na base — será ignorado");
      else if (seen.has(c)) warnings.push("CNPJ duplicado na planilha — será ignorado");
      else seen.add(c);
    }

    const status: ParsedRow["status"] = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";
    return { rowIndex: idx + 2, raw, mapped, errors, warnings, status };
  });
}

export function buildTemplateXlsx(): Blob {
  const headers = CEDENTE_FIELDS.map((f) => f.key);
  const example = [
    "ACME Comércio LTDA",
    "12.345.678/0001-90",
    "ACME",
    "contato@acme.com.br",
    "(11) 99999-0000",
    "Rua Exemplo, 123",
    "São Paulo",
    "SP",
    "Comércio",
    "prospect",
    "100000",
    "50000",
    "Cliente indicado por parceiro",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cedentes");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function exportErrorsCsv(rows: ParsedRow[]): Blob {
  const headers = ["linha", "razao_social", "cnpj", "erros"];
  const lines = [headers.join(",")];
  rows.filter((r) => r.status === "error").forEach((r) => {
    const cells = [
      r.rowIndex,
      JSON.stringify(r.raw.razao_social ?? ""),
      JSON.stringify(r.raw.cnpj ?? ""),
      JSON.stringify(r.errors.join("; ")),
    ];
    lines.push(cells.join(","));
  });
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
}
