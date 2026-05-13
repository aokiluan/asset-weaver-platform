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
