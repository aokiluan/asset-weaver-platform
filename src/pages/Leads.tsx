import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { LeadFormDialog, LeadFormValues } from "@/components/leads/LeadFormDialog";
import { toast } from "sonner";

interface LeadRow {
  id: string;
  tipo: "cedente" | "investidor";
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  valor_estimado: number | null;
  stage_id: string | null;
  owner_id: string | null;
  created_at: string;
  pipeline_stages: { nome: string; cor: string | null } | null;
  owner: { nome: string } | null;
}

interface Stage { id: string; nome: string }

export default function Leads() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LeadFormValues> | undefined>(undefined);

  useEffect(() => { document.title = "Leads | Securitizadora"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select(`
        id, tipo, nome, empresa, email, telefone, valor_estimado,
        stage_id, owner_id, created_at,
        pipeline_stages:stage_id (nome, cor),
        owner:profiles!leads_owner_id_fkey (nome)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback sem o join de owner se a relação não estiver inferida
      const { data: simple } = await supabase
        .from("leads")
        .select(`id, tipo, nome, empresa, email, telefone, valor_estimado, stage_id, owner_id, created_at, pipeline_stages:stage_id (nome, cor)`)
        .order("created_at", { ascending: false });
      setLeads((simple ?? []) as any);
    } else {
      setLeads((data ?? []) as any);
    }

    const { data: st } = await supabase.from("pipeline_stages").select("id,nome").eq("ativo", true).order("ordem");
    setStages(st ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Lead excluído");
    load();
  };

  const filtered = leads.filter((l) => {
    if (tipoFilter !== "all" && l.tipo !== tipoFilter) return false;
    if (stageFilter !== "all" && l.stage_id !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.nome.toLowerCase().includes(q) ||
        (l.empresa ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmt = (v: number | null) =>
    v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Cedentes e investidores no pipeline comercial.</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo lead
        </Button>
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, empresa ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="cedente">Cedente</SelectItem>
                <SelectItem value="investidor">Investidor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-px text-right pr-3">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id} className="group">
                      <TableCell className="font-medium">
                        {l.nome}
                        {l.email && <div className="text-xs text-muted-foreground">{l.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === "cedente" ? "default" : "secondary"}>{l.tipo}</Badge>
                      </TableCell>
                      <TableCell>{l.empresa ?? "—"}</TableCell>
                      <TableCell>
                        {l.pipeline_stages ? (
                          <span className="inline-flex items-center gap-2 text-sm">
                            <span className="h-2 w-2 rounded-full" style={{ background: l.pipeline_stages.cor ?? "hsl(var(--primary))" }} />
                            {l.pipeline_stages.nome}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{(l as any).owner?.nome ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(l.valor_estimado)}</TableCell>
                      <TableCell className="text-right pr-3">
                        <div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(l as any); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação remove permanentemente <strong>{l.nome}</strong> e suas interações.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(l.id)}>Excluir</AlertDialogAction>
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
          )}
        </CardContent>
      </Card>

      <LeadFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}
