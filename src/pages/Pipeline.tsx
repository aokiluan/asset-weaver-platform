import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, LayoutGrid, List as ListIcon, Eye, Phone } from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CedenteStage, STAGE_LABEL, STAGE_ORDER,
  canMoveStage, canDragFromStage,
} from "@/lib/cedente-stages";
import { PageTabs } from "@/components/PageTabs";
import { useAuth } from "@/hooks/useAuth";
import {
  CedenteQuickViewDialog,
  type CedenteQuickView,
} from "@/components/cedentes/CedenteQuickViewDialog";
import { RegistrarContatoCedenteDialog } from "@/components/cedentes/RegistrarContatoCedenteDialog";

interface CedenteCard {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  stage: CedenteStage;
  faturamento_medio: number | null;
  setor: string | null;
  cidade: string | null;
  estado: string | null;
  limite_aprovado: number | null;
  owner_id: string | null;
  next_action: string | null;
  last_contact_date: string | null;
}

type View = "kanban" | "list";
type SetorFilter = "todos" | string;

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);

function fmtCompactBRL(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const fmtCNPJ = (s: string | null) => {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  return new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR");
};

const isTerminal = (s: CedenteStage) => s === "ativo" || s === "inativo";

function toQuickView(c: CedenteCard): CedenteQuickView {
  return {
    id: c.id,
    razao_social: c.razao_social,
    cnpj: c.cnpj,
    stage: c.stage,
    setor: c.setor,
    faturamento_medio: c.faturamento_medio,
    cidade: c.cidade,
    estado: c.estado,
    limite_aprovado: c.limite_aprovado,
    next_action: c.next_action,
    last_contact_date: c.last_contact_date,
  };
}

export default function Pipeline() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [cedentes, setCedentes] = useState<CedenteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("kanban");
  const [setorFilter, setSetorFilter] = useState<SetorFilter>("todos");
  const [pendingMove, setPendingMove] = useState<{
    cedente: CedenteCard;
    to: CedenteStage;
  } | null>(null);
  const [quickView, setQuickView] = useState<CedenteQuickView | null>(null);
  const [registerFor, setRegisterFor] = useState<CedenteQuickView | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    document.title = "Pipeline | Securitizadora";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cedentes")
      .select(
        "id,razao_social,nome_fantasia,cnpj,stage,faturamento_medio,setor,cidade,estado,limite_aprovado,owner_id,next_action,last_contact_date",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar cedentes", { description: error.message });
    }
    setCedentes((data ?? []) as CedenteCard[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setores = useMemo(() => {
    const s = new Set<string>();
    cedentes.forEach((c) => c.setor && s.add(c.setor));
    return Array.from(s).sort();
  }, [cedentes]);

  const filtered = useMemo(
    () => (setorFilter === "todos" ? cedentes : cedentes.filter((c) => c.setor === setorFilter)),
    [cedentes, setorFilter],
  );

  const metrics = useMemo(() => {
    const ativos = cedentes.filter((c) => c.stage === "ativo");
    const pipe = cedentes.filter((c) => !isTerminal(c.stage));
    const fatTotal = pipe.reduce((a, c) => a + (c.faturamento_medio ?? 0), 0);
    const ticketMedio = pipe.length
      ? pipe.reduce((a, c) => a + (c.faturamento_medio ?? 0), 0) / pipe.length
      : 0;
    return {
      total: cedentes.length,
      ativos: ativos.length,
      negociacao: pipe.length,
      fatTotal,
      ticketMedio,
    };
  }, [cedentes]);

  function requestStageMove(cedenteId: string, newStage: CedenteStage) {
    const c = cedentes.find((x) => x.id === cedenteId);
    if (!c || c.stage === newStage) return;
    const isOwner = !!user && c.owner_id === user.id;
    const check = canMoveStage(roles, isOwner, c.stage, newStage);
    if (!check.ok) {
      toast.error(check.reason ?? "Movimento não permitido");
      return;
    }
    setPendingMove({ cedente: c, to: newStage });
  }

  async function executeStageMove(c: CedenteCard, newStage: CedenteStage) {
    setCedentes((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, stage: newStage } : x)),
    );
    const { error } = await supabase
      .from("cedentes")
      .update({ stage: newStage })
      .eq("id", c.id);
    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      load();
    } else {
      toast.success(`Movido para ${STAGE_LABEL[newStage]}`);
    }
  }

  const activeCedente = activeId ? cedentes.find((c) => c.id === activeId) : null;

  return (
    <>
      <PageTabs title="Pipeline de Cedentes" tabs={[]} />

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Cedentes Ativos"
            value={String(metrics.ativos)}
            sub={`${metrics.total} no total`}
          />
          <MetricCard
            label="Em Negociação"
            value={String(metrics.negociacao)}
            sub="na esteira"
          />
          <MetricCard
            label="Faturamento Esteira"
            value={fmtCompactBRL(metrics.fatTotal)}
            sub="soma dos cedentes"
          />
          <MetricCard
            label="Ticket Médio"
            value={fmtCompactBRL(metrics.ticketMedio)}
            sub="por cedente"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            {(["todos", ...setores] as SetorFilter[]).map((t) => (
              <Button
                key={t}
                variant={setorFilter === t ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[12px]"
                onClick={() => setSetorFilter(t)}
              >
                {t === "todos" ? "Todos" : t}
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
          <TooltipProvider delayDuration={200}>
            <DndContext
              sensors={sensors}
              onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
              onDragEnd={(e: DragEndEvent) => {
                setActiveId(null);
                const { active, over } = e;
                if (!over) return;
                requestStageMove(String(active.id), String(over.id) as CedenteStage);
              }}
              onDragCancel={() => setActiveId(null)}
            >
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="flex gap-3 min-w-max pb-2">
                  {STAGE_ORDER.map((stage) => (
                    <KanbanColumn
                      key={stage}
                      stage={stage}
                      items={filtered.filter((c) => c.stage === stage)}
                      userId={user?.id ?? null}
                      roles={roles}
                      onQuickView={(c) => setQuickView(toQuickView(c))}
                      onRegister={(c) => setRegisterFor(toQuickView(c))}
                    />
                  ))}
                </div>
              </div>
              <DragOverlay>
                {activeCedente && (
                  <div className="w-[220px] rounded-md border bg-card p-2.5 shadow-[var(--shadow-elegant)]">
                    <div className="text-[12px] font-medium text-foreground leading-tight truncate">
                      {activeCedente.razao_social}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      {fmtCompactBRL(activeCedente.faturamento_medio)}
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </TooltipProvider>
        ) : (
          <ListView
            rows={filtered}
            onOpen={(id) => navigate(`/cedentes/${id}`)}
            onQuickView={(c) => setQuickView(toQuickView(c))}
            onRegister={(c) => setRegisterFor(toQuickView(c))}
          />
        )}
      </div>

      <AlertDialog open={!!pendingMove} onOpenChange={(v) => !v && setPendingMove(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px]">Confirmar movimentação</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-tight">
              {pendingMove && (
                <>
                  Mover <span className="font-medium text-foreground">{pendingMove.cedente.razao_social}</span> de{" "}
                  <span className="font-medium text-foreground">{STAGE_LABEL[pendingMove.cedente.stage]}</span> para{" "}
                  <span className="font-medium text-foreground">{STAGE_LABEL[pendingMove.to]}</span>?
                  <br />
                  <span className="text-[11px] text-muted-foreground">
                    Pendências (documentos, parecer, etc.) só são checadas dentro do cedente.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1">
            <AlertDialogCancel className="h-7 text-[12px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-7 text-[12px]"
              onClick={() => {
                if (pendingMove) executeStageMove(pendingMove.cedente, pendingMove.to);
                setPendingMove(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CedenteQuickViewDialog
        open={!!quickView}
        onOpenChange={(v) => !v && setQuickView(null)}
        cedente={quickView}
        onRegisterContact={(c) => setRegisterFor(c)}
        onOpenDetails={(c) => navigate(`/cedentes/${c.id}`)}
      />

      <RegistrarContatoCedenteDialog
        open={!!registerFor}
        onOpenChange={(v) => !v && setRegisterFor(null)}
        cedente={registerFor}
        onSaved={load}
      />
    </>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </div>
      <div className="text-[16px] font-medium text-foreground leading-tight mt-1.5 tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground leading-none mt-1">{sub}</div>
      )}
    </Card>
  );
}

function KanbanColumn({
  stage,
  items,
  userId,
  roles,
  onQuickView,
  onRegister,
}: {
  stage: CedenteStage;
  items: CedenteCard[];
  userId: string | null;
  roles: import("@/lib/roles").AppRole[];
  onQuickView: (c: CedenteCard) => void;
  onRegister: (c: CedenteCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = items.reduce((a, r) => a + (r.faturamento_medio ?? 0), 0);
  const terminal = isTerminal(stage);

  return (
    <div className={cn("w-[220px] shrink-0", terminal && "opacity-90")}>
      <div className="flex items-center justify-between px-1 mb-2">
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium",
            terminal ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <span>{STAGE_LABEL[stage]}</span>
          <Badge variant="secondary" className="text-[9px] font-normal h-4 px-1.5">
            {items.length}
          </Badge>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {fmtCompactBRL(total)}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 rounded-md p-1 min-h-[80px] transition-colors",
          terminal && "border border-dashed border-border/60 bg-muted/20",
          isOver && "ring-2 ring-primary bg-primary/5",
        )}
      >
        {items.map((c) => (
          <KanbanCard
            key={c.id}
            cedente={c}
            canDrag={canDragFromStage(roles, !!userId && c.owner_id === userId, c.stage)}
            onQuickView={onQuickView}
            onRegister={onRegister}
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
  cedente,
  canDrag,
  onQuickView,
  onRegister,
}: {
  cedente: CedenteCard;
  canDrag: boolean;
  onQuickView: (c: CedenteCard) => void;
  onRegister: (c: CedenteCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cedente.id,
    disabled: !canDrag,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const cardInner = (
    <div
      ref={setNodeRef}
      style={style}
      onDoubleClick={() => onQuickView(cedente)}
      aria-disabled={!canDrag}
      className={cn(
        "rounded-md border bg-card p-2.5 hover:border-primary/40 hover:shadow-sm transition-colors",
        isDragging && "opacity-40",
        !canDrag && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          {...(canDrag ? listeners : {})}
          {...(canDrag ? attributes : {})}
          className={cn(
            "flex-1 min-w-0",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed",
          )}
        >
          <div className="text-[12px] font-medium text-foreground leading-tight truncate">
            {cedente.razao_social}
          </div>
          {cedente.cnpj && (
            <div className="text-[10px] text-muted-foreground tabular-nums leading-none mt-1">
              {fmtCNPJ(cedente.cnpj)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickView(cedente); }}
            className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Visualizar"
          >
            <Eye className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRegister(cedente); }}
            className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Registrar contato"
          >
            <Phone className="h-3 w-3" />
          </button>
        </div>
      </div>

      {cedente.next_action && (
        <div className="text-[11px] text-primary leading-tight mt-1.5 truncate">
          → {cedente.next_action}
        </div>
      )}

      <div
        {...(canDrag ? listeners : {})}
        {...(canDrag ? attributes : {})}
        className={canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}
      >
        <div className="flex items-center justify-between mt-1.5">
          {cedente.setor ? (
            <Badge variant="secondary" className="text-[9px] font-normal h-4 px-1.5">
              {cedente.setor}
            </Badge>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-foreground tabular-nums">
            {fmtCompactBRL(cedente.faturamento_medio)}
          </span>
        </div>
      </div>
    </div>
  );

  if (!canDrag) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{cardInner}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-[11px]">
          Você não tem permissão para mover desta etapa
        </TooltipContent>
      </Tooltip>
    );
  }
  return cardInner;
}

function ListView({
  rows,
  onOpen,
  onQuickView,
  onRegister,
}: {
  rows: CedenteCard[];
  onOpen: (id: string) => void;
  onQuickView: (c: CedenteCard) => void;
  onRegister: (c: CedenteCard) => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Razão social</TableHead>
            <TableHead className="text-[11px]">CNPJ</TableHead>
            <TableHead className="text-[11px]">Setor</TableHead>
            <TableHead className="text-[11px]">Faturamento</TableHead>
            <TableHead className="text-[11px]">Estágio</TableHead>
            <TableHead className="text-[11px]">Último contato</TableHead>
            <TableHead className="text-[11px]">Próxima ação</TableHead>
            <TableHead className="text-[11px] w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer"
              onClick={() => onOpen(c.id)}
            >
              <TableCell className="text-[12px] font-medium">
                {c.razao_social}
                {c.nome_fantasia && c.nome_fantasia !== c.razao_social && (
                  <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {c.nome_fantasia}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                {fmtCNPJ(c.cnpj) ?? "—"}
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground">
                {c.setor ?? "—"}
              </TableCell>
              <TableCell className="text-[12px] tabular-nums">
                {fmtBRL(c.faturamento_medio)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {STAGE_LABEL[c.stage]}
                </Badge>
              </TableCell>
              <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                {fmtDate(c.last_contact_date)}
              </TableCell>
              <TableCell className="text-[12px] text-primary max-w-[180px] truncate">
                {c.next_action ?? "—"}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onQuickView(c)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Visualizar"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegister(c)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Registrar contato"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-[12px] text-muted-foreground py-8"
              >
                Nenhum cedente encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
