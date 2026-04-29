// Single source of truth for application roles.
export type AppRole =
  | "admin"
  | "gestor_comercial"
  | "comercial"
  | "analista_credito"
  | "comite"
  | "gestor_risco"
  | "financeiro"
  | "operacional"
  | "gestor_credito"
  | "gestor_financeiro"
  | "relacao_investidor"
  | "gestor_relacao_investidor"
  | "analista_cadastro";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gestor_comercial: "Gestor comercial",
  comercial: "Comercial",
  analista_credito: "Analista de crédito",
  comite: "Comitê",
  gestor_risco: "Gestor de risco",
  financeiro: "Financeiro",
  operacional: "Operacional",
  gestor_credito: "Gestor de crédito",
  gestor_financeiro: "Gestor financeiro",
  relacao_investidor: "Relação com investidor",
  gestor_relacao_investidor: "Gestor RI",
  analista_cadastro: "Analista de cadastro",
};
