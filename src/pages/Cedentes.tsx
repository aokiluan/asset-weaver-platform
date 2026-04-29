import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, ExternalLink } from "lucide-react";
import { CedenteFormDialog, CedenteFormValues } from "@/components/cedentes/CedenteFormDialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Cedente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  status: "prospect" | "em_analise" | "aprovado" | "reprovado" | "inativo";
  limite_aprovado: number | null;
  faturamento_medio: number | null;
  owner_id: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<Cedente["status"], string> = {
  prospect: "Prospect",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  inativo: "Inativo",
};

const STATUS_VARIANT: Record<Cedente["status"], "default" | "secondary" | "destructive" | "outline"> = {
  prospect: "outline",
  em_analise: "secondary",
  aprovado: "default",
  reprovado: "destructive",
  inativo: "outline",
};

const fmtBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtCNPJ = (s: string) => {
  const d = s.replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
};

export default function Cedentes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Cedente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CedenteFormValues> | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("cedentes")
      .select("id,razao_social,nome_fantasia,cnpj,status,limite_aprovado,faturamento_medio,owner_id,created_at")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter as Cedente["status"]);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`razao_social.ilike.%${s}%,nome_fantasia.ilike.%${s}%,cnpj.ilike.%${s.replace(/\D/g, "")}%`);
    }
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error("Erro ao carregar", { description: error.message }); return; }
    setItems(data ?? []);
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("cedentes").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover", { description: error.message }); return; }
    toast.success("Cedente removido");
    load();
  };

  const totalAprovado = useMemo(
    () => items.filter(i => i.status === "aprovado").reduce((s, i) => s + (i.limite_aprovado ?? 0), 0),
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cedentes</h1>
          <p className="text-sm text-muted-foreground">Cadastro de cedentes, status de análise e limites aprovados.</p>
        </div>
        <Button onClick={() => navigate("/cedentes/novo")}>
          <Plus className="h-4 w-4 mr-2" /> Novo cadastro
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total cadastrado</div>
          <div className="text-2xl font-semibold">{items.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Aprovados</div>
          <div className="text-2xl font-semibold">{items.filter(i => i.status === "aprovado").length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Limite total aprovado</div>
          <div className="text-2xl font-semibold">{fmtBRL(totalAprovado)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social, fantasia ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="reprovado">Reprovado</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}>Filtrar</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razão social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Faturamento médio</TableHead>
              <TableHead className="text-right">Limite aprovado</TableHead>
              <TableHead className="w-[140px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cedente encontrado.</TableCell></TableRow>
            )}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.razao_social}</div>
                  {c.nome_fantasia && <div className="text-xs text-muted-foreground">{c.nome_fantasia}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{fmtCNPJ(c.cnpj)}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge></TableCell>
                <TableCell className="text-right">{fmtBRL(c.faturamento_medio)}</TableCell>
                <TableCell className="text-right">{fmtBRL(c.limite_aprovado)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="icon" variant="ghost" title="Abrir">
                      <Link to={`/cedentes/${c.id}`}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar"
                      onClick={() => navigate(`/cedentes/${c.id}/editar`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Remover"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover cedente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação remove o cedente e todos os documentos vinculados. Não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)}>Remover</AlertDialogAction>
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

      <CedenteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}
