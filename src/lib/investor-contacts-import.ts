import * as XLSX from "xlsx";
import {
  INVESTOR_TYPES,
  INVESTOR_TYPE_LABEL,
  STAGE_LABEL,
  STAGE_ORDER,
  type InvestorStage,
  type InvestorType,
} from "@/lib/investor-contacts";

export const IMPORT_FIELDS = [
  { key: "contact_name", label: "Nome do contato", required: true },
  { key: "phone", label: "Telefone" },
  { key: "ticket", label: "Ticket (R$)" },
  { key: "type", label: "Tipo" },
  { key: "stage", label: "Estágio" },
  { key: "notes", label: "Notas" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

function normHeader(h: string): string {
  return (h ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_TO_FIELD: Record<string, ImportFieldKey> = {
  contact_name: "contact_name",
  nome: "contact_name",
  nome_do_contato: "contact_name",
  contato: "contact_name",
  phone: "phone",
  telefone: "phone",
  fone: "phone",
  celular: "phone",
  ticket: "ticket",
  ticket_r: "ticket",
  valor: "ticket",
  type: "type",
  tipo: "type",
  stage: "stage",
  estagio: "stage",
  etapa: "stage",
  notes: "notes",
  notas: "notes",
  observacoes: "notes",
  obs: "notes",
};

export function autoMapColumns(headers: string[]): Record<number, ImportFieldKey | ""> {
  const map: Record<number, ImportFieldKey | ""> = {};
  headers.forEach((h, i) => {
    map[i] = HEADER_TO_FIELD[normHeader(h)] ?? "";
  });
  return map;
}

export function parseNumber(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = v
    .toString()
    .trim()
    .replace(/[R$\s]/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TYPE_SYNONYMS: Record<string, InvestorType> = {
  assessoria: "assessoria",
  assessor: "assessoria",
  pf: "investidor_pf",
  investidor_pf: "investidor_pf",
  pessoa_fisica: "investidor_pf",
  pj: "investidor_pj",
  investidor_pj: "investidor_pj",
  pessoa_juridica: "investidor_pj",
  institucional: "institucional",
};

const STAGE_SYNONYMS: Record<string, InvestorStage> = {
  lead: "lead",
  primeiro_contato: "primeiro_contato",
  primeiro: "primeiro_contato",
  em_negociacao: "em_negociacao",
  negociacao: "em_negociacao",
  boleta: "boleta_em_andamento",
  boleta_em_andamento: "boleta_em_andamento",
  ativo: "investidor_ativo",
  investidor_ativo: "investidor_ativo",
  manter_relacionamento: "manter_relacionamento",
  manter: "manter_relacionamento",
  perdido: "perdido",
};

export function parseType(v: any): InvestorType | null {
  if (v == null || v === "") return null;
  const k = normHeader(v.toString());
  return TYPE_SYNONYMS[k] ?? null;
}

export function parseStage(v: any): InvestorStage | null {
  if (v == null || v === "") return null;
  const k = normHeader(v.toString());
  return STAGE_SYNONYMS[k] ?? null;
}

export type ParsedRow = {
  rowIndex: number;
  raw: Record<string, any>;
  mapped: {
    name: string;
    contact_name: string;
    phone: string | null;
    ticket: number | null;
    type: InvestorType;
    stage: InvestorStage;
    notes: string | null;
  };
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
  const json = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const filtered = json.filter(
    (r) => Array.isArray(r) && r.some((c) => c !== "" && c != null),
  );
  if (filtered.length === 0) return { headers: [], rows: [] };
  const headers = (filtered[0] as any[]).map((h) => h?.toString() ?? "");
  const rows = filtered.slice(1) as any[][];
  return { headers, rows };
}

export function validateRows(
  data: SheetData,
  mapping: Record<number, ImportFieldKey | "">,
): ParsedRow[] {
  return data.rows.map((row, idx) => {
    const raw: Record<string, any> = {};
    let contact_name = "";
    let phone: string | null = null;
    let ticket: number | null = null;
    let type: InvestorType = "investidor_pj";
    let stage: InvestorStage = "lead";
    let notes: string | null = null;

    const errors: string[] = [];
    const warnings: string[] = [];

    Object.entries(mapping).forEach(([colIdx, field]) => {
      if (!field) return;
      const value = row[Number(colIdx)];
      raw[field] = value;
      if (value === "" || value == null) return;

      switch (field) {
        case "contact_name":
          contact_name = value.toString().trim();
          break;
        case "phone":
          phone = value.toString().trim() || null;
          break;
        case "ticket":
          ticket = parseNumber(value);
          if (raw.ticket && ticket == null) warnings.push("Ticket inválido — ignorado");
          break;
        case "type": {
          const t = parseType(value);
          if (t) type = t;
          else warnings.push(`Tipo "${value}" inválido — usando "Investidor PJ"`);
          break;
        }
        case "stage": {
          const s = parseStage(value);
          if (s) stage = s;
          else warnings.push(`Estágio "${value}" inválido — usando "Lead"`);
          break;
        }
        case "notes":
          notes = value.toString().trim() || null;
          break;
      }
    });

    if (!contact_name) errors.push("Nome do contato obrigatório");

    const status: ParsedRow["status"] =
      errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return {
      rowIndex: idx + 2,
      raw,
      mapped: {
        name: contact_name,
        contact_name,
        phone,
        ticket,
        type,
        stage,
        notes,
      },
      errors,
      warnings,
      status,
    };
  });
}

export function buildTemplateXlsx(): Blob {
  const headers = IMPORT_FIELDS.map((f) => f.key);
  const example1 = [
    "João Silva",
    "(11) 99999-0000",
    "500000",
    "investidor_pf",
    "lead",
    "Indicação de parceiro",
  ];
  const example2 = [
    "Fundo Acme",
    "(11) 4002-8922",
    "5000000",
    "institucional",
    "primeiro_contato",
    "Reunião agendada",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  // Aba auxiliar com referência de valores aceitos
  const ref = [
    ["Tipos válidos", "Estágios válidos"],
    ...Array.from({ length: Math.max(INVESTOR_TYPES.length, STAGE_ORDER.length + 2) }).map(
      (_, i) => [
        INVESTOR_TYPES[i]
          ? `${INVESTOR_TYPES[i]}  (${INVESTOR_TYPE_LABEL[INVESTOR_TYPES[i]]})`
          : "",
        (() => {
          const all: InvestorStage[] = [
            ...STAGE_ORDER,
            "manter_relacionamento",
            "perdido",
          ];
          return all[i] ? `${all[i]}  (${STAGE_LABEL[all[i]]})` : "";
        })(),
      ],
    ),
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(ref);
  wsRef["!cols"] = [{ wch: 36 }, { wch: 36 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contatos");
  XLSX.utils.book_append_sheet(wb, wsRef, "Referência");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function exportErrorsCsv(rows: ParsedRow[]): Blob {
  const headers = ["linha", "contact_name", "erros"];
  const lines = [headers.join(",")];
  rows
    .filter((r) => r.status === "error")
    .forEach((r) => {
      const cells = [
        r.rowIndex,
        JSON.stringify(r.raw.contact_name ?? ""),
        JSON.stringify(r.errors.join("; ")),
      ];
      lines.push(cells.join(","));
    });
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
}
