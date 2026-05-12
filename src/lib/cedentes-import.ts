import * as XLSX from "xlsx";

export const CEDENTE_FIELDS = [
  { key: "razao_social", label: "Razão social", required: true },
  { key: "cnpj", label: "CNPJ", required: true },
  { key: "nome_fantasia", label: "Nome fantasia" },
  { key: "capital_social", label: "Capital social" },
  { key: "natureza_juridica", label: "Natureza jurídica" },
  { key: "data_abertura", label: "Data de abertura" },
  { key: "situacao_cadastral", label: "Situação cadastral" },
  { key: "setor", label: "Setor" },
  { key: "faturamento_medio", label: "Faturamento médio" },
  { key: "cep", label: "CEP" },
  { key: "logradouro", label: "Logradouro" },
  { key: "numero", label: "Número" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado (UF)" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "observacoes", label: "Observações" },
] as const;

export type CedenteFieldKey = typeof CEDENTE_FIELDS[number]["key"];

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
  capital_social: "capital_social", capital: "capital_social",
  natureza_juridica: "natureza_juridica", natureza: "natureza_juridica",
  data_abertura: "data_abertura", data_de_abertura: "data_abertura", abertura: "data_abertura",
  situacao_cadastral: "situacao_cadastral", situacao: "situacao_cadastral",
  setor: "setor", segmento: "setor",
  faturamento_medio: "faturamento_medio", faturamento: "faturamento_medio",
  cep: "cep",
  logradouro: "logradouro", endereco: "logradouro", rua: "logradouro",
  numero: "numero", num: "numero", n: "numero",
  bairro: "bairro",
  cidade: "cidade", municipio: "cidade",
  estado: "estado", uf: "estado",
  telefone: "telefone", fone: "telefone", celular: "telefone",
  email: "email", e_mail: "email",
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

export function cleanCEP(v: any): string {
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

// Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e número serial Excel
export function parseDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel epoch: 1899-12-30
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = v.toString().trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yy = m[3];
    if (yy.length === 2) yy = (Number(yy) > 50 ? "19" : "20") + yy;
    return `${yy}-${mm}-${dd}`;
  }
  return null;
}

export type ParsedRow = {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: Partial<Record<CedenteFieldKey, any>> & { endereco?: string | null };
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
    const mapped: ParsedRow["mapped"] = {};
    const raw: Record<string, any> = {};
    Object.entries(mapping).forEach(([colIdx, field]) => {
      if (!field) return;
      const value = row[Number(colIdx)];
      raw[field] = value;
      if (value === "" || value == null) return;
      if (field === "faturamento_medio" || field === "capital_social") {
        mapped[field] = parseNumber(value);
      } else if (field === "cnpj") {
        mapped[field] = cleanCNPJ(value);
      } else if (field === "cep") {
        mapped[field] = cleanCEP(value);
      } else if (field === "estado") {
        mapped[field] = value.toString().trim().toUpperCase().slice(0, 2);
      } else if (field === "data_abertura") {
        mapped[field] = parseDate(value);
      } else {
        mapped[field] = value.toString().trim();
      }
    });

    // Compatibilidade: duplica logradouro em endereco
    if (mapped.logradouro) mapped.endereco = mapped.logradouro;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mapped.razao_social) errors.push("Razão social obrigatória");
    if (!mapped.cnpj) errors.push("CNPJ obrigatório");
    else if (!isValidCNPJ(mapped.cnpj as string)) errors.push("CNPJ inválido");

    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email as string)) {
      errors.push("E-mail inválido");
    }
    if (raw.data_abertura && !mapped.data_abertura) warnings.push("Data de abertura inválida — ignorada");
    if (mapped.cep && (mapped.cep as string).length !== 8) warnings.push("CEP inválido — ignorado");
    if (mapped.estado && (mapped.estado as string).length !== 2) warnings.push("UF inválida");

    if (mapped.cnpj && errors.length === 0) {
      const c = mapped.cnpj as string;
      if (existingCnpjs.has(c)) warnings.push("CNPJ já existe na base — será ignorado");
      else if (seen.has(c)) warnings.push("CNPJ duplicado na planilha — será ignorado");
      else seen.add(c);
    }

    // Remove campos com valores nulos resultantes de parsing
    if (mapped.cep && (mapped.cep as string).length !== 8) delete mapped.cep;
    if (raw.data_abertura && !mapped.data_abertura) delete mapped.data_abertura;

    const isDuplicate = warnings.some((w) => w.includes("será ignorado"));
    const status: ParsedRow["status"] = errors.length > 0
      ? "error"
      : isDuplicate
      ? "warning"
      : "valid"; // warnings não-duplicadas ainda são importáveis
    return { rowIndex: idx + 2, raw, mapped, errors, warnings, status };
  });
}

export function buildTemplateXlsx(): Blob {
  const headers = CEDENTE_FIELDS.map((f) => f.key);
  const example = [
    "ACME Comércio LTDA",
    "12.345.678/0001-90",
    "ACME",
    "100000",
    "Sociedade Limitada",
    "2015-03-21",
    "ATIVA",
    "Comércio",
    "50000",
    "01310-100",
    "Av. Paulista",
    "1000",
    "Bela Vista",
    "São Paulo",
    "SP",
    "(11) 99999-0000",
    "contato@acme.com.br",
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
