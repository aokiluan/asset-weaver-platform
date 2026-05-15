import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, ExternalLink, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STAGE_ORDER,
  STAGE_LABEL,
  type InvestorStage,
} from "@/lib/investor-contacts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

interface Investidor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  tipo_pessoa: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  perfil: string | null;
  status: string;
  valor_investido: number | null;
  observacoes: string | null;
  created_at: string;
}



const fmtBRL = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDoc = (s: string | null | undefined) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return s ?? "—";
};

export default function Investidores() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canDelete = hasRole("admin");
  const [items, setItems] = useState<Investidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [stageMap, setStageMap] = useState<Map<string, InvestorStage>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Investidores | Securitizadora";
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("investidores")
      .select(
        "id,razao_social,nome_fantasia,cnpj,tipo_pessoa,email,telefone,endereco,cidade,estado,perfil,status,valor_investido,observacoes,created_at",
      )
      .order("razao_social", { ascending: true });

    // Deriva o estágio de cada investidor a partir da boleta mais recente -> contato no pipeline
    const [boletasRes, contactsRes] = await Promise.all([
      supabase
        .from("investor_boletas")
        .select("investidor_id,contact_id,updated_at")
        .not("investidor_id", "is", null)
        .order("updated_at", { ascending: false }),
      supabase.from("investor_contacts").select("id,stage"),
    ]);

    const contactStage = new Map<string, InvestorStage>();
    for (const c of (contactsRes.data ?? []) as { id: string; stage: InvestorStage }[]) {
      contactStage.set(c.id, c.stage);
    }
    const map = new Map<string, InvestorStage>();
    for (const b of (boletasRes.data ?? []) as {
      investidor_id: string;
      contact_id: string;
    }[]) {
      if (map.has(b.investidor_id)) continue; // só a mais recente
      const st = contactStage.get(b.contact_id);
      if (st) map.set(b.investidor_id, st);
    }
    setStageMap(map);

    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar", { description: error.message });
      return;
    }
    setItems((data ?? []) as Investidor[]);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (stageFilter !== "all") {
      list = list.filter((c) => stageMap.get(c.id) === stageFilter);
    }
    const s = search.trim().toLowerCase();
    if (!s) return list;
    const digits = s.replace(/\D/g, "");
    return list.filter(
      (c) =>
        c.razao_social.toLowerCase().includes(s) ||
        (c.nome_fantasia ?? "").toLowerCase().includes(s) ||
        (digits && c.cnpj.replace(/\D/g, "").includes(digits)),
    );
  }, [items, search, stageFilter, stageMap]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.find((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => items.find((c) => c.id === selectedId) ?? null,
    [items, selectedId],
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("investidores").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    toast.success("Investidor removido");
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const totalInvestido = items
    .filter((i) => i.status === "ativo")
    .reduce((s, i) => s + (i.valor_investido ?? 0), 0);
  const ativos = items.filter((i) => i.status === "ativo").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Investidores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de investidores, perfis e volumes investidos.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Total cadastrado
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {items.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">Ativos</div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {ativos}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Volume investido (ativos)
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {fmtBRL(totalInvestido)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Ticket médio
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {fmtBRL(ativos > 0 ? totalInvestido / ativos : 0)}
          </div>
        </div>
      </div>

      {/* Layout 2 colunas estilo Nibo */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 min-h-[600px]">
        {/* Coluna esquerda */}
        <div className="rounded-lg border bg-card flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum investidor encontrado.
              </div>
            )}
            {!loading &&
              filtered.map((c) => {
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
                    <div className="text-sm font-medium truncate">
                      {c.razao_social}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {fmtDoc(c.cnpj)}
                    </div>
                  </button>
                );
              })}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-3 py-2 border-t text-xs text-muted-foreground bg-muted/30">
              {filtered.length} investidor{filtered.length !== 1 ? "es" : ""}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">
                Selecione um investidor na lista para ver os detalhes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-5 border-b flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {selected.razao_social}
                  </h2>
                  {selected.nome_fantasia &&
                    selected.nome_fantasia !== selected.razao_social && (
                      <p className="text-sm text-muted-foreground truncate">
                        {selected.nome_fantasia}
                      </p>
                    )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">
                      {selected.status}
                    </Badge>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {selected.tipo_pessoa}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {fmtDoc(selected.cnpj)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/diretorio/investidores/${selected.id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir detalhes
                  </Button>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Remover">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover investidor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação remove o investidor permanentemente. Não pode
                            ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(selected.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-card p-2.5">
                  <div className="text-xs text-muted-foreground">
                    Valor investido
                  </div>
                  <div className="text-[18px] font-semibold tabular-nums mt-1 text-primary">
                    {fmtBRL(selected.valor_investido)}
                  </div>
                </div>
                <div className="bg-card p-2.5">
                  <div className="text-xs text-muted-foreground">Perfil</div>
                  <div className="text-[14px] font-medium leading-tight mt-1 capitalize">
                    {selected.perfil || "—"}
                  </div>
                </div>
              </div>

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
                    Cadastro
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field
                      label="Cadastrado em"
                      value={new Date(selected.created_at).toLocaleDateString(
                        "pt-BR",
                      )}
                    />
                    <Field label="Tipo de pessoa" value={selected.tipo_pessoa.toUpperCase()} />
                  </div>
                </section>

                {selected.observacoes && (
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                      Observações
                    </h3>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">
                      {selected.observacoes}
                    </p>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-[10px] leading-none text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="text-[12px] leading-tight break-words">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
