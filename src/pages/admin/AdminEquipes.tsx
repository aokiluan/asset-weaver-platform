import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { AppRole, ROLE_LABEL, PRIMARY_ROLES } from "@/lib/roles";

const TEAM_ROLES: AppRole[] = PRIMARY_ROLES.filter(r => r !== "admin");

interface Team {
  id: string; nome: string; papel_principal: AppRole;
  gestor_id: string | null; ativo: boolean;
}
interface Profile { id: string; nome: string; email: string; team_id: string | null; }

const empty: Partial<Team> = { nome: "", papel_principal: "comercial", gestor_id: null, ativo: true };

export default function AdminEquipes() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Team>>(empty);
  const [saving, setSaving] = useState(false);

  const profilesById = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);
  const membersByTeam = useMemo(() => {
    const map: Record<string, Profile[]> = {};
    for (const p of profiles) {
      if (p.team_id) (map[p.team_id] ||= []).push(p);
    }
    return map;
  }, [profiles]);

  const load = async () => {
    setLoading(true);
    const [{ data: t, error: e1 }, { data: p }] = await Promise.all([
      supabase.from("teams").select("*").order("nome"),
      supabase.rpc("admin_list_users"),
    ]);
    setLoading(false);
    if (e1) { toast.error("Erro", { description: e1.message }); return; }
    setTeams((t as Team[]) ?? []);
    setProfiles(((p as any[]) ?? []).map(x => ({ id: x.id, nome: x.nome, email: x.email, team_id: x.team_id })));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.nome?.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const payload = {
      nome: editing.nome.trim(),
      papel_principal: editing.papel_principal as AppRole,
      gestor_id: editing.gestor_id || null,
      ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("teams").update(payload).eq("id", editing.id)
      : await supabase.from("teams").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Equipe salva");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Equipe removida"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipes</h1>
          <p className="text-muted-foreground">
            Organize usuários em equipes. O gestor da equipe vê apenas os membros dela; gestores gerais veem tudo do papel.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" /> Nova equipe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.id ? "Editar equipe" : "Nova equipe"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Papel principal</Label>
                <Select value={editing.papel_principal} onValueChange={(v) => setEditing({ ...editing, papel_principal: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gestor da equipe</Label>
                <Select
                  value={editing.gestor_id ?? "none"}
                  onValueChange={(v) => setEditing({ ...editing, gestor_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem gestor —</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel principal</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead><Users className="h-4 w-4 inline mr-1" /> Membros</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="w-px text-right pr-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!loading && teams.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma equipe ainda.</TableCell></TableRow>}
            {teams.map(t => {
              const gestor = t.gestor_id ? profilesById[t.gestor_id] : null;
              const members = membersByTeam[t.id] ?? [];
              return (
                <TableRow key={t.id} className="group">
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell><Badge variant="outline">{ROLE_LABEL[t.papel_principal]}</Badge></TableCell>
                  <TableCell>{gestor ? gestor.nome : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{members.length}</TableCell>
                  <TableCell>{t.ativo ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right pr-3">
                    <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover equipe?</AlertDialogTitle>
                            <AlertDialogDescription>Os membros ficarão sem equipe atribuída.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(t.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
