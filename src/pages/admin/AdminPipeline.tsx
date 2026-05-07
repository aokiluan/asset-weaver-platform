import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Stage {
  id: string; nome: string; ordem: number; cor: string | null;
  is_ganho: boolean; is_perdido: boolean; ativo: boolean;
}
const empty: Partial<Stage> = { nome: "", ordem: 0, cor: "#3b6fa0", is_ganho: false, is_perdido: false, ativo: true };

export default function AdminPipeline() {
  const [items, setItems] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Stage>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pipeline_stages").select("*").order("ordem");
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setItems((data as Stage[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.nome) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const payload = {
      nome: editing.nome,
      ordem: Number(editing.ordem ?? 0),
      cor: editing.cor ?? "#3b6fa0",
      is_ganho: editing.is_ganho ?? false,
      is_perdido: editing.is_perdido ?? false,
      ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("pipeline_stages").update(payload).eq("id", editing.id)
      : await supabase.from("pipeline_stages").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Estágio salvo");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Estágio removido"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Estágios do Pipeline</h1>
          <p className="text-muted-foreground">Configure as colunas do funil comercial.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" /> Novo estágio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Editar estágio" : "Novo estágio"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.ordem ?? 0}
                    onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input type="color" value={editing.cor ?? "#3b6fa0"}
                    onChange={(e) => setEditing({ ...editing, cor: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.is_ganho ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_ganho: v, is_perdido: v ? false : editing.is_perdido })} />
                <Label>Estágio de ganho</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.is_perdido ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_perdido: v, is_ganho: v ? false : editing.is_ganho })} />
                <Label>Estágio de perdido</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar</Button>
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
              <TableHead>Cor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-px text-right pr-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {items.map(s => (
              <TableRow key={s.id} className="group">
                <TableCell>{s.ordem}</TableCell>
                <TableCell className="font-medium">{s.nome}</TableCell>
                <TableCell><span className="inline-block h-4 w-8 rounded" style={{ backgroundColor: s.cor ?? "#ccc" }} /></TableCell>
                <TableCell>{s.is_ganho ? "Ganho" : s.is_perdido ? "Perdido" : "Em andamento"}</TableCell>
                <TableCell>{s.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right pr-3">
                  <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover estágio?</AlertDialogTitle>
                          <AlertDialogDescription>Leads neste estágio ficarão sem estágio definido.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(s.id)}>Remover</AlertDialogAction>
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
