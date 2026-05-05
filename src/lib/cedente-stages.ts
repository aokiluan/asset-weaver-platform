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
  analise: "Análise",
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
  hasPleito: boolean;
  obrigatoriosFaltando: string[]; // nomes das categorias obrigatórias sem documento aprovado
  docsRejeitados: number;
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
      check(c.hasVisitReport, "Relatório de visita preenchido");
      check(c.hasPleito, "Pleito de limite informado");
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
