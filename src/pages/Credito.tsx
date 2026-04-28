import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ExternalLink } from "lucide-react";
import { ProposalFormDialog } from "@/components/credito/ProposalFormDialog";
import { toast } from "sonner";

type Stage = "rascunho" | "analise" | "parecer" | "comite" | "aprovado" | "reprovado" | "cancelado";

interface ProposalRow {
  id: string;
  codigo: string;
  cedente_id: string;
  valor_solicitado: number;
  valor_aprovado: number | null;
  stage: Stage;
  created_at: string;
  cedentes: { razao_social: string } | null;
  approval_levels: { nome: string; approver: string } | null;
}

const STAGE_LABEL: Record<Stage, string> = {
  rascunho: "Rascunho", analise: "Análise", parecer: "Parecer", comite: "Comitê",
  aprovado: "Aprovado", reprovado: "Reprovado", cancelado: "Cancelado",
};
const STAGE_VARIANT: Record<Stage, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "outline", analise: "secondary", parecer: "secondary", comite: "secondary",
  aprovado: "default", reprovado: "destructive", cancelado: "outline",
};

const fmtBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Credito() {
  const [items, setItems] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("credit_proposals")
      .select("id,codigo,cedente_id,valor_solicitado,valor_aprovado,stage,created_at,cedentes(razao_social),approval_levels(nome,approver)")
      .order("created_at", { ascending: false });
    if (stageFilter !== "all") q = q.eq("stage", stageFilter as Stage);
    if (search.trim()) q = q.ilike("codigo", `%${search.trim()}%`);
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error("Erro ao carregar", { description: error.message }); return; }
    setItems((data as any) ?? []);
  };

  useEffect(() => { load(); }, [stageFilter]); // eslint-disable-line

  const totalPipeline = items
    .filter(i => !["aprovado", "reprovado", "cancelado"].includes(i.stage))
    .reduce((s, i) => s + Number(i.valor_solicitado), 0);
  const totalAprovado = items
    .filter(i => i.stage === "aprovado")
    .reduce((s, i) => s + Number(i.valor_aprovado ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Esteira de Crédito</h1>
          <p className="text-sm text-muted-foreground">Análise → Parecer → Comitê → Aprovação, com alçada por valor.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova proposta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Propostas</div>
          <div className="text-2xl font-semibold">{items.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Em andamento</div>
          <div className="text-2xl font-semibold">{items.filter(i => !["aprovado","reprovado","cancelado"].includes(i.stage)).length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Volume em pipeline</div>
          <div className="text-2xl font-semibold">{fmtBRL(totalPipeline)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Volume aprovado</div>
          <div className="text-2xl font-semibold">{fmtBRL(totalAprovado)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código..." value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()} className="pl-9" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estágios</SelectItem>
            <SelectItem value="analise">Análise</SelectItem>
            <SelectItem value="parecer">Parecer</SelectItem>
            <SelectItem value="comite">Comitê</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cedente</TableHead>
              <TableHead>Alçada</TableHead>
              <TableHead className="text-right">Solicitado</TableHead>
              <TableHead className="text-right">Aprovado</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!loading && items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma proposta.</TableCell></TableRow>}
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                <TableCell>{p.cedentes?.razao_social ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.approval_levels?.nome ?? "—"}</TableCell>
                <TableCell className="text-right">{fmtBRL(p.valor_solicitado)}</TableCell>
                <TableCell className="text-right">{fmtBRL(p.valor_aprovado)}</TableCell>
                <TableCell><Badge variant={STAGE_VARIANT[p.stage]}>{STAGE_LABEL[p.stage]}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button asChild size="icon" variant="ghost">
                    <Link to={`/credito/${p.id}`}><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProposalFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => load()} />
    </div>
  );
}
