import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/roles";

export type ModuleKey =
  | "gestao"
  | "operacao"
  | "governanca"
  | "config"
  | "financeiro_mod"
  | "bi"
  | "relacao_investidores";

export interface UserModulePermission {
  module_key: string;
  enabled: boolean;
}

export function useModulePermissions() {
  const { user, roles, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-module-permissions", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserModulePermission[]> => {
      const { data, error } = await (supabase as any)
        .from("user_module_permissions")
        .select("module_key, enabled")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as UserModulePermission[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = roles.includes("admin" as AppRole);

  function isModuleEnabled(moduleKey: string): boolean {
    if (isAdmin) return true;
    if (!user) return false;
    const data = query.data;
    if (!data) return true; // fail-open enquanto carrega para evitar flicker
    const row = data.find((r) => r.module_key === moduleKey);
    return !!row?.enabled; // default bloqueado quando sem registro
  }

  return {
    isModuleEnabled,
    isLoading: authLoading || query.isLoading,
    permissions: query.data ?? [],
    refetch: query.refetch,
  };
}
