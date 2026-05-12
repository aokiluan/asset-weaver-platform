// Helpers para ciclos de revalidação cadastral.
import { supabase } from "@/integrations/supabase/client";

export type RevalidacaoStatus = "aberto" | "concluido" | "cancelado";
export type RevalidacaoDecisao = "mantido" | "alterado" | "encerrado";

export interface RevalidacaoCiclo {
  id: string;
  cedente_id: string;
  numero: number;
  etapa_atual: string;
  status: RevalidacaoStatus;
  decisao: RevalidacaoDecisao | null;
  iniciado_em: string;
  iniciado_por: string;
  concluido_em: string | null;
  concluido_por: string | null;
  cancelado_em: string | null;
  cancelado_por: string | null;
  cancelamento_motivo: string | null;
  observacoes: string | null;
}

export async function fetchCicloAberto(cedenteId: string): Promise<RevalidacaoCiclo | null> {
  const { data, error } = await (supabase as any)
    .from("cedente_revalidacao_ciclos")
    .select("*")
    .eq("cedente_id", cedenteId)
    .eq("status", "aberto")
    .maybeSingle();
  if (error) throw error;
  return (data as RevalidacaoCiclo | null) ?? null;
}

export async function fetchCiclos(cedenteId: string): Promise<RevalidacaoCiclo[]> {
  const { data, error } = await (supabase as any)
    .from("cedente_revalidacao_ciclos")
    .select("*")
    .eq("cedente_id", cedenteId)
    .order("numero", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RevalidacaoCiclo[];
}

export async function iniciarCiclo(cedenteId: string): Promise<string> {
  const { data, error } = await (supabase as any).rpc("iniciar_ciclo_revalidacao", {
    _cedente_id: cedenteId,
  });
  if (error) throw error;
  return data as string;
}

export async function concluirCiclo(
  cicloId: string,
  decisao: RevalidacaoDecisao,
  observacoes?: string | null,
): Promise<void> {
  const { error } = await (supabase as any).rpc("concluir_ciclo_revalidacao", {
    _ciclo_id: cicloId,
    _decisao: decisao,
    _observacoes: observacoes ?? null,
  });
  if (error) throw error;
}

export async function cancelarCiclo(cicloId: string, motivo: string): Promise<void> {
  const { error } = await (supabase as any).rpc("cancelar_ciclo_revalidacao", {
    _ciclo_id: cicloId,
    _motivo: motivo,
  });
  if (error) throw error;
}

export const DECISAO_LABEL: Record<RevalidacaoDecisao, string> = {
  mantido: "Mantido",
  alterado: "Alterado",
  encerrado: "Encerrado",
};
