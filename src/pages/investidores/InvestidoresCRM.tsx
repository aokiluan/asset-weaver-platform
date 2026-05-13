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
import { Plus, LayoutGrid, List as ListIcon, Pencil, Loader2, Eye, Phone } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fmtCompactBRL,
  INVESTOR_TYPES,
  INVESTOR_TYPE_LABEL,
  isAdvance,
  STAGE_LABEL,
  STAGE_ORDER,
  todayISO,
  type InvestorContact,
  type InvestorStage,
  type InvestorType,
} from "@/lib/investor-contacts";
import { InvestorContactFormDialog } from "./InvestorContactFormDialog";
import { InvestorContactDrawer } from "./InvestorContactDrawer";
import { RegistrarContatoDialog } from "./RegistrarContatoDialog";
import { ConfirmStageMoveDialog } from "./ConfirmStageMoveDialog";
import { QuickViewDialog } from "./QuickViewDialog";

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
  const [registerFor, setRegisterFor] = useState<InvestorContact | null>(null);
  const [quickView, setQuickView] = useState<InvestorContact | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    contact: InvestorContact;
    to: InvestorStage;
  } | null>(null);

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
    const ativos = rows.filter((r) => r.stage === "investidor_ativo");
    const pipeline = rows.filter((r) => r.stage !== "investidor_ativo");
    const total = rows.length;
    const tickets = rows.map((r) => r.ticket ?? 0);
    const avg = total ? tickets.reduce((a, b) => a + b, 0) / total : 0;
    return {
      capitalAtivo: ativos.reduce((a, r) => a + (r.ticket ?? 0), 0),
      capitalAtivoCount: ativos.length,
      pipeline: pipeline.reduce((a, r) => a + (r.ticket ?? 0), 0),
      pipelineCount: pipeline.length,
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

  // Drag-and-drop: solicita confirmação antes de mover
  function requestStageMove(contactId: string, newStage: InvestorStage) {
    const current = rows.find((r) => r.id === contactId);
    if (!current || current.stage === newStage) return;
    setPendingMove({ contact: current, to: newStage });
  }

  async function executeStageMove(contact: InvestorContact, newStage: InvestorStage) {
    const advancing = isAdvance(contact.stage, newStage);
    const stamp = advancing ? todayISO() : null;

    // Optimistic
    setRows((prev) =>
      prev.map((r) =>
        r.id === contact.id
          ? { ...r, stage: newStage, ...(stamp ? { last_contact_date: stamp } : {}) }
          : r,
      ),
    );

    const patch: { stage: InvestorStage; last_contact_date?: string } = { stage: newStage };
    if (stamp) patch.last_contact_date = stamp;

    const { error } = await supabase
      .from("investor_contacts")
      .update(patch)
      .eq("id", contact.id);

    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      load();
    } else {
      toast.success(`Movido para ${STAGE_LABEL[newStage]}`);
    }
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
          <MetricCard
            label="Capital Ativo"
            value={fmtCompactBRL(metrics.capitalAtivo)}
            sub={`${metrics.capitalAtivoCount} ${metrics.capitalAtivoCount === 1 ? "contato" : "contatos"}`}
          />
          <MetricCard
            label="Pipeline"
            value={fmtCompactBRL(metrics.pipeline)}
            sub={`${metrics.pipelineCount} em negociação`}
          />
          <MetricCard
            label="Total de Contatos"
            value={String(metrics.total)}
            sub="na base"
          />
          <MetricCard
            label="Ticket Médio"
            value={fmtCompactBRL(metrics.ticketMedio)}
            sub="por contato"
          />
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
          <KanbanView
            rows={filtered}
            onOpen={setSelected}
            onStageMove={requestStageMove}
            onQuickView={setQuickView}
            onRegisterContact={setRegisterFor}
          />
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
        onRegisterContact={setRegisterFor}
        onRequestStageMove={(c, to) => setPendingMove({ contact: c, to })}
      />

      <RegistrarContatoDialog
        open={!!registerFor}
        onOpenChange={(v) => !v && setRegisterFor(null)}
        contact={registerFor}
        onSaved={load}
      />

      <QuickViewDialog
        open={!!quickView}
        onOpenChange={(v) => !v && setQuickView(null)}
        contact={quickView}
        onRegisterContact={setRegisterFor}
        onOpenDetails={setSelected}
      />

      {pendingMove && (
        <ConfirmStageMoveDialog
          open
          onOpenChange={(v) => !v && setPendingMove(null)}
          contactName={pendingMove.contact.name}
          fromStage={pendingMove.contact.stage}
          toStage={pendingMove.to}
          onConfirm={() => {
            executeStageMove(pendingMove.contact, pendingMove.to);
            setPendingMove(null);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </div>
      <div className="text-[16px] font-medium text-foreground leading-tight mt-1.5">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground leading-none mt-1">{sub}</div>
      )}
    </Card>
  );
}

function KanbanView({
  rows,
  onOpen,
  onStageMove,
  onQuickView,
  onRegisterContact,
}: {
  rows: InvestorContact[];
  onOpen: (c: InvestorContact) => void;
  onStageMove: (id: string, stage: InvestorStage) => void;
  onQuickView: (c: InvestorContact) => void;
  onRegisterContact: (c: InvestorContact) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeCard = activeId ? rows.find((r) => r.id === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={(e: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = e;
        if (!over) return;
        onStageMove(String(active.id), String(over.id) as InvestorStage);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 min-w-max pb-2">
          {STAGE_ORDER.map((stage) => {
            const items = rows.filter((r) => r.stage === stage);
            return (
              <KanbanColumn
                key={stage}
                stage={stage}
                items={items}
                onOpen={onOpen}
                onQuickView={onQuickView}
                onRegisterContact={onRegisterContact}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="w-[220px] rounded-md border bg-card p-2.5 shadow-[var(--shadow-elegant)]">
            <div className="text-[12px] font-medium text-foreground leading-tight truncate">
              {activeCard.name}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {fmtCompactBRL(activeCard.ticket)}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  stage,
  items,
  onOpen,
  onQuickView,
  onRegisterContact,
}: {
  stage: InvestorStage;
  items: InvestorContact[];
  onOpen: (c: InvestorContact) => void;
  onQuickView: (c: InvestorContact) => void;
  onRegisterContact: (c: InvestorContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = items.reduce((a, r) => a + (r.ticket ?? 0), 0);

  return (
    <div className="w-[220px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
          <span>{STAGE_LABEL[stage]}</span>
          <Badge variant="secondary" className="text-[9px] font-normal h-4 px-1.5">
            {items.length}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground">{fmtCompactBRL(total)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 rounded-md p-1 min-h-[80px] transition-colors",
          isOver && "ring-2 ring-primary bg-primary/5",
        )}
      >
        {items.map((c) => (
          <KanbanCard
            key={c.id}
            contact={c}
            onOpen={onOpen}
            onQuickView={onQuickView}
            onRegisterContact={onRegisterContact}
          />
        ))}
        {items.length === 0 && (
          <div className="text-[11px] text-muted-foreground/70 text-center py-6 border border-dashed rounded-md">
            vazio
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  contact,
  onOpen,
  onQuickView,
  onRegisterContact,
}: {
  contact: InvestorContact;
  onOpen: (c: InvestorContact) => void;
  onQuickView: (c: InvestorContact) => void;
  onRegisterContact: (c: InvestorContact) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onDoubleClick={() => onOpen(contact)}
      className={cn(
        "rounded-md border bg-card p-2.5 hover:border-primary/40 hover:shadow-sm transition-colors",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          {...listeners}
          {...attributes}
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <div className="text-[12px] font-medium text-foreground leading-tight truncate">
            {contact.name}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(contact);
          }}
          className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          aria-label="Visualização rápida"
        >
          <Eye className="h-3 w-3" />
        </button>
      </div>
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between mt-1.5">
          <Badge variant="secondary" className="text-[9px] font-normal h-4 px-1.5">
            {INVESTOR_TYPE_LABEL[contact.type]}
          </Badge>
          <span className="text-[11px] text-foreground">{fmtCompactBRL(contact.ticket)}</span>
        </div>
        {contact.next_action && (
          <div className="text-[11px] text-primary leading-tight mt-1.5 truncate">
            → {contact.next_action}
          </div>
        )}
      </div>
      <div className="flex justify-end mt-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRegisterContact(contact);
          }}
          className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-muted"
          aria-label="Registrar contato"
        >
          <Phone className="h-3 w-3" />
        </button>
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
