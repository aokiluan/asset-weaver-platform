import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { InvestorSeries } from "@/lib/investor-boletas";

const empty: Partial<InvestorSeries> = {
  nome: "", indexador: "CDI", spread: 0, prazo_meses: 12, ativa: true, ordem: 0,
};

export default function AdminSeriesInvestidor() {
  const [items, setItems] = useState<InvestorSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<InvestorSeries>>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("investor_series").select("*").order("ordem");
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setItems((data ?? []) as InvestorSeries[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.nome) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const payload = {
      nome: editing.nome,
      descricao: editing.descricao ?? null,
      indexador: editing.indexador ?? null,
      spread: editing.spread != null ? Number(editing.spread) : null,
      prazo_meses: editing.prazo_meses != null ? Number(editing.prazo_meses) : null,
      ativa: editing.ativa ?? true,
      ordem: Number(editing.ordem ?? 0),
    };
    const { error } = editing.id
      ? await supabase.from("investor_series").update(payload).eq("id", editing.id)
      : await supabase.from("investor_series").insert(payload);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Série salva");
    setOpen(false); setEditing(empty); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("investor_series").delete().eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Série removida"); load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[14px] font-medium">Séries de investimento</div>
        <Button size="sm" className="h-7" onClick={() => { setEditing(empty); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova série
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Nome</TableHead>
              <TableHead className="text-[11px]">Indexador</TableHead>
              <TableHead className="text-[11px]">Spread (%)</TableHead>
              <TableHead className="text-[11px]">Prazo (meses)</TableHead>
              <TableHead className="text-[11px]">Ativa</TableHead>
              <TableHead className="text-[11px] w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-[12px]">{s.nome}</TableCell>
                <TableCell className="text-[12px]">{s.indexador ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{s.spread ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{s.prazo_meses ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{s.ativa ? "Sim" : "Não"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-[12px] py-6">Nenhuma série cadastrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Editar série" : "Nova série"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
              <Input className="h-7 text-[12px]" value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[10px] uppercase text-muted-foreground">Indexador</Label>
                <Input className="h-7 text-[12px]" value={editing.indexador ?? ""} onChange={(e) => setEditing({ ...editing, indexador: e.target.value })} /></div>
              <div><Label className="text-[10px] uppercase text-muted-foreground">Spread (%)</Label>
                <Input type="number" step="0.01" className="h-7 text-[12px]" value={editing.spread ?? 0} onChange={(e) => setEditing({ ...editing, spread: Number(e.target.value) })} /></div>
              <div><Label className="text-[10px] uppercase text-muted-foreground">Prazo (meses)</Label>
                <Input type="number" className="h-7 text-[12px]" value={editing.prazo_meses ?? 0} onChange={(e) => setEditing({ ...editing, prazo_meses: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.ativa ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativa: v })} />
              <Label className="text-[12px]">Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" className="h-7" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
