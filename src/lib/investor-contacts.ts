export type InvestorType = "assessoria" | "investidor_pf" | "investidor_pj" | "institucional";
export type InvestorStage =
  | "lead"
  | "primeiro_contato"
  | "em_negociacao"
  | "boleta_em_andamento"
  | "investidor_ativo"
  | "manter_relacionamento"
  | "perdido";

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

/** Funil principal (progressão linear). */
export const FUNNEL_STAGES: InvestorStage[] = [
  "lead",
  "primeiro_contato",
  "em_negociacao",
  "boleta_em_andamento",
  "investidor_ativo",
];

/** Estágios terminais paralelos (fora do funil linear). */
export const TERMINAL_STAGES: InvestorStage[] = [
  "manter_relacionamento",
  "perdido",
];

/** Ordem completa exibida no Kanban: funil + terminais à direita. */
export const STAGE_ORDER: InvestorStage[] = [...FUNNEL_STAGES, ...TERMINAL_STAGES];


export const STAGE_LABEL: Record<InvestorStage, string> = {
  lead: "Lead",
  primeiro_contato: "Primeiro Contato",
  em_negociacao: "Em Negociação",
  boleta_em_andamento: "Boleta em Andamento",
  investidor_ativo: "Investidor Ativo",
  manter_relacionamento: "Manter Relacionamento",
  perdido: "Perdido",
};

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

export function isTerminal(stage: InvestorStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function nextStage(stage: InvestorStage): InvestorStage | null {
  if (isTerminal(stage)) return null;
  const i = FUNNEL_STAGES.indexOf(stage);
  return i >= 0 && i < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[i + 1] : null;
}

export function prevStage(stage: InvestorStage): InvestorStage | null {
  if (isTerminal(stage)) return null;
  const i = FUNNEL_STAGES.indexOf(stage);
  return i > 0 ? FUNNEL_STAGES[i - 1] : null;
}

/** Retorna a data atual no formato YYYY-MM-DD (date column do Postgres). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Retorna se o movimento entre estágios é um avanço.
 * Movimentos para/entre terminais não contam como avanço linear.
 */
export function isAdvance(from: InvestorStage, to: InvestorStage): boolean {
  if (isTerminal(from) || isTerminal(to)) return false;
  return FUNNEL_STAGES.indexOf(to) > FUNNEL_STAGES.indexOf(from);
}

export type InvestorActivityType = "ligacao" | "whatsapp" | "email" | "reuniao" | "nota" | "tarefa";

export const INVESTOR_ACTIVITY_TYPES: InvestorActivityType[] = [
  "ligacao",
  "whatsapp",
  "email",
  "reuniao",
  "nota",
  "tarefa",
];

export const INVESTOR_ACTIVITY_LABEL: Record<InvestorActivityType, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  reuniao: "Reunião",
  nota: "Nota",
  tarefa: "Tarefa",
};

export interface InvestorActivity {
  id: string;
  contact_id: string;
  user_id: string;
  type: InvestorActivityType;
  description: string;
  occurred_at: string;
  created_at: string;
}
