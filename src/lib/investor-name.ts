import type { InvestorContact } from "@/lib/investor-contacts";
import type { InvestorBoleta } from "@/lib/investor-boletas";

/**
 * Fonte única de verdade para o nome do investidor exibido na UI.
 *
 * Regra de precedência (do mais específico ao mais genérico):
 *   1. boleta.dados_investidor.nome  (preenchido no wizard / boletim de subscrição)
 *   2. contact.name                   (cadastro do prospect/investidor)
 *   3. fallback ("—")
 */
export function resolveInvestorName(
  contact?: Pick<InvestorContact, "name"> | null,
  boleta?: Pick<InvestorBoleta, "dados_investidor"> | null,
  fallback = "—",
): string {
  const dadosNome = extractDadosNome(boleta?.dados_investidor);
  return dadosNome || contact?.name || fallback;
}

export function extractDadosNome(dados: unknown): string | null {
  if (!dados || typeof dados !== "object") return null;
  const v = (dados as Record<string, unknown>).nome;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
