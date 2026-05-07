import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { CedenteStage, STAGE_COLORS, STAGE_LABEL, STAGE_ORDER } from "@/lib/cedente-stages";

interface CedenteCard {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  stage: CedenteStage;
  faturamento_medio: number | null;
  setor: string | null;
}

const fmtBRL = (v: number | null) =>
  v == null
    ? null
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);

function CedenteCardItem({
  cedente,
  onOpen,
}: {
  cedente: CedenteCard;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cedente.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onOpen}
      className={`p-3 rounded-md bg-card border shadow-[var(--shadow-card)] cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {cedente.razao_social}
        </p>
        <Badge variant="secondary" className="text-[10px] shrink-0">cedente</Badge>
      </div>
      {cedente.nome_fantasia && cedente.nome_fantasia !== cedente.razao_social && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{cedente.nome_fantasia}</p>
      )}
      {cedente.cnpj && (
        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
          CNPJ: {cedente.cnpj}
        </p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        {cedente.setor && (
          <span className="text-[10px] text-muted-foreground truncate">{cedente.setor}</span>
        )}
        {cedente.faturamento_medio != null && (
          <span className="text-xs font-semibold text-primary tabular-nums">
            {fmtBRL(cedente.faturamento_medio)}
          </span>
        )}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  cedentes,
  onOpen,
}: {
  stage: CedenteStage;
  cedentes: CedenteCard[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = cedentes.reduce((s, c) => s + (c.faturamento_medio ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-lg bg-muted/40 border ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: STAGE_COLORS[stage] }}
          />
          <span className="text-sm font-semibold">{STAGE_LABEL[stage]}</span>
          <span className="text-xs text-muted-foreground">({cedentes.length})</span>
        </div>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-260px)]">
        {cedentes.map((c) => (
          <CedenteCardItem key={c.id} cedente={c} onOpen={() => onOpen(c.id)} />
        ))}
        {cedentes.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>
        )}
      </div>
      {total > 0 && (
        <div className="p-2 border-t text-xs text-muted-foreground text-right tabular-nums">
          Faturamento: {fmtBRL(total)}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const [cedentes, setCedentes] = useState<CedenteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

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
      .select("id,razao_social,nome_fantasia,cnpj,stage,faturamento_medio,setor")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar cedentes", { description: error.message });
    }
    setCedentes((data ?? []) as CedenteCard[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const cedenteId = String(active.id);
    const newStage = String(over.id) as CedenteStage;

    const c = cedentes.find((x) => x.id === cedenteId);
    if (!c || c.stage === newStage) return;

    // Optimistic
    setCedentes((prev) =>
      prev.map((x) => (x.id === cedenteId ? { ...x, stage: newStage } : x)),
    );

    const { error } = await supabase
      .from("cedentes")
      .update({ stage: newStage })
      .eq("id", cedenteId);

    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      load();
    } else {
      toast.success(`Movido para ${STAGE_LABEL[newStage]}`);
    }
  };

  const activeCedente = activeId ? cedentes.find((c) => c.id === activeId) : null;

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-tight text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cards entre estágios. Duplo-clique abre o cedente.
          </p>
        </div>
        <Button onClick={() => navigate("/cedentes/novo")}>
          <Plus className="h-4 w-4 mr-2" /> Novo cadastro
        </Button>
      </header>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGE_ORDER.map((s) => (
            <StageColumn
              key={s}
              stage={s}
              cedentes={cedentes.filter((c) => c.stage === s)}
              onOpen={(id) => navigate(`/cedentes/${id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCedente && (
            <Card className="p-3 w-72 shadow-[var(--shadow-elegant)]">
              <p className="text-sm font-medium">{activeCedente.razao_social}</p>
              {activeCedente.cnpj && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {activeCedente.cnpj}
                </p>
              )}
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
