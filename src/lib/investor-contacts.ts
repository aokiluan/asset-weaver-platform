export type InvestorType = "assessoria" | "investidor_pf" | "investidor_pj" | "institucional";
export type InvestorStage =
  | "prospeccao"
  | "apresentacao"
  | "due_diligence"
  | "proposta"
  | "fechamento"
  | "ativo";

export const INVESTOR_TYPES: InvestorType[] = [
  "assessoria",
  "investidor_pf",
  "investidor_pj",
  "institucional",
];

export const INVESTOR_TYPE_LABEL: Record<InvestorType, string> = {
  assessoria: "Assessoria",
  investidor_pf: "Investidor PF",
  investidor_pj: "Investidor PJ",
  institucional: "Institucional",
};

export const STAGE_ORDER: InvestorStage[] = [
  "prospeccao",
  "apresentacao",
  "due_diligence",
  "proposta",
  "fechamento",
  "ativo",
];

export const STAGE_LABEL: Record<InvestorStage, string> = {
  prospeccao: "Prospecção",
  apresentacao: "Apresentação",
  due_diligence: "Due Diligence",
  proposta: "Proposta",
  fechamento: "Fechamento",
  ativo: "Ativo",
};

/** Probabilidade de fechamento por estágio (estilo Salesforce Sales Path). */
export const STAGE_PROBABILITY: Record<InvestorStage, number> = {
  prospeccao: 0.1,
  apresentacao: 0.25,
  due_diligence: 0.5,
  proposta: 0.75,
  fechamento: 0.9,
  ativo: 1,
};

export type ActivityType = "ligacao" | "email" | "reuniao" | "nota" | "tarefa";

export const ACTIVITY_TYPES: ActivityType[] = ["ligacao", "email", "reuniao", "nota", "tarefa"];

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
  tarefa: "Tarefa",
};

export interface InvestorActivity {
  id: string;
  contact_id: string;
  user_id: string;
  type: ActivityType;
  description: string;
  occurred_at: string;
  created_at: string;
}

/** Dias desde o último contato (null se nunca contatado). */
export function daysSince(dateISO: string | null | undefined): number | null {
  if (!dateISO) return null;
  const then = new Date(dateISO + "T00:00:00").getTime();
  const now = Date.now();
  return Math.floor((now - then) / 86_400_000);
}

/** Contato "frio": não-fechado e sem contato há 14+ dias (ou nunca). */
export function isStale(stage: InvestorStage, lastContactDate: string | null | undefined): boolean {
  if (stage === "ativo") return false;
  const d = daysSince(lastContactDate);
  return d == null || d >= 14;
}

export interface InvestorContact {
  id: string;
  name: string;
  type: InvestorType;
  stage: InvestorStage;
  ticket: number | null;
  contact_name: string | null;
  phone: string | null;
  last_contact_date: string | null;
  next_action: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

/** Formata como R$ 1,5M / R$ 500k / R$ 250 */
export function fmtCompactBRL(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) {
    const n = v / 1_000_000;
    const s = n.toFixed(n >= 10 ? 0 : 1).replace(".", ",").replace(/,0$/, "");
    return `R$ ${s}M`;
  }
  if (abs >= 1_000) {
    const n = v / 1_000;
    const s = n.toFixed(0);
    return `R$ ${s}k`;
  }
  return `R$ ${v.toFixed(0)}`;
}

export function nextStage(stage: InvestorStage): InvestorStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export function prevStage(stage: InvestorStage): InvestorStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i > 0 ? STAGE_ORDER[i - 1] : null;
}

/** Retorna a data atual no formato YYYY-MM-DD (date column do Postgres). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Retorna se o movimento entre estágios é um avanço (índice maior). */
export function isAdvance(from: InvestorStage, to: InvestorStage): boolean {
  return STAGE_ORDER.indexOf(to) > STAGE_ORDER.indexOf(from);
}
