import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ApproverKind = "analista_credito" | "gestor_risco" | "comite";

interface Level {
  id: string; nome: string; valor_min: number; valor_max: number | null;
  approver: ApproverKind; votos_minimos: number; ordem: number; ativo: boolean;
}

const APPROVER_LABEL: Record<ApproverKind, string> = {
  analista_credito: "Crédito (analista)",
  gestor_risco: "Crédito (gestor)",
  comite: "Comitê",
};

const fmtBRL = (v: number | null) =>
  v == null ? "Sem teto" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const empty: Partial<Level> = { nome: "", valor_min: 0, valor_max: null, approver: "analista_credito", votos_minimos: 1, ordem: 0, ativo: true };

export default function AdminAlcadas() {
  const [items, setItems] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Level>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("approval_levels").select("*").order("ordem");
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setItems((data as Level[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.nome) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const payload = {
      nome: editing.nome,
      valor_min: Number(editing.valor_min ?? 0),
      valor_max: editing.valor_max ? Number(editing.valor_max) : null,
      approver: editing.approver as ApproverKind,
      votos_minimos: Number(editing.votos_minimos ?? 1),
      ordem: Number(editing.ordem ?? 0),
      ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("approval_levels").update(payload).eq("id", editing.id)
      : await supabase.from("approval_levels").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Alçada salva");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("approval_levels").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Alçada removida"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Alçadas de aprovação</h1>
          <p className="text-muted-foreground">Faixas de valor que definem quem aprova cada proposta.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" /> Nova faixa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.id ? "Editar alçada" : "Nova alçada"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor mínimo (R$)</Label>
                  <CurrencyInput
                    value={editing.valor_min ?? 0}
                    onValueChange={(v) => setEditing({ ...editing, valor_min: v ?? 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor máximo (R$)</Label>
                  <CurrencyInput
                    placeholder="vazio = sem teto"
                    value={editing.valor_max}
                    onValueChange={(v) => setEditing({ ...editing, valor_max: v })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Aprovador</Label>
                  <Select value={editing.approver} onValueChange={(v) => setEditing({ ...editing, approver: v as ApproverKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analista_credito">Crédito (analista)</SelectItem>
                      <SelectItem value="gestor_risco">Crédito (gestor)</SelectItem>
                      <SelectItem value="comite">Comitê</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Votos mínimos</Label>
                  <Input type="number" min={1} value={editing.votos_minimos ?? 1}
                    onChange={(e) => setEditing({ ...editing, votos_minimos: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.ordem ?? 0}
                    onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                  <Label>Ativo</Label>
                </div>
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
              <TableHead>Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Faixa</TableHead>
              <TableHead>Aprovador</TableHead>
              <TableHead>Votos mín.</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-px text-right pr-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {items.map(l => (
              <TableRow key={l.id} className="group">
                <TableCell>{l.ordem}</TableCell>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell>{fmtBRL(l.valor_min)} → {fmtBRL(l.valor_max)}</TableCell>
                <TableCell>{APPROVER_LABEL[l.approver]}</TableCell>
                <TableCell>{l.votos_minimos}</TableCell>
                <TableCell>{l.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right pr-3">
                  <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover alçada?</AlertDialogTitle>
                          <AlertDialogDescription>Propostas existentes que usam esta faixa ficarão sem alçada vinculada.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(l.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
