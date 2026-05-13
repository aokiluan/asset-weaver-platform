import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/roles";

export type ModuleKey =
  | "gestao"
  | "operacao"
  | "diretorio"
  | "config"
  | "financeiro_mod"
  | "bi";

export interface RoleModulePermission {
  role: string;
  module_key: string;
  enabled: boolean;
}

export function useModulePermissions() {
  const { roles, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["role-module-permissions"],
    queryFn: async (): Promise<RoleModulePermission[]> => {
      const { data, error } = await (supabase as any)
        .from("role_module_permissions")
        .select("role, module_key, enabled");
      if (error) throw error;
      return (data ?? []) as RoleModulePermission[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = roles.includes("admin" as AppRole);

  function isModuleEnabled(moduleKey: string): boolean {
    if (isAdmin) return true;
    if (!roles || roles.length === 0) return false;
    const data = query.data;
    if (!data) return true; // fail-open enquanto carrega
    const relevant = data.filter((r) => r.module_key === moduleKey);
    if (relevant.length === 0) return true; // sem registro = libera
    return roles.some((userRole) =>
      relevant.some((r) => r.role === userRole && r.enabled),
    );
  }

  return {
    isModuleEnabled,
    isLoading: authLoading || query.isLoading,
    permissions: query.data ?? [],
    refetch: query.refetch,
  };
}
