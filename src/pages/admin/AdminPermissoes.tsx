import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { type AppRole, OPERACAO_ROLES } from "@/lib/roles";
import { UserAccessDrawer } from "./UserAccessDrawer";

const ALL_MODULE_KEYS = ["gestao", "operacao", "diretorio", "financeiro_mod", "config", "bi"];

interface Team {
  id: string;
  nome: string;
  papel_principal: AppRole;
}

interface UserRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  cargo: string | null;
  team_id: string | null;
  roles: AppRole[];
  created_at: string;
}

interface PermRow {
  user_id: string;
  module_key: string;
  enabled: boolean;
}

export default function AdminPermissoes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: us, error: e1 }, { data: ts }, { data: ps }] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.from("teams").select("id,nome,papel_principal").eq("ativo", true).order("nome"),
      (supabase as any).from("user_module_permissions").select("user_id, module_key, enabled"),
    ]);
    if (e1) toast.error("Erro ao listar usuários", { description: e1.message });
    setUsers((us as UserRow[]) ?? []);
    setTeams((ts as Team[]) ?? []);
    setPerms((ps as PermRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const matrix = useMemo(() => {
    const m: Record<string, Record<string, boolean>> = {};
    for (const r of perms) {
      if (!m[r.user_id]) m[r.user_id] = {};
      m[r.user_id][r.module_key] = r.enabled;
    }
    return m;
  }, [perms]);

  const filteredUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, filter]);

  // ---- Handlers
  async function toggleAtivo(u: UserRow) {
    const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success(`Usuário ${!u.ativo ? "ativado" : "desativado"}`);
    setUsers((rs) => rs.map((r) => (r.id === u.id ? { ...r, ativo: !u.ativo } : r)));
  }

  async function setTeam(u: UserRow, teamId: string | null) {
    const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", u.id);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Equipe atualizada");
    setUsers((rs) => rs.map((r) => (r.id === u.id ? { ...r, team_id: teamId } : r)));
  }

  async function toggleRole(u: UserRow, role: AppRole, next: boolean) {
    if (next) {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role });
      if (error) return toast.error("Erro", { description: error.message });
      setUsers((rs) =>
        rs.map((r) => (r.id === u.id ? { ...r, roles: [...r.roles, role] } : r)),
      );
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", u.id)
        .eq("role", role);
      if (error) return toast.error("Erro", { description: error.message });
      setUsers((rs) =>
        rs.map((r) => (r.id === u.id ? { ...r, roles: r.roles.filter((x) => x !== role) } : r)),
      );
    }
  }

  async function toggleAdmin(u: UserRow, next: boolean) {
    await toggleRole(u, "admin", next);
  }

  async function toggleModule(u: UserRow, moduleKey: string, value: boolean) {
    const prev = matrix[u.id]?.[moduleKey] ?? false;

    // Se for desligar Operação, avisa que funções operacionais serão removidas
    if (moduleKey === "operacao" && !value) {
      const opRoles = u.roles.filter((r) => OPERACAO_ROLES.includes(r));
      if (opRoles.length > 0 && !window.confirm(
        `Ao desativar o módulo Operação, as ${opRoles.length} função(ões) operacional(is) serão removidas. Continuar?`,
      )) {
        return;
      }
    }

    setPerms((rs) => {
      const idx = rs.findIndex((r) => r.user_id === u.id && r.module_key === moduleKey);
      if (idx >= 0) {
        const next = [...rs];
        next[idx] = { ...next[idx], enabled: value };
        return next;
      }
      return [...rs, { user_id: u.id, module_key: moduleKey, enabled: value }];
    });

    const { error } = await (supabase as any)
      .from("user_module_permissions")
      .upsert(
        {
          user_id: u.id,
          module_key: moduleKey,
          enabled: value,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_key" },
      );
    if (error) {
      setPerms((rs) => {
        const idx = rs.findIndex((r) => r.user_id === u.id && r.module_key === moduleKey);
        if (idx >= 0) {
          const next = [...rs];
          next[idx] = { ...next[idx], enabled: prev };
          return next;
        }
        return rs;
      });
      return toast.error("Erro ao salvar", { description: error.message });
    }

    // Se desligou Operação, recarrega para refletir cascade que removeu roles
    if (moduleKey === "operacao" && !value) {
      await load();
    }
    qc.invalidateQueries({ queryKey: ["user-module-permissions"] });
  }

  const drawerUser = users.find((u) => u.id === drawerUserId) ?? null;
  const drawerData = drawerUser
    ? {
        id: drawerUser.id,
        nome: drawerUser.nome,
        email: drawerUser.email,
        roles: drawerUser.roles,
        modules: matrix[drawerUser.id] ?? {},
      }
    : null;

  function summary(u: UserRow) {
    if (u.roles.includes("admin")) return "Admin";
    const mods = ALL_MODULE_KEYS.filter((k) => matrix[u.id]?.[k]).length;
    const fns = u.roles.filter((r) => OPERACAO_ROLES.includes(r)).length;
    if (mods === 0 && fns === 0) return "Sem acesso";
    const parts: string[] = [];
    if (mods > 0) parts.push(`${mods} ${mods === 1 ? "módulo" : "módulos"}`);
    if (fns > 0) parts.push(`${fns} ${fns === 1 ? "função" : "funções"}`);
    return parts.join(" · ");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Permissões</h1>
          <p className="text-[12px] text-muted-foreground leading-tight mt-1">
            Acesso por usuário: administrador, módulos do menu e funções de Operação. Padrão bloqueado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nome ou e-mail"
            className="h-7 text-[12px] w-[220px]"
          />
          <span className="text-[11px] text-muted-foreground">{users.length} usuários</span>
        </div>
      </div>

      <Card className="p-2.5">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2.5">
            <table className="w-full text-[12px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left font-medium px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    Usuário
                  </th>
                  <th className="text-left font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                    Acessos
                  </th>
                  <th className="text-left font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                    Equipe
                  </th>
                  <th className="text-center font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                    Ativo
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border align-top">
                    <td className="px-2.5 py-1.5">
                      <div className="font-medium leading-tight">{u.nome}</div>
                      <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        {u.email}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => setDrawerUserId(u.id)}
                        className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border hover:border-foreground hover:bg-accent text-[11px] leading-none transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{summary(u)}</span>
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={u.team_id ?? "none"}
                        onValueChange={(v) => setTeam(u, v === "none" ? null : v)}
                      >
                        <SelectTrigger className="h-7 w-[160px] text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Sem equipe —</SelectItem>
                          {teams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="text-center px-2 py-1.5">
                      <Switch
                        checked={u.ativo}
                        onCheckedChange={() => toggleAtivo(u)}
                        aria-label={`${u.nome} ativo`}
                      />
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted-foreground py-3 text-[11px]">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserAccessDrawer
        open={!!drawerUserId}
        onOpenChange={(v) => !v && setDrawerUserId(null)}
        user={drawerData}
        onToggleAdmin={(next) => drawerUser && toggleAdmin(drawerUser, next)}
        onToggleModule={(k, v) => drawerUser && toggleModule(drawerUser, k, v)}
        onToggleRole={(role, next) => drawerUser && toggleRole(drawerUser, role, next)}
      />
    </div>
  );
}
