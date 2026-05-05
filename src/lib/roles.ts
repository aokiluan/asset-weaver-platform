// Single source of truth for application roles.
export type AppRole =
  | "admin"
  | "comercial"
  | "cadastro"
  | "credito"
  | "comite"
  | "formalizacao"
  | "financeiro"
  | "gestor_geral";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  cadastro: "Cadastro",
  credito: "Crédito",
  comite: "Comitê",
  formalizacao: "Formalização",
  financeiro: "Financeiro",
  gestor_geral: "Gestor geral",
};

export const PRIMARY_ROLES: AppRole[] = [
  "admin",
  "comercial",
  "cadastro",
  "credito",
  "comite",
  "formalizacao",
  "financeiro",
];
