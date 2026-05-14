import type { AppRole } from "./roles";

export type CedenteStage =
  | "novo"
  | "cadastro"
  | "analise"
  | "comite"
  | "formalizacao"
  | "ativo"
  | "inativo";

export const STAGE_ORDER: CedenteStage[] = [
  "novo",
  "cadastro",
  "analise",
  "comite",
  "formalizacao",
  "ativo",
];

export const STAGE_LABEL: Record<CedenteStage, string> = {
  novo: "Novo",
  cadastro: "Cadastro",
  analise: "Análise de crédito",
  comite: "Comitê",
  formalizacao: "Formalização",
  ativo: "Ativo",
  inativo: "Inativo",
};

export const STAGE_DESCRIPTION: Record<CedenteStage, string> = {
  novo: "Comercial cadastra dados, anexa documentos obrigatórios, faz visita e registra o pleito.",
  cadastro: "Analista de cadastro valida documentação e relatório de visita.",
  analise: "Analista de crédito monta o parecer.",
  comite: "Comitê delibera de forma assíncrona.",
  formalizacao: "Geração de minuta e coleta de assinatura.",
  ativo: "Cedente operacional.",
  inativo: "Cedente fora de operação.",
};

export interface CedenteForGates {
  stage: CedenteStage;
  // dados auxiliares vindos da página
  hasVisitReport: boolean;
  obrigatoriosFaltando: string[]; // nomes das categorias obrigatórias sem documento aprovado
  docsRejeitados: number;
  // hasParecer agora vem de credit_reports (completude=8 + recomendação preenchida).
  // O fluxo legado via credit_proposals NÃO alimenta mais este gate.
  hasParecer: boolean;
  comiteDecidido: boolean;
  minutaAssinada: boolean;
}

export interface GateResult {
  next: CedenteStage | null;
  allowed: boolean;
  pendentes: string[];
  atendidos: string[];
}

export function nextStage(stage: CedenteStage): CedenteStage | null {
  if (stage === "ativo" || stage === "inativo") return null;
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function evaluateGates(c: CedenteForGates): GateResult {
  const next = nextStage(c.stage);
  const pendentes: string[] = [];
  const atendidos: string[] = [];

  const check = (cond: boolean, label: string) => {
    if (cond) atendidos.push(label);
    else pendentes.push(label);
  };

  switch (c.stage) {
    case "novo": {
      // novo -> cadastro
      if (c.obrigatoriosFaltando.length === 0) atendidos.push("Documentos obrigatórios anexados");
      else pendentes.push(`Documentos obrigatórios faltando: ${c.obrigatoriosFaltando.join(", ")}`);
      check(c.hasVisitReport, "Relatório comercial preenchido");
      // Pleito é capturado dentro do relatório comercial (limite + modalidades),
      // não exigimos mais um registro em credit_proposals nesta etapa.
      break;
    }
    case "cadastro": {
      // cadastro -> analise
      check(c.docsRejeitados === 0, "Sem documentos rejeitados");
      check(c.obrigatoriosFaltando.length === 0, "Todos os documentos obrigatórios validados");
      break;
    }
    case "analise": {
      // analise -> comite
      check(c.hasParecer, "Parecer de crédito concluído");
      break;
    }
    case "comite": {
      // comite -> formalizacao
      check(c.comiteDecidido, "Decisão do comitê registrada");
      break;
    }
    case "formalizacao": {
      // formalizacao -> ativo
      check(c.minutaAssinada, "Minuta gerada e assinada");
      break;
    }
    default:
      break;
  }

  return {
    next,
    allowed: next !== null && pendentes.length === 0,
    pendentes,
    atendidos,
  };
}

// Cores das etapas (mesmas do kanban /pipeline). Fonte de verdade única.
export const STAGE_COLORS: Record<CedenteStage, string> = {
  novo: "hsl(220 9% 64%)",
  cadastro: "hsl(217 91% 35%)",
  analise: "hsl(199 89% 48%)",
  comite: "hsl(38 92% 50%)",
  formalizacao: "hsl(280 70% 50%)",
  ativo: "hsl(142 71% 45%)",
  inativo: "hsl(0 0% 50%)",
};

// Quem pode ENVIAR (avançar) a partir desta etapa para a próxima.
// O "owner" do cedente é tratado adicionalmente na UI para a etapa "novo".
export const STAGE_PERMISSIONS: Record<CedenteStage, AppRole[]> = {
  novo: ["admin", "comercial"],
  cadastro: ["admin", "cadastro"],
  analise: ["admin", "credito"],
  comite: ["admin", "comite", "credito"],
  formalizacao: ["admin", "formalizacao"],
  ativo: [],
  inativo: [],
};

// Roles que podem DEVOLVER um cedente (de qualquer etapa) para "novo".
const RETURN_ROLES: AppRole[] = [
  "admin",
  "cadastro",
  "credito",
  "comite",
  "formalizacao",
];

/**
 * Verifica se o usuário pode mover um cedente entre dois estágios via Pipeline.
 * Não avalia gates de pendências (docs, parecer, etc.) — esses são checados
 * dentro do detalhe do cedente, em `CedenteStageActions`.
 */
export function canMoveStage(
  roles: AppRole[],
  isOwner: boolean,
  from: CedenteStage,
  to: CedenteStage,
  userId?: string | null,
): { ok: boolean; reason?: string } {
  if (from === to) return { ok: false, reason: "Cedente já está nesta etapa" };
  if (roles.includes("admin") || roles.includes("gestor_geral")) return { ok: true };

  // Devolução para "novo" (qualquer etapa interna)
  if (to === "novo" && from !== "novo" && !isTerminal(from)) {
    if (roles.some((r) => RETURN_ROLES.includes(r))) return { ok: true };
    return { ok: false, reason: "Você não tem permissão para devolver ao Comercial" };
  }

  // Avanço linear (next stage)
  const next = nextStage(from);
  if (to === next) {
    const allowed = STAGE_PERMISSIONS[from] ?? [];
    if (allowed.some((r) => roles.includes(r))) return { ok: true };
    // Owner override em "novo" → "cadastro"
    if (from === "novo" && isOwner) return { ok: true };
    return {
      ok: false,
      reason: `Você não tem permissão para enviar de ${STAGE_LABEL[from]} para ${STAGE_LABEL[to]}`,
    };
  }

  return {
    ok: false,
    reason: "Movimento não permitido por aqui — abra o cedente para ver opções",
  };
}

/**
 * Existe alguma transição permitida a partir desta etapa para o usuário?
 * Usado para habilitar/desabilitar o drag do card no Pipeline.
 */
export function canDragFromStage(
  roles: AppRole[],
  isOwner: boolean,
  from: CedenteStage,
): boolean {
  if (isTerminal(from)) return false;
  if (roles.includes("admin") || roles.includes("gestor_geral")) return true;
  // Pode avançar?
  const allowed = STAGE_PERMISSIONS[from] ?? [];
  if (allowed.some((r) => roles.includes(r))) return true;
  if (from === "novo" && isOwner) return true;
  // Pode devolver?
  if (from !== "novo" && roles.some((r) => RETURN_ROLES.includes(r))) return true;
  return false;
}

function isTerminal(s: CedenteStage): boolean {
  return s === "ativo" || s === "inativo";
}
