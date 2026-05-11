import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { AppRole, ROLE_LABEL, PRIMARY_ROLES } from "@/lib/roles";

const ALL_ROLES: AppRole[] = [...PRIMARY_ROLES, "gestor_geral"];

interface Team { id: string; nome: string; papel_principal: AppRole; }
interface UserRow {
  id: string; nome: string; email: string; ativo: boolean; cargo: string | null;
  team_id: string | null;
  roles: AppRole[]; created_at: string;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [emailLookup, setEmailLookup] = useState("");
  const [rolesToAdd, setRolesToAdd] = useState<AppRole[]>([]);
  const [adding, setAdding] = useState(false);

  const teamsById = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: t }] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.from("teams").select("id,nome,papel_principal").eq("ativo", true).order("nome"),
    ]);
    setLoading(false);
    if (error) { toast.error("Erro ao listar", { description: error.message }); return; }
    setUsers((data as UserRow[]) ?? []);
    setTeams((t as Team[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const toggleAtivo = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ ativo: !u.ativo }).eq("id", u.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success(`Usuário ${!u.ativo ? "ativado" : "desativado"}`);
    load();
  };

  const removeRole = async (u: UserRow, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Função removida");
    load();
  };

  const toggleGestorGeral = async (u: UserRow, on: boolean) => {
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "gestor_geral" });
      if (error && !error.message.includes("duplicate")) { toast.error("Erro", { description: error.message }); return; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "gestor_geral");
      if (error) { toast.error("Erro", { description: error.message }); return; }
    }
    toast.success(on ? "Marcado como gestor geral" : "Removido gestor geral");
    load();
  };

  const setTeam = async (u: UserRow, teamId: string | null) => {
    const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", u.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Equipe atualizada");
    load();
  };

  const assignRole = async () => {
    if (!emailLookup.trim()) { toast.error("Selecione um usuário"); return; }
    if (rolesToAdd.length === 0) { toast.error("Selecione ao menos uma função"); return; }
    setAdding(true);
    const { data: uid, error: e1 } = await supabase.rpc("admin_find_user_by_email", { _email: emailLookup.trim() });
    if (e1 || !uid) {
      setAdding(false);
      toast.error("Usuário não encontrado", { description: "O usuário precisa ter feito login pelo menos uma vez." });
      return;
    }
    const rows = rolesToAdd.map((r) => ({ user_id: uid as string, role: r }));
    const { error: e2 } = await supabase.from("user_roles").upsert(rows, { onConflict: "user_id,role", ignoreDuplicates: true });
    setAdding(false);
    if (e2) {
      toast.error("Erro", { description: e2.message });
      return;
    }
    toast.success(rolesToAdd.length > 1 ? "Funções atribuídas" : "Função atribuída");
    setEmailLookup(""); setRolesToAdd([]); setAssignOpen(false); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[20px] font-medium tracking-tight">Usuários</h1>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">{users.length} usuários</span>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Atribuir função</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atribuir função a usuário</DialogTitle>
                <DialogDescription>O usuário precisa ter criado uma conta no sistema (login feito ao menos uma vez).</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={emailLookup} onValueChange={setEmailLookup}>
                    <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
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
                        <label key={r} className="flex items-center gap-2 text-[12px] cursor-pointer hover:bg-accent rounded px-1.5 py-1">
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
                  {rolesToAdd.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">{rolesToAdd.length} selecionada(s)</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancelar</Button>
                <Button onClick={assignRole} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Atribuir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-card mt-4">

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Funções</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead className="w-px text-right pr-3">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-3 text-[12px]">Carregando...</TableCell></TableRow>}
            {!loading && users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-3 text-[12px]">Nenhum usuário.</TableCell></TableRow>}
            {users.map((u) => {
              return (
                <TableRow key={u.id} className="group">
                  <TableCell>
                    <div className="font-medium">{u.nome}</div>
                    {u.cargo && <div className="text-[11px] text-muted-foreground">{u.cargo}</div>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-[11px] text-muted-foreground">Sem função</span>}
                      {u.roles.map(r => (
                        <Badge key={r} variant="secondary" className="gap-1 h-5 px-2 text-[11px] font-normal">
                          {ROLE_LABEL[r]}
                          <button onClick={() => removeRole(u, r)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={u.team_id ?? "none"} onValueChange={(v) => setTeam(u, v === "none" ? null : v)}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem equipe —</SelectItem>
                        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome} ({ROLE_LABEL[t.papel_principal]})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right pr-3">
                    <Switch className="ml-auto" checked={u.ativo} onCheckedChange={() => toggleAtivo(u)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
