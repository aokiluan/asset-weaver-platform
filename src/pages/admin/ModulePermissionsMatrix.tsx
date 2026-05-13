import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ALL_ROLES_FOR_MATRIX, ROLE_LABEL, type AppRole } from "@/lib/roles";

const MODULES: { key: string; label: string }[] = [
  { key: "gestao", label: "Gestão" },
  { key: "operacao", label: "Operação" },
  { key: "diretorio", label: "Diretório" },
  { key: "financeiro_mod", label: "Financeiro" },
  { key: "config", label: "Configurações" },
  { key: "bi", label: "BI" },
];

interface Row {
  role: string;
  module_key: string;
  enabled: boolean;
}

export default function ModulePermissionsMatrix({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("role_module_permissions")
        .select("role, module_key, enabled");
      if (error) {
        toast.error("Erro ao carregar permissões de módulos", { description: error.message });
      } else {
        setRows((data as Row[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, boolean>> = {};
    for (const r of rows) {
      if (!m[r.role]) m[r.role] = {};
      m[r.role][r.module_key] = r.enabled;
    }
    return m;
  }, [rows]);

  async function toggle(role: AppRole, moduleKey: string, value: boolean) {
    if (!isAdmin || role === "admin") return;
    const prev = matrix[role]?.[moduleKey] ?? true;
    // Optimistic update
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.role === role && r.module_key === moduleKey);
      if (idx >= 0) {
        const next = [...rs];
        next[idx] = { ...next[idx], enabled: value };
        return next;
      }
      return [...rs, { role, module_key: moduleKey, enabled: value }];
    });
    const { error } = await (supabase as any)
      .from("role_module_permissions")
      .upsert(
        { role, module_key: moduleKey, enabled: value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "role,module_key" },
      );
    if (error) {
      // rollback
      setRows((rs) => {
        const idx = rs.findIndex((r) => r.role === role && r.module_key === moduleKey);
        if (idx >= 0) {
          const next = [...rs];
          next[idx] = { ...next[idx], enabled: prev };
          return next;
        }
        return rs;
      });
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Permissão atualizada");
    qc.invalidateQueries({ queryKey: ["role-module-permissions"] });
  }

  return (
    <Card className="p-2.5">
      <div className="space-y-2">
        <div>
          <div className="text-[13px] font-medium leading-tight">
            Acesso a módulos por perfil
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Controla quais grupos do menu cada perfil enxerga. Não altera RLS nem regras de etapas.
          </p>
        </div>

        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <div className="overflow-x-auto -mx-2.5">
              <table className="w-full text-[12px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left font-medium px-2.5 py-1.5 text-[11px] text-muted-foreground sticky left-0 bg-card">
                      Perfil
                    </th>
                    {MODULES.map((m) => (
                      <th
                        key={m.key}
                        className="text-center font-medium px-2 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_ROLES_FOR_MATRIX.map((role) => {
                    const isAdminRow = role === "admin";
                    return (
                      <tr key={role} className="border-t border-border">
                        <td className="px-2.5 py-1.5 sticky left-0 bg-card font-medium">
                          {ROLE_LABEL[role]}
                        </td>
                        {MODULES.map((m) => {
                          const checked = isAdminRow
                            ? true
                            : matrix[role]?.[m.key] ?? true;
                          const sw = (
                            <Switch
                              checked={checked}
                              disabled={!isAdmin || isAdminRow}
                              onCheckedChange={(v) => toggle(role, m.key, !!v)}
                              aria-label={`${ROLE_LABEL[role]} acessa ${m.label}`}
                            />
                          );
                          return (
                            <td key={m.key} className="text-center px-2 py-1.5">
                              {isAdminRow ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex">{sw}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Admin sempre tem acesso total a todos os módulos
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                sw
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </div>
    </Card>
  );
}
