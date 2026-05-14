import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Categoria {
  id: string; nome: string; descricao: string | null;
  obrigatorio: boolean; ordem: number; ativo: boolean;
}
const empty: Partial<Categoria> = { nome: "", descricao: "", obrigatorio: false, ordem: 0, ativo: true };

export default function AdminCategorias() {
  const [items, setItems] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Categoria>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("documento_categorias").select("*").order("ordem");
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setItems((data as Categoria[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.nome) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const payload = {
      nome: editing.nome,
      descricao: editing.descricao || null,
      obrigatorio: editing.obrigatorio ?? false,
      ordem: Number(editing.ordem ?? 0),
      ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("documento_categorias").update(payload).eq("id", editing.id)
      : await supabase.from("documento_categorias").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Categoria salva");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("documento_categorias").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Categoria removida"); load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Categorias de Documento</h1>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" /> Nova categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.ordem ?? 0}
                    onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editing.obrigatorio ?? false} onCheckedChange={(v) => setEditing({ ...editing, obrigatorio: v })} />
                  <Label>Obrigatório</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
              <TableHead>Descrição</TableHead>
              <TableHead>Obrigatório</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-px text-right pr-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {items.map(c => (
              <TableRow key={c.id} className="group">
                <TableCell>{c.ordem}</TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-muted-foreground">{c.descricao ?? "—"}</TableCell>
                <TableCell>{c.obrigatorio ? "Sim" : "Não"}</TableCell>
                <TableCell>{c.ativo ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right pr-3">
                  <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
                          <AlertDialogDescription>Documentos associados ficarão sem categoria.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(c.id)}>Remover</AlertDialogAction>
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
