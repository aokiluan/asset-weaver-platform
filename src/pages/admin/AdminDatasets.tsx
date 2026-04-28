import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ColType = "text" | "number" | "date";
interface SchemaCol { key: string; label: string; type: ColType }
interface Dataset {
  id: string; nome: string; slug: string; descricao: string | null;
  schema: SchemaCol[]; ativo: boolean;
}

const empty: Partial<Dataset> = { nome: "", slug: "", descricao: "", schema: [], ativo: true };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function AdminDatasets() {
  const [items, setItems] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Dataset>>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Datasets | Painel de Gestão"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("report_datasets").select("*").order("nome");
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setItems((data as any) ?? []);
  };

  const addCol = () => {
    const cols = [...(editing.schema ?? [])];
    cols.push({ key: "", label: "", type: "text" });
    setEditing({ ...editing, schema: cols });
  };
  const updateCol = (i: number, patch: Partial<SchemaCol>) => {
    const cols = [...(editing.schema ?? [])];
    cols[i] = { ...cols[i], ...patch };
    if (patch.label !== undefined && !cols[i].key) cols[i].key = slugify(patch.label);
    setEditing({ ...editing, schema: cols });
  };
  const removeCol = (i: number) => {
    const cols = [...(editing.schema ?? [])];
    cols.splice(i, 1);
    setEditing({ ...editing, schema: cols });
  };

  const save = async () => {
    if (!editing.nome) { toast.error("Informe o nome"); return; }
    const slug = editing.slug || slugify(editing.nome);
    const cols = (editing.schema ?? []).filter((c) => c.key && c.label);
    setSaving(true);
    const payload = {
      nome: editing.nome, slug, descricao: editing.descricao || null,
      schema: cols, ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("report_datasets").update(payload).eq("id", editing.id)
      : await supabase.from("report_datasets").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Dataset salvo");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("report_datasets").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Dataset removido"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tipos de relatório</h1>
          <p className="text-sm text-muted-foreground">
            Defina os "moldes" das planilhas que serão importadas (colunas esperadas e tipos).
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" />Novo dataset</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing.id ? "Editar dataset" : "Novo dataset"}</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (identificador)</Label>
                  <Input value={editing.slug ?? ""} placeholder="auto" onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <Label>Ativo</Label>
              </div>

              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Colunas esperadas</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addCol}>
                    <Plus className="h-3 w-3 mr-1" /> Coluna
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use exatamente o nome do cabeçalho da planilha em "Rótulo". O sistema casará por esse texto.
                </p>
                {(editing.schema ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Sem colunas — o sistema importa o arquivo como veio.</p>
                )}
                {(editing.schema ?? []).map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_140px_auto] gap-2 items-end">
                    <div>
                      <Label className="text-[11px]">Rótulo (cabeçalho)</Label>
                      <Input value={c.label} onChange={(e) => updateCol(i, { label: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Chave interna</Label>
                      <Input value={c.key} onChange={(e) => updateCol(i, { key: slugify(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Tipo</Label>
                      <Select value={c.type} onValueChange={(v) => updateCol(i, { type: v as ColType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCol(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Colunas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum dataset.</TableCell></TableRow>
            ) : items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.nome}</TableCell>
                <TableCell className="text-muted-foreground">{d.slug}</TableCell>
                <TableCell>{(d.schema ?? []).length}</TableCell>
                <TableCell>{d.ativo ? "Ativo" : "Inativo"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover dataset?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os uploads e linhas vinculados também serão apagados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(d.id)}>Remover</AlertDialogAction>
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
