import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, ExternalLink, Building2, History, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CedenteNovoSheet } from "@/components/cedentes/CedenteNovoSheet";
import { CedenteImportDialog } from "@/components/cedentes/CedenteImportDialog";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeRenovacao } from "@/lib/cadastro-renovacao";
import { STAGE_LABEL, STAGE_COLORS, type CedenteStage } from "@/lib/cedente-stages";

interface Cedente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  setor: string | null;
  stage: CedenteStage;
  limite_aprovado: number | null;
  faturamento_medio: number | null;
  observacoes: string | null;
  owner_id: string | null;
  created_at: string;
  cadastro_revisado_em: string | null;
  minuta_assinada_em: string | null;
}

const fmtBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtCNPJ = (s: string | null | undefined) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length !== 14) return s ?? "—";
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
};

export default function Cedentes() {
  const navigate = useNavigate();
  const { hasRole, roles, loading: authLoading } = useAuth();
  const canCreate = hasRole("admin") || hasRole("comercial");
  const [items, setItems] = useState<Cedente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("cedentes")
      .select("id,razao_social,nome_fantasia,cnpj,email,telefone,endereco,cidade,estado,setor,stage,limite_aprovado,faturamento_medio,observacoes,owner_id,created_at,cadastro_revisado_em,minuta_assinada_em")
      .order("razao_social", { ascending: true });
    if (statusFilter !== "all") q = q.eq("stage", statusFilter as CedenteStage);
    const { data, error } = await q;
    setLoading(false);
    if (error) { toast.error("Erro ao carregar", { description: error.message }); return; }
    setItems((data ?? []) as Cedente[]);
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    const digits = s.replace(/\D/g, "");
    return items.filter((c) =>
      c.razao_social.toLowerCase().includes(s) ||
      (c.nome_fantasia ?? "").toLowerCase().includes(s) ||
      (digits && c.cnpj.replace(/\D/g, "").includes(digits))
    );
  }, [items, search]);

  // Mantém a seleção válida quando a lista muda
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !filtered.find((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId]
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("cedentes").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover", { description: error.message }); return; }
    toast.success("Cedente removido");
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const totalAprovado = items.filter(i => i.stage === "ativo").reduce((s, i) => s + (i.limite_aprovado ?? 0), 0);
  const renovInfos = items.map(i => computeRenovacao(i.cadastro_revisado_em, i.minuta_assinada_em));
  const renovVencidas = renovInfos.filter(r => r.status === "vencida").length;
  const renovAtencao = renovInfos.filter(r => r.status === "atencao").length;
  const renovPendentes = renovVencidas + renovAtencao;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Cedentes</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de cedentes, status de análise e limites aprovados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  <Button variant="outline" onClick={() => setImportOpen(true)} disabled={authLoading || !canCreate}>
                    <Upload className="h-4 w-4 mr-2" /> Importar Cedentes
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCreate && !authLoading && (
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Seu usuário não tem permissão
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  <Button onClick={() => setNovoOpen(true)} disabled={authLoading || !canCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Novo cadastro
                  </Button>
                </span>
              </TooltipTrigger>
              {!canCreate && !authLoading && (
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  Seu usuário não tem permissão
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">Total cadastrado</div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">{items.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">Ativos</div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">{items.filter(i => i.stage === "ativo").length}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">Limite total (ativos)</div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">{fmtBRL(totalAprovado)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">Renovações pendentes</div>
          <div className={cn(
            "text-[18px] font-semibold tabular-nums leading-tight mt-1",
            renovVencidas > 0 && "text-destructive",
          )}>
            {renovPendentes}
          </div>
          <div className="text-[10px] text-muted-foreground leading-none mt-1 tabular-nums">
            {renovVencidas} vencida{renovVencidas === 1 ? "" : "s"} · {renovAtencao} a vencer
          </div>
        </div>
      </div>

      {/* Layout 2 colunas estilo Nibo */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 min-h-[600px]">
        {/* Coluna esquerda: lista */}
        <div className="rounded-lg border bg-card flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {(Object.keys(STAGE_LABEL) as CedenteStage[]).map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cedente encontrado.</div>
            )}
            {!loading && filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b transition-colors",
                    active
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-muted/50 border-l-2 border-l-transparent",
                  )}
                >
                  <div className="text-sm font-medium truncate">{c.razao_social}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {fmtCNPJ(c.cnpj)}
                  </div>
                </button>
              );
            })}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-3 py-2 border-t text-xs text-muted-foreground bg-muted/30">
              {filtered.length} cedente{filtered.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Coluna direita: visualização rápida */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Selecione um cedente na lista para ver os detalhes.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Cabeçalho do painel */}
              <div className="p-5 border-b flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{selected.razao_social}</h2>
                  {selected.nome_fantasia && selected.nome_fantasia !== selected.razao_social && (
                    <p className="text-sm text-muted-foreground truncate">{selected.nome_fantasia}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" style={{ borderColor: STAGE_COLORS[selected.stage], color: STAGE_COLORS[selected.stage] }}>{STAGE_LABEL[selected.stage]}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{fmtCNPJ(selected.cnpj)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => navigate(`/cedentes/${selected.id}`)}>
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir cadastro completo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/cedentes/${selected.id}?tab=historico`)}
                  >
                    <History className="h-4 w-4 mr-2" /> Histórico
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" title="Remover">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                        <AlertDialogAction onClick={() => handleDelete(selected.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* KPIs financeiros */}
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-card p-2.5">
                  <div className="text-xs text-muted-foreground">Faturamento médio</div>
                  <div className="text-[18px] font-semibold tabular-nums mt-1">{fmtBRL(selected.faturamento_medio)}</div>
                </div>
                <div className="bg-card p-2.5">
                  <div className="text-xs text-muted-foreground">Limite aprovado</div>
                  <div className="text-[18px] font-semibold tabular-nums mt-1 text-primary">{fmtBRL(selected.limite_aprovado)}</div>
                </div>
              </div>

              {/* Detalhes */}
              <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="E-mail" value={selected.email} />
                    <Field label="Telefone" value={selected.telefone} />
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="Logradouro" value={selected.endereco} />
                    <Field
                      label="Cidade / UF"
                      value={
                        selected.cidade || selected.estado
                          ? `${selected.cidade ?? ""}${selected.cidade && selected.estado ? " / " : ""}${selected.estado ?? ""}`
                          : null
                      }
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                    Operação
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field label="Setor" value={selected.setor} />
                    <Field
                      label="Cadastrado em"
                      value={new Date(selected.created_at).toLocaleDateString("pt-BR")}
                    />
                  </div>
                </section>

                {selected.observacoes && (
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                      Observações
                    </h3>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">{selected.observacoes}</p>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CedenteNovoSheet
        open={novoOpen}
        onOpenChange={setNovoOpen}
        onCreated={async (id) => {
          await load();
          setSelectedId(id);
        }}
      />

      <CedenteImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => load()}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] leading-none text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[12px] leading-tight break-words">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
