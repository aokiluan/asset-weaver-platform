import { useEffect, useState } from "react";
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

type AppRole =
  | "admin" | "gestor_comercial" | "comercial" | "analista_credito"
  | "comite" | "gestor_risco" | "financeiro" | "operacional"
  | "gestor_credito" | "gestor_financeiro" | "relacao_investidor"
  | "gestor_relacao_investidor" | "analista_cadastro";

interface UserRow {
  id: string; nome: string; email: string; ativo: boolean; cargo: string | null;
  roles: AppRole[]; created_at: string;
}

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  gestor_comercial: "Gestor Comercial",
  comercial: "Comercial",
  analista_cadastro: "Analista de Cadastro",
  analista_credito: "Analista de Crédito",
  gestor_credito: "Gestor de Crédito",
  comite: "Comitê",
  gestor_risco: "Gestor de Risco",
  financeiro: "Financeiro",
  gestor_financeiro: "Gestor Financeiro",
  relacao_investidor: "Relação com Investidor",
  gestor_relacao_investidor: "Gestor de RI",
  operacional: "Operacional",
};
const ALL_ROLES: AppRole[] = [
  "admin","gestor_comercial","comercial",
  "analista_cadastro","analista_credito","gestor_credito",
  "comite","gestor_risco",
  "financeiro","gestor_financeiro",
  "relacao_investidor","gestor_relacao_investidor",
  "operacional",
];

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [emailLookup, setEmailLookup] = useState("");
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("comercial");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    setLoading(false);
    if (error) { toast.error("Erro ao listar", { description: error.message }); return; }
    setUsers((data as UserRow[]) ?? []);
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

  const assignRole = async () => {
    if (!emailLookup.trim()) { toast.error("Informe o e-mail"); return; }
    setAdding(true);
    const { data: uid, error: e1 } = await supabase.rpc("admin_find_user_by_email", { _email: emailLookup.trim() });
    if (e1 || !uid) {
      setAdding(false);
      toast.error("Usuário não encontrado", { description: "O usuário precisa ter feito login pelo menos uma vez." });
      return;
    }
    const { error: e2 } = await supabase.from("user_roles").insert({ user_id: uid as string, role: roleToAdd });
    setAdding(false);
    if (e2) {
      if (e2.message.includes("duplicate")) toast.error("Usuário já tem essa função");
      else toast.error("Erro", { description: e2.message });
      return;
    }
    toast.success("Função atribuída");
    setEmailLookup(""); setAssignOpen(false); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, papéis e status de acesso.</p>
        </div>
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Atribuir função</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir função a usuário</DialogTitle>
              <DialogDescription>O usuário precisa ter criado uma conta no sistema (login feito ao menos uma vez).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail do usuário</Label>
                <Input type="email" value={emailLookup} onChange={(e) => setEmailLookup(e.target.value)} placeholder="usuario@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
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

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Funções</TableHead>
              <TableHead className="w-[120px]">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário.</TableCell></TableRow>}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.nome}</div>
                  {u.cargo && <div className="text-xs text-muted-foreground">{u.cargo}</div>}
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">Sem função</span>}
                    {u.roles.map(r => (
                      <Badge key={r} variant="secondary" className="gap-1">
                        {ROLE_LABEL[r]}
                        <button onClick={() => removeRole(u, r)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={u.ativo} onCheckedChange={() => toggleAtivo(u)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
