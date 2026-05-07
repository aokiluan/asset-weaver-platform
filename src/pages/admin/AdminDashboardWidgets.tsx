import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DynamicWidget, WidgetDef, WidgetConfig } from "@/components/DynamicWidget";

interface SchemaCol { key: string; label: string; type: "text" | "number" | "date" }
interface Dataset { id: string; nome: string; schema: SchemaCol[] }

interface WidgetRow extends WidgetDef {
  ordem: number; ativo: boolean;
}

const empty: Partial<WidgetRow> = {
  titulo: "", descricao: "", dataset_id: "", tipo: "kpi",
  config: { agg: "sum", scope: "latest", format: "number" },
  ordem: 0, largura: 1, ativo: true,
};

export default function AdminDashboardWidgets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [items, setItems] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WidgetRow>>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { document.title = "Widgets | Painel de Gestão"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: ds }, { data: ws }] = await Promise.all([
      supabase.from("report_datasets").select("id, nome, schema").eq("ativo", true).order("nome"),
      supabase.from("dashboard_widgets").select("*").order("ordem"),
    ]);
    setDatasets((ds as any) ?? []);
    setItems((ws as any) ?? []);
    setLoading(false);
  };

  const dsAtual = useMemo(
    () => datasets.find((d) => d.id === editing.dataset_id),
    [datasets, editing.dataset_id]
  );
  const colunas: SchemaCol[] = dsAtual?.schema ?? [];
  const colunasNum = colunas.filter((c) => c.type === "number");

  const updateConfig = (patch: Partial<WidgetConfig>) =>
    setEditing({ ...editing, config: { ...(editing.config ?? {}), ...patch } });

  const save = async () => {
    if (!editing.titulo || !editing.dataset_id || !editing.tipo) {
      toast.error("Preencha título, dataset e tipo"); return;
    }
    setSaving(true);
    const payload = {
      titulo: editing.titulo,
      descricao: editing.descricao || null,
      dataset_id: editing.dataset_id,
      tipo: editing.tipo,
      config: (editing.config ?? {}) as any,
      ordem: Number(editing.ordem ?? 0),
      largura: Number(editing.largura ?? 1),
      ativo: editing.ativo ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("dashboard_widgets").update(payload).eq("id", editing.id)
      : await supabase.from("dashboard_widgets").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Widget salvo");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dashboard_widgets").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Widget removido"); load();
  };

  const cfg = (editing.config ?? {}) as WidgetConfig;
  const previewWidget: WidgetDef | null = editing.dataset_id && editing.titulo ? {
    id: editing.id ?? "preview",
    titulo: editing.titulo!,
    descricao: editing.descricao ?? null,
    dataset_id: editing.dataset_id!,
    tipo: editing.tipo as any,
    config: cfg,
    largura: Number(editing.largura ?? 1),
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Widgets do Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Configure os cartões e gráficos que aparecem no painel principal.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-2" />Novo widget</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{editing.id ? "Editar widget" : "Novo widget"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={editing.titulo ?? ""} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea value={editing.descricao ?? ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Dataset</Label>
                    <Select value={editing.dataset_id ?? ""} onValueChange={(v) => setEditing({ ...editing, dataset_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                      <SelectContent>
                        {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={editing.tipo ?? "kpi"} onValueChange={(v) => setEditing({ ...editing, tipo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kpi">KPI (número)</SelectItem>
                        <SelectItem value="bar">Barra</SelectItem>
                        <SelectItem value="line">Linha (temporal)</SelectItem>
                        <SelectItem value="pie">Pizza</SelectItem>
                        <SelectItem value="table">Tabela</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Métrica (coluna numérica)</Label>
                    <Select value={cfg.metric_col ?? ""} onValueChange={(v) => updateConfig({ metric_col: v })}>
                      <SelectTrigger><SelectValue placeholder="(contagem de linhas)" /></SelectTrigger>
                      <SelectContent>
                        {colunasNum.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Agregação</Label>
                    <Select value={cfg.agg ?? "sum"} onValueChange={(v) => updateConfig({ agg: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Soma</SelectItem>
                        <SelectItem value="avg">Média</SelectItem>
                        <SelectItem value="count">Contagem</SelectItem>
                        <SelectItem value="min">Mínimo</SelectItem>
                        <SelectItem value="max">Máximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(editing.tipo === "bar" || editing.tipo === "pie") && (
                  <div className="space-y-2">
                    <Label>Agrupar por</Label>
                    <Select value={cfg.group_col ?? ""} onValueChange={(v) => updateConfig({ group_col: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha a coluna" /></SelectTrigger>
                      <SelectContent>
                        {colunas.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Formato</Label>
                    <Select value={cfg.format ?? "number"} onValueChange={(v) => updateConfig({ format: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Número</SelectItem>
                        <SelectItem value="currency">Moeda (BRL)</SelectItem>
                        <SelectItem value="percent">Percentual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={cfg.scope ?? "latest"} onValueChange={(v) => updateConfig({ scope: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="latest">Último upload</SelectItem>
                        <SelectItem value="all">Todos os períodos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Largura</Label>
                    <Select value={String(editing.largura ?? 1)} onValueChange={(v) => setEditing({ ...editing, largura: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 coluna</SelectItem>
                        <SelectItem value="2">2 colunas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 items-end">
                  <div className="space-y-2">
                    <Label>Ordem</Label>
                    <Input type="number" value={editing.ordem ?? 0} onChange={(e) => setEditing({ ...editing, ordem: Number(e.target.value) })} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                    <Label>Ativo</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                {previewWidget ? (
                  <DynamicWidget widget={previewWidget} />
                ) : (
                  <div className="border rounded-md p-4 text-sm text-muted-foreground">
                    Preencha título e dataset para visualizar.
                  </div>
                )}
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
              <TableHead>Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px text-right pr-3">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum widget configurado.</TableCell></TableRow>
            ) : items.map((w) => (
              <TableRow key={w.id} className="group">
                <TableCell>{w.ordem}</TableCell>
                <TableCell className="font-medium">{w.titulo}</TableCell>
                <TableCell className="uppercase">{w.tipo}</TableCell>
                <TableCell className="text-muted-foreground">
                  {datasets.find((d) => d.id === w.dataset_id)?.nome ?? "—"}
                </TableCell>
                <TableCell>{w.ativo ? "Ativo" : "Inativo"}</TableCell>
                <TableCell className="text-right pr-3">
                  <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(w); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover widget?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(w.id)}>Remover</AlertDialogAction>
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
