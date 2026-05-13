import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTabs } from "@/components/PageTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, LayoutGrid, List as ListIcon, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmtCompactBRL,
  INVESTOR_TYPES,
  INVESTOR_TYPE_LABEL,
  STAGE_LABEL,
  STAGE_ORDER,
  type InvestorContact,
  type InvestorType,
} from "@/lib/investor-contacts";
import { InvestorContactFormDialog } from "./InvestorContactFormDialog";
import { InvestorContactDrawer } from "./InvestorContactDrawer";

type View = "kanban" | "list";
type TypeFilter = "todos" | InvestorType;

export default function InvestidoresCRM() {
  const { user } = useAuth();
  const [rows, setRows] = useState<InvestorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("kanban");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [selected, setSelected] = useState<InvestorContact | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvestorContact | null>(null);

  useEffect(() => {
    document.title = "CRM de Prospecção | Relação com Investidores";
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("investor_contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setRows((data ?? []) as InvestorContact[]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (selected) {
      const fresh = rows.find((r) => r.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
      if (!fresh) setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const filtered = useMemo(
    () => (typeFilter === "todos" ? rows : rows.filter((r) => r.type === typeFilter)),
    [rows, typeFilter],
  );

  const metrics = useMemo(() => {
    const ativos = rows.filter((r) => r.stage === "ativo");
    const pipeline = rows.filter((r) => r.stage !== "ativo");
    const total = rows.length;
    const tickets = rows.map((r) => r.ticket ?? 0);
    const avg = total ? tickets.reduce((a, b) => a + b, 0) / total : 0;
    return {
      capitalAtivo: ativos.reduce((a, r) => a + (r.ticket ?? 0), 0),
      pipeline: pipeline.reduce((a, r) => a + (r.ticket ?? 0), 0),
      total,
      ticketMedio: avg,
    };
  }, [rows]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: InvestorContact) {
    setEditing(c);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageTabs
        title="Relação com Investidores"
        tabs={[{ label: "CRM de Prospecção", to: "/investidores/crm" }]}
        actions={
          <Button size="sm" className="h-7" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo contato
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Capital Ativo" value={fmtCompactBRL(metrics.capitalAtivo)} />
          <MetricCard label="Pipeline" value={fmtCompactBRL(metrics.pipeline)} />
          <MetricCard label="Total de Contatos" value={String(metrics.total)} />
          <MetricCard label="Ticket Médio" value={fmtCompactBRL(metrics.ticketMedio)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {(["todos", ...INVESTOR_TYPES] as TypeFilter[]).map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setTypeFilter(t)}
              >
                {t === "todos" ? "Todos" : INVESTOR_TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            size="sm"
          >
            <ToggleGroupItem value="kanban" className="h-7 px-2">
              <LayoutGrid className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-7 px-2">
              <ListIcon className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : view === "kanban" ? (
          <KanbanView rows={filtered} onOpen={setSelected} />
        ) : (
          <ListView rows={filtered} onOpen={setSelected} onEdit={openEdit} />
        )}
      </div>

      <InvestorContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        userId={user?.id ?? ""}
        onSaved={load}
      />

      <InvestorContactDrawer
        contact={selected}
        onClose={() => setSelected(null)}
        onChanged={load}
        onEdit={openEdit}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </div>
      <div className="text-[16px] font-medium text-foreground leading-tight mt-1.5">
        {value}
      </div>
    </Card>
  );
}

function KanbanView({
  rows,
  onOpen,
}: {
  rows: InvestorContact[];
  onOpen: (c: InvestorContact) => void;
}) {
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex gap-3 min-w-max pb-2">
        {STAGE_ORDER.map((stage) => {
          const items = rows.filter((r) => r.stage === stage);
          const total = items.reduce((a, r) => a + (r.ticket ?? 0), 0);
          return (
            <div key={stage} className="w-[220px] shrink-0">
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="text-[11px] font-medium text-foreground">
                  {STAGE_LABEL[stage]}
                  <span className="text-muted-foreground font-normal ml-1">
                    {items.length}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {fmtCompactBRL(total)}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpen(c)}
                    className="w-full text-left rounded-md border bg-card p-2.5 hover:border-primary/40 hover:shadow-sm transition-colors"
                  >
                    <div className="text-[12px] font-medium text-foreground leading-tight truncate">
                      {c.name}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[9px] font-normal h-4 px-1.5"
                      >
                        {INVESTOR_TYPE_LABEL[c.type]}
                      </Badge>
                      <span className="text-[11px] text-foreground">
                        {fmtCompactBRL(c.ticket)}
                      </span>
                    </div>
                    {c.next_action && (
                      <div className="text-[11px] text-muted-foreground leading-tight mt-1.5 truncate">
                        {c.next_action}
                      </div>
                    )}
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="text-[11px] text-muted-foreground/70 text-center py-6 border border-dashed rounded-md">
                    vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  rows,
  onOpen,
  onEdit,
}: {
  rows: InvestorContact[];
  onOpen: (c: InvestorContact) => void;
  onEdit: (c: InvestorContact) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Nome</TableHead>
            <TableHead className="text-[11px]">Tipo</TableHead>
            <TableHead className="text-[11px]">Estágio</TableHead>
            <TableHead className="text-[11px]">Ticket</TableHead>
            <TableHead className="text-[11px]">Contato</TableHead>
            <TableHead className="text-[11px]">Último contato</TableHead>
            <TableHead className="text-[11px]">Próxima ação</TableHead>
            <TableHead className="text-[11px] w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => onOpen(c)}
            >
              <TableCell className="text-[12px] font-medium">{c.name}</TableCell>
              <TableCell className="text-[12px] text-muted-foreground">
                {INVESTOR_TYPE_LABEL[c.type]}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {STAGE_LABEL[c.stage]}
                </Badge>
              </TableCell>
              <TableCell className="text-[12px]">{fmtCompactBRL(c.ticket)}</TableCell>
              <TableCell className="text-[12px] text-muted-foreground">
                {c.contact_name ?? "—"}
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground">
                {c.last_contact_date
                  ? new Date(c.last_contact_date + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground max-w-[200px] truncate">
                {c.next_action ?? "—"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(c);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-[12px] text-muted-foreground py-8"
              >
                Nenhum contato encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
