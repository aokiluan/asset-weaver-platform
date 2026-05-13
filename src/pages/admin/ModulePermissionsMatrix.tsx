import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";

export const MODULES: { key: string; label: string }[] = [
  { key: "gestao", label: "Gestão" },
  { key: "operacao", label: "Operação" },
  { key: "diretorio", label: "Diretório" },
  { key: "financeiro_mod", label: "Financeiro" },
  { key: "config", label: "Configurações" },
  { key: "bi", label: "BI" },
];

interface UserRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles: AppRole[];
}

interface PermRow {
  user_id: string;
  module_key: string;
  enabled: boolean;
}

export default function ModulePermissionsMatrix({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rows, setRows] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: us }, { data: perms, error }] = await Promise.all([
        supabase.rpc("admin_list_users"),
        (supabase as any).from("user_module_permissions").select("user_id, module_key, enabled"),
      ]);
      if (error) toast.error("Erro ao carregar permissões", { description: error.message });
      setUsers(((us as UserRow[]) ?? []).filter((u) => u.ativo));
      setRows((perms as PermRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, boolean>> = {};
    for (const r of rows) {
      if (!m[r.user_id]) m[r.user_id] = {};
      m[r.user_id][r.module_key] = r.enabled;
    }
    return m;
  }, [rows]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, filter]);

  async function toggle(userId: string, moduleKey: string, value: boolean, isAdminRow: boolean) {
    if (!isAdmin || isAdminRow) return;
    const prev = matrix[userId]?.[moduleKey] ?? false;
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.user_id === userId && r.module_key === moduleKey);
      if (idx >= 0) {
        const next = [...rs];
        next[idx] = { ...next[idx], enabled: value };
        return next;
      }
      return [...rs, { user_id: userId, module_key: moduleKey, enabled: value }];
    });
    const { error } = await (supabase as any)
      .from("user_module_permissions")
      .upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          enabled: value,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_key" },
      );
    if (error) {
      setRows((rs) => {
        const idx = rs.findIndex((r) => r.user_id === userId && r.module_key === moduleKey);
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
    qc.invalidateQueries({ queryKey: ["user-module-permissions"] });
  }

  return (
    <Card className="p-2.5">
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[13px] font-medium leading-tight">
              Acesso a módulos por usuário
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Controla quais grupos do menu cada usuário enxerga. Padrão: bloqueado quando não marcado. Não altera RLS nem regras de etapas.
            </p>
          </div>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nome ou e-mail"
            className="h-7 text-[12px] w-[220px]"
          />
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
                      Usuário
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
                  {filteredUsers.map((u) => {
                    const isAdminRow = u.roles.includes("admin");
                    return (
                      <tr key={u.id} className="border-t border-border">
                        <td className="px-2.5 py-1.5 sticky left-0 bg-card">
                          <div className="font-medium leading-tight">{u.nome}</div>
                          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                            {u.email}
                            {u.roles.length > 0 && (
                              <span className="ml-1.5">
                                · {u.roles.map((r) => ROLE_LABEL[r]).join(", ")}
                              </span>
                            )}
                          </div>
                        </td>
                        {MODULES.map((m) => {
                          const checked = isAdminRow ? true : matrix[u.id]?.[m.key] ?? false;
                          const sw = (
                            <Switch
                              checked={checked}
                              disabled={!isAdmin || isAdminRow}
                              onCheckedChange={(v) => toggle(u.id, m.key, !!v, isAdminRow)}
                              aria-label={`${u.nome} acessa ${m.label}`}
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
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={MODULES.length + 1} className="text-center text-muted-foreground py-3 text-[11px]">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </div>
    </Card>
  );
}
