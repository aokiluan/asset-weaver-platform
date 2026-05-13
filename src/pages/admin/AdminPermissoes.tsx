import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { type AppRole, ROLE_LABEL } from "@/lib/roles";
import { UserRolesDrawer } from "./UserRolesDrawer";

const MODULES: { key: string; label: string }[] = [
  { key: "gestao", label: "Gestão" },
  { key: "operacao", label: "Operação" },
  { key: "diretorio", label: "Diretório" },
  { key: "financeiro_mod", label: "Financeiro" },
  { key: "config", label: "Config" },
  { key: "bi", label: "BI" },
];

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
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const qc = useQueryClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [emailLookup, setEmailLookup] = useState("");
  const [rolesToAdd, setRolesToAdd] = useState<AppRole[]>([]);
  const [adding, setAdding] = useState(false);

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
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success(`Usuário ${!u.ativo ? "ativado" : "desativado"}`);
    setUsers((rs) => rs.map((r) => (r.id === u.id ? { ...r, ativo: !u.ativo } : r)));
  }

  async function setTeam(u: UserRow, teamId: string | null) {
    const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", u.id);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success("Equipe atualizada");
    setUsers((rs) => rs.map((r) => (r.id === u.id ? { ...r, team_id: teamId } : r)));
  }

  async function removeRole(u: UserRow, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", u.id)
      .eq("role", role);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success("Função removida");
    setUsers((rs) =>
      rs.map((r) => (r.id === u.id ? { ...r, roles: r.roles.filter((x) => x !== role) } : r)),
    );
  }

  async function addRole(u: UserRow, role: AppRole) {
    if (u.roles.includes(role)) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: u.id, role });
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success("Função atribuída");
    setUsers((rs) =>
      rs.map((r) => (r.id === u.id ? { ...r, roles: [...r.roles, role] } : r)),
    );
  }

  async function toggleModule(u: UserRow, moduleKey: string, value: boolean) {
    const isAdminRow = u.roles.includes("admin");
    if (!isAdmin || isAdminRow) return;
    const prev = matrix[u.id]?.[moduleKey] ?? false;
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
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["user-module-permissions"] });
  }

  async function assignRole() {
    if (!emailLookup.trim()) {
      toast.error("Selecione um usuário");
      return;
    }
    if (rolesToAdd.length === 0) {
      toast.error("Selecione ao menos uma função");
      return;
    }
    setAdding(true);
    const { data: uid, error: e1 } = await supabase.rpc("admin_find_user_by_email", {
      _email: emailLookup.trim(),
    });
    if (e1 || !uid) {
      setAdding(false);
      toast.error("Usuário não encontrado", {
        description: "O usuário precisa ter feito login pelo menos uma vez.",
      });
      return;
    }
    const rows = rolesToAdd.map((r) => ({ user_id: uid as string, role: r }));
    const { error: e2 } = await supabase
      .from("user_roles")
      .upsert(rows, { onConflict: "user_id,role", ignoreDuplicates: true });
    setAdding(false);
    if (e2) {
      toast.error("Erro", { description: e2.message });
      return;
    }
    toast.success(rolesToAdd.length > 1 ? "Funções atribuídas" : "Função atribuída");
    setEmailLookup("");
    setRolesToAdd([]);
    setAssignOpen(false);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Permissões</h1>
          <p className="text-[12px] text-muted-foreground leading-tight mt-1">
            Funções, equipe e acesso a módulos do menu por usuário. Padrão de módulos: bloqueado quando não marcado.
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
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-[12px]">
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Atribuir função
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atribuir função a usuário</DialogTitle>
                <DialogDescription>
                  O usuário precisa ter criado uma conta no sistema (login feito ao menos uma vez).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={emailLookup} onValueChange={setEmailLookup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.email}>
                          <span className="font-medium">{u.nome}</span>
                          <span className="text-muted-foreground ml-2 text-[11px]">{u.email}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funções</Label>
                  <div className="rounded-md border p-2 grid grid-cols-2 gap-1.5">
                    {ALL_ROLES.map((r) => {
                      const checked = rolesToAdd.includes(r);
                      return (
                        <label
                          key={r}
                          className="flex items-center gap-2 text-[12px] cursor-pointer hover:bg-accent rounded px-1.5 py-1"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              setRolesToAdd((prev) =>
                                e.target.checked ? [...prev, r] : prev.filter((x) => x !== r),
                              );
                            }}
                          />
                          {ROLE_LABEL[r]}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={assignRole} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Atribuir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <TooltipProvider>
            <div className="overflow-x-auto -mx-2.5">
              <table className="w-full text-[12px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left font-medium px-2.5 py-1.5 text-[11px] text-muted-foreground sticky left-0 bg-card z-10">
                      Usuário
                    </th>
                    <th className="text-left font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                      Funções
                    </th>
                    <th className="text-left font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                      Equipe
                    </th>
                    {MODULES.map((m) => (
                      <th
                        key={m.key}
                        className="text-center font-medium px-2 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap"
                      >
                        {m.label}
                      </th>
                    ))}
                    <th className="text-center font-medium px-2 py-1.5 text-[11px] text-muted-foreground">
                      Ativo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isAdminRow = u.roles.includes("admin");
                    const availableRoles = ALL_ROLES.filter((r) => !u.roles.includes(r));
                    return (
                      <tr key={u.id} className="border-t border-border align-top">
                        <td className="px-2.5 py-1.5 sticky left-0 bg-card">
                          <div className="font-medium leading-tight">{u.nome}</div>
                          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                            {u.email}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap gap-1 items-center">
                            {u.roles.length === 0 && (
                              <span className="text-[11px] text-muted-foreground">Sem função</span>
                            )}
                            {u.roles.map((r) => (
                              <Badge
                                key={r}
                                variant="secondary"
                                className="gap-1 h-5 px-1.5 text-[11px] font-normal"
                              >
                                {ROLE_LABEL[r]}
                                <button
                                  onClick={() => removeRole(u, r)}
                                  className="hover:text-destructive"
                                  aria-label={`Remover função ${ROLE_LABEL[r]}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            {availableRoles.length > 0 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className="h-5 w-5 inline-flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                                    aria-label="Adicionar função"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-44 p-1" align="start">
                                  <div className="space-y-0.5">
                                    {availableRoles.map((r) => (
                                      <button
                                        key={r}
                                        onClick={() => addRole(u, r)}
                                        className="w-full text-left px-2 py-1 text-[12px] rounded hover:bg-accent"
                                      >
                                        {ROLE_LABEL[r]}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <Select
                            value={u.team_id ?? "none"}
                            onValueChange={(v) => setTeam(u, v === "none" ? null : v)}
                          >
                            <SelectTrigger className="h-7 w-[150px] text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Sem equipe —</SelectItem>
                              {teams.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.nome} ({ROLE_LABEL[t.papel_principal]})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        {MODULES.map((m) => {
                          const checked = isAdminRow ? true : matrix[u.id]?.[m.key] ?? false;
                          const sw = (
                            <Switch
                              checked={checked}
                              disabled={!isAdmin || isAdminRow}
                              onCheckedChange={(v) => toggleModule(u, m.key, !!v)}
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
                        <td className="text-center px-2 py-1.5">
                          <Switch
                            checked={u.ativo}
                            onCheckedChange={() => toggleAtivo(u)}
                            aria-label={`${u.nome} ativo`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={MODULES.length + 4}
                        className="text-center text-muted-foreground py-3 text-[11px]"
                      >
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </Card>
    </div>
  );
}
