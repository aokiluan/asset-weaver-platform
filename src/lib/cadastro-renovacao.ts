// Renovação cadastral semestral (KYC refresh).
// Status calculado a partir da última revisão do cadastro.

export const RENOVACAO_MESES = 6;
export const RENOVACAO_AVISO_DIAS = 30; // janela de "vence em breve"

export type RenovacaoStatus = "em_dia" | "atencao" | "vencida" | "sem_dados";

export interface RenovacaoInfo {
  status: RenovacaoStatus;
  /** Data da próxima renovação (revisado_em + 6 meses). */
  proximaEm: Date | null;
  /** Dias até vencer (negativo = vencida há X dias). */
  diasParaVencer: number | null;
}

const MS_DIA = 86_400_000;

export function computeRenovacao(
  revisadoEm: string | null | undefined,
  fallback?: string | null,
): RenovacaoInfo {
  const base = revisadoEm ?? fallback ?? null;
  if (!base) return { status: "sem_dados", proximaEm: null, diasParaVencer: null };

  const proxima = new Date(base);
  proxima.setMonth(proxima.getMonth() + RENOVACAO_MESES);

  const diff = Math.floor((proxima.getTime() - Date.now()) / MS_DIA);

  let status: RenovacaoStatus;
  if (diff < 0) status = "vencida";
  else if (diff <= RENOVACAO_AVISO_DIAS) status = "atencao";
  else status = "em_dia";

  return { status, proximaEm: proxima, diasParaVencer: diff };
}

export function renovacaoLabel(info: RenovacaoInfo): string {
  if (info.status === "sem_dados") return "Sem registro";
  const d = info.diasParaVencer ?? 0;
  if (info.status === "vencida") return `Vencida há ${Math.abs(d)}d`;
  if (info.status === "atencao") return d <= 1 ? "Vence hoje" : `Vence em ${d}d`;
  // em_dia
  const meses = Math.round((d / 30) * 10) / 10;
  return `Em dia · ${meses < 1 ? `${d}d` : `${Math.round(d / 30)}m`}`;
}

/** Ordem para sort: vencidas primeiro, depois atenção, depois em dia. */
export function renovacaoSortKey(info: RenovacaoInfo): number {
  switch (info.status) {
    case "vencida":
      return 0;
    case "atencao":
      return 1;
    case "em_dia":
      return 2;
    default:
      return 3;
  }
}
