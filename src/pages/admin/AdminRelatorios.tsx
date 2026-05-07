import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, RefreshCw, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Dataset { id: string; nome: string; slug: string }
interface Upload {
  id: string; dataset_id: string; arquivo_nome: string; storage_path: string;
  periodo_referencia: string; linhas_total: number;
  status: "pendente" | "processando" | "processado" | "erro";
  erro_msg: string | null; created_at: string;
}

const statusColor: Record<Upload["status"], string> = {
  pendente: "bg-muted text-muted-foreground",
  processando: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  processado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  erro: "bg-destructive/15 text-destructive",
};

export default function AdminRelatorios() {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filtro, setFiltro] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [datasetId, setDatasetId] = useState("");
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Relatórios | Painel de Gestão"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: ds }, { data: ups }] = await Promise.all([
      supabase.from("report_datasets").select("id, nome, slug").eq("ativo", true).order("nome"),
      supabase.from("report_uploads").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setDatasets((ds as any) ?? []);
    setUploads((ups as any) ?? []);
    setLoading(false);
  };

  const enviar = async () => {
    if (!file || !datasetId || !periodo) { toast.error("Selecione dataset, período e arquivo"); return; }
    if (!user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${datasetId}/${periodo}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("report-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await supabase.from("report_uploads").insert({
        dataset_id: datasetId,
        arquivo_nome: file.name,
        storage_path: path,
        periodo_referencia: periodo,
        uploaded_by: user.id,
        status: "pendente",
      }).select("id").single();
      if (insErr) throw insErr;

      const { data: invokeData, error: invokeErr } = await supabase.functions.invoke("ingest-report", {
        body: { upload_id: row!.id },
      });
      if (invokeErr) throw invokeErr;
      if ((invokeData as any)?.error) throw new Error((invokeData as any).error);

      toast.success("Relatório processado", { description: `${(invokeData as any).inserted ?? 0} linhas importadas.` });
      setOpen(false); setFile(null); setDatasetId(""); load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha no envio";
      toast.error("Erro", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const reprocessar = async (id: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-report", { body: { upload_id: id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Reprocessado");
      load();
    } catch (e) {
      toast.error("Erro", { description: e instanceof Error ? e.message : "Falha" });
    } finally { setBusy(false); }
  };

  const remover = async (u: Upload) => {
    await supabase.storage.from("report-files").remove([u.storage_path]);
    const { error } = await supabase.from("report_uploads").delete().eq("id", u.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Upload removido"); load();
  };

  const visiveis = filtro === "all" ? uploads : uploads.filter((u) => u.dataset_id === filtro);
  const datasetNome = (id: string) => datasets.find((d) => d.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Envie planilhas externas (CSV/XLSX) para alimentar o dashboard.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Upload className="h-4 w-4 mr-2" />Novo upload</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar relatório</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Tipo de relatório</Label>
                <Select value={datasetId} onValueChange={setDatasetId}>
                  <SelectTrigger><SelectValue placeholder="Escolha o dataset" /></SelectTrigger>
                  <SelectContent>
                    {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de referência</Label>
                <Input type="date" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Arquivo (CSV ou XLSX)</Label>
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={enviar} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar e processar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Filtrar:</Label>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os datasets</SelectItem>
            {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Arquivo</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Linhas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : visiveis.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum upload ainda.</TableCell></TableRow>
            ) : visiveis.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate max-w-[260px]">{u.arquivo_nome}</span>
                </TableCell>
                <TableCell>{datasetNome(u.dataset_id)}</TableCell>
                <TableCell>{new Date(u.periodo_referencia).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{u.linhas_total}</TableCell>
                <TableCell>
                  <Badge className={statusColor[u.status]} variant="outline">{u.status}</Badge>
                  {u.erro_msg && <p className="text-[11px] text-destructive mt-1 max-w-[220px] truncate" title={u.erro_msg}>{u.erro_msg}</p>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => reprocessar(u.id)} disabled={busy} title="Reprocessar">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover upload?</AlertDialogTitle>
                          <AlertDialogDescription>O arquivo e todas as linhas importadas serão apagados.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remover(u)}>Remover</AlertDialogAction>
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
