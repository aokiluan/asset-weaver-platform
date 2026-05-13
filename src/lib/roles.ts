// Single source of truth for application roles.
// Note: 'financeiro' and 'gestor_geral' remain in the enum for DB compat,
// but are no longer attributable. Financeiro virou módulo; gestor_geral foi absorvido por admin.
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

// Funções operacionais — subgrupo do módulo Operação.
export const OPERACAO_ROLES: AppRole[] = [
  "comercial",
  "cadastro",
  "credito",
  "comite",
  "formalizacao",
];

// Compat: telas antigas que ainda esperam PRIMARY_ROLES recebem só as operacionais.
export const PRIMARY_ROLES: AppRole[] = OPERACAO_ROLES;

export const ALL_ROLES_FOR_MATRIX: AppRole[] = ["admin", ...OPERACAO_ROLES];
