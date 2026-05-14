export type BoletaStatus =
  | "rascunho"
  | "aguardando_assinatura"
  | "assinada"
  | "pagamento_enviado"
  | "concluida"
  | "cancelada";

export const BOLETA_STATUS_LABEL: Record<BoletaStatus, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  assinada: "Assinada",
  pagamento_enviado: "Pagamento enviado",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const BOLETA_STATUS_VARIANT: Record<
  BoletaStatus,
  "secondary" | "default" | "outline" | "destructive"
> = {
  rascunho: "outline",
  aguardando_assinatura: "secondary",
  assinada: "secondary",
  pagamento_enviado: "default",
  concluida: "default",
  cancelada: "destructive",
};

export interface InvestorSeries {
  id: string;
  nome: string;
  descricao: string | null;
  indexador: string | null;
  spread: number | null;
  prazo_meses: number | null;
  ativa: boolean;
  ordem: number;
}

export interface BoletaDadosInvestidor {
  nome?: string;
  cpf_cnpj?: string;
  rg?: string;
  orgao_emissor?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface InvestorBoleta {
  id: string;
  contact_id: string;
  series_id: string | null;
  user_id: string;
  valor: number | null;
  prazo_meses: number | null;
  taxa_efetiva: number | null;
  status: BoletaStatus;
  current_step: number;
  dados_investidor: BoletaDadosInvestidor;
  observacoes: string | null;
  contrato_path: string | null;
  contrato_assinado_em: string | null;
  comprovante_path: string | null;
  pagamento_enviado_em: string | null;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
}

export const BOLETA_STEPS = [
  { id: 1, label: "Dados" },
  { id: 2, label: "Série e valor" },
  { id: 3, label: "Assinatura" },
] as const;

export function isOpenStatus(s: BoletaStatus): boolean {
  return s === "rascunho" || s === "aguardando_assinatura";
}
export function isInProgressStatus(s: BoletaStatus): boolean {
  return s === "assinada";
}
export function isClosedStatus(s: BoletaStatus): boolean {
  return s === "concluida" || s === "cancelada";
}

export function fmtBRL(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
