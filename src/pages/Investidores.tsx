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
import { Search, ExternalLink, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  STAGE_ORDER,
  STAGE_LABEL,
  INVESTOR_TYPE_LABEL,
  type InvestorStage,
  type InvestorType,
} from "@/lib/investor-contacts";

interface Contact {
  id: string;
  name: string;
  type: InvestorType;
  stage: InvestorStage;
  ticket: number | null;
  contact_name: string | null;
  phone: string | null;
  last_contact_date: string | null;
  next_action: string | null;
}

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

const fmtBRL = (v: number | null | undefined) =>
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [investorByContact, setInvestorByContact] = useState<
    Map<string, Investidor>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = "Investidores | Securitizadora";
  }, []);

  const load = async () => {
    setLoading(true);
    const [contactsRes, boletasRes, investidoresRes] = await Promise.all([
      supabase
        .from("investor_contacts")
        .select(
          "id,name,type,stage,ticket,contact_name,phone,last_contact_date,next_action",
        )
        .order("name", { ascending: true }),
      supabase
        .from("investor_boletas")
        .select("contact_id,investidor_id,updated_at")
        .not("investidor_id", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("investidores")
        .select(
          "id,razao_social,nome_fantasia,cnpj,tipo_pessoa,email,telefone,endereco,cidade,estado,perfil,status,valor_investido,observacoes,created_at",
        ),
    ]);
    setLoading(false);

    if (contactsRes.error) {
      toast.error("Erro ao carregar pipeline", {
        description: contactsRes.error.message,
      });
      return;
    }

    const invById = new Map<string, Investidor>();
    for (const i of (investidoresRes.data ?? []) as Investidor[]) {
      invById.set(i.id, i);
    }
    const map = new Map<string, Investidor>();
    for (const b of (boletasRes.data ?? []) as {
      contact_id: string;
      investidor_id: string;
    }[]) {
      if (map.has(b.contact_id)) continue;
      const inv = invById.get(b.investidor_id);
      if (inv) map.set(b.contact_id, inv);
    }

    setContacts((contactsRes.data ?? []) as Contact[]);
    setInvestorByContact(map);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = contacts;
    if (stageFilter !== "all") {
      list = list.filter((c) => c.stage === stageFilter);
    }
    const s = search.trim().toLowerCase();
    if (!s) return list;
    const digits = s.replace(/\D/g, "");
    return list.filter((c) => {
      const inv = investorByContact.get(c.id);
      return (
        c.name.toLowerCase().includes(s) ||
        (c.contact_name ?? "").toLowerCase().includes(s) ||
        (inv?.razao_social ?? "").toLowerCase().includes(s) ||
        (digits && (inv?.cnpj ?? "").replace(/\D/g, "").includes(digits))
      );
    });
  }, [contacts, search, stageFilter, investorByContact]);

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
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId],
  );
  const selectedInvestor = selected
    ? (investorByContact.get(selected.id) ?? null)
    : null;

  // KPIs
  const totalPipeline = contacts.length;
  const ativos = contacts.filter((c) => c.stage === "investidor_ativo").length;
  const volume = Array.from(investorByContact.values()).reduce(
    (s, i) => s + (i.valor_investido ?? 0),
    0,
  );
  const ticketsPipeline = contacts
    .filter((c) => c.stage !== "perdido" && c.ticket != null)
    .map((c) => c.ticket as number);
  const ticketMedio =
    ticketsPipeline.length > 0
      ? ticketsPipeline.reduce((s, n) => s + n, 0) / ticketsPipeline.length
      : 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight">Investidores</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline completo de relacionamento e investidores cadastrados.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Total no pipeline
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {totalPipeline}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Investidores ativos
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {ativos}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Volume investido
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {fmtBRL(volume)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-[11px] text-muted-foreground leading-none">
            Ticket médio (pipeline)
          </div>
          <div className="text-[18px] font-semibold tabular-nums leading-tight mt-1">
            {fmtBRL(ticketMedio)}
          </div>
        </div>
      </div>

      {/* Layout 2 colunas */}
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
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABEL[s]}
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
                Nenhum contato encontrado.
              </div>
            )}
            {!loading &&
              filtered.map((c) => {
                const active = c.id === selectedId;
                const inv = investorByContact.get(c.id);
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 shrink-0"
                      >
                        {STAGE_LABEL[c.stage]}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {INVESTOR_TYPE_LABEL[c.type]}
                      {inv?.cnpj && (
                        <>
                          {" · "}
                          <span className="font-mono">{fmtDoc(inv.cnpj)}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-3 py-2 border-t text-xs text-muted-foreground bg-muted/30">
              {filtered.length} contato{filtered.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">
                Selecione um contato na lista para ver os detalhes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-5 border-b flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {selectedInvestor?.razao_social ?? selected.name}
                  </h2>
                  {selectedInvestor?.nome_fantasia &&
                    selectedInvestor.nome_fantasia !==
                      selectedInvestor.razao_social && (
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedInvestor.nome_fantasia}
                      </p>
                    )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">{STAGE_LABEL[selected.stage]}</Badge>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {INVESTOR_TYPE_LABEL[selected.type]}
                    </Badge>
                    {selectedInvestor?.cnpj && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {fmtDoc(selectedInvestor.cnpj)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selectedInvestor ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/diretorio/investidores/${selectedInvestor.id}`,
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Abrir detalhes
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/investidores/crm")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Abrir no pipeline
                    </Button>
                  )}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-px bg-border">
                {selectedInvestor ? (
                  <>
                    <div className="bg-card p-2.5">
                      <div className="text-xs text-muted-foreground">
                        Valor investido
                      </div>
                      <div className="text-[18px] font-semibold tabular-nums mt-1 text-primary">
                        {fmtBRL(selectedInvestor.valor_investido)}
                      </div>
                    </div>
                    <div className="bg-card p-2.5">
                      <div className="text-xs text-muted-foreground">Perfil</div>
                      <div className="text-[14px] font-medium leading-tight mt-1 capitalize">
                        {selectedInvestor.perfil || "—"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-card p-2.5">
                      <div className="text-xs text-muted-foreground">
                        Ticket esperado
                      </div>
                      <div className="text-[18px] font-semibold tabular-nums mt-1 text-primary">
                        {fmtBRL(selected.ticket)}
                      </div>
                    </div>
                    <div className="bg-card p-2.5">
                      <div className="text-xs text-muted-foreground">
                        Próxima ação
                      </div>
                      <div className="text-[14px] font-medium leading-tight mt-1">
                        {selected.next_action || "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                    Contato
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                    <Field
                      label="Responsável"
                      value={selected.contact_name}
                    />
                    <Field
                      label="Telefone"
                      value={selectedInvestor?.telefone ?? selected.phone}
                    />
                    {selectedInvestor && (
                      <Field label="E-mail" value={selectedInvestor.email} />
                    )}
                    <Field
                      label="Último contato"
                      value={
                        selected.last_contact_date
                          ? new Date(
                              selected.last_contact_date,
                            ).toLocaleDateString("pt-BR")
                          : null
                      }
                    />
                  </div>
                </section>

                {selectedInvestor && (
                  <section>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
                      Endereço
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                      <Field
                        label="Logradouro"
                        value={selectedInvestor.endereco}
                      />
                      <Field
                        label="Cidade / UF"
                        value={
                          selectedInvestor.cidade || selectedInvestor.estado
                            ? `${selectedInvestor.cidade ?? ""}${selectedInvestor.cidade && selectedInvestor.estado ? " / " : ""}${selectedInvestor.estado ?? ""}`
                            : null
                        }
                      />
                    </div>
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
