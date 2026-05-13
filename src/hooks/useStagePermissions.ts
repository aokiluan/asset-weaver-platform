import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";
import type { CedenteStage } from "@/lib/cedente-stages";

export interface PermissionProfile {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_system: boolean;
  ordem: number;
  app_roles: AppRole[];
  permissions: Record<CedenteStage, boolean>;
}

interface RpcRow {
  profile_id: string;
  profile_nome: string;
  profile_descricao: string | null;
  profile_ativo: boolean;
  profile_is_system: boolean;
  profile_ordem: number;
  app_roles: AppRole[];
  stage: CedenteStage | null;
  can_send: boolean | null;
}

export async function fetchStagePermissions(): Promise<PermissionProfile[]> {
  const { data, error } = await supabase.rpc("list_stage_permissions");
  if (error) throw error;
  const rows = (data ?? []) as RpcRow[];
  const map = new Map<string, PermissionProfile>();
  for (const r of rows) {
    let p = map.get(r.profile_id);
    if (!p) {
      p = {
        id: r.profile_id,
        nome: r.profile_nome,
        descricao: r.profile_descricao,
        ativo: r.profile_ativo,
        is_system: r.profile_is_system,
        ordem: r.profile_ordem,
        app_roles: r.app_roles ?? [],
        permissions: {} as Record<CedenteStage, boolean>,
      };
      map.set(r.profile_id, p);
    }
    if (r.stage) p.permissions[r.stage] = !!r.can_send;
  }
  return Array.from(map.values()).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
}

export function useStagePermissions() {
  return useQuery({
    queryKey: ["stage-permissions"],
    queryFn: fetchStagePermissions,
    staleTime: 60_000,
  });
}

/**
 * Resolve quais AppRoles podem enviar a partir de cada stage,
 * agregando todos os perfis ativos com can_send=true.
 */
export function rolesAllowedToSendFrom(
  profiles: PermissionProfile[],
  stage: CedenteStage,
): AppRole[] {
  const set = new Set<AppRole>();
  for (const p of profiles) {
    if (!p.ativo) continue;
    if (!p.permissions[stage]) continue;
    for (const r of p.app_roles) set.add(r);
  }
  return Array.from(set);
}
