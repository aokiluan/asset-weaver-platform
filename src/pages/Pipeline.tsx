import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { PageTabs } from "@/components/PageTabs";

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

const fmtCNPJ = (s: string | null) => {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

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
      className={`p-2 rounded border bg-card cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="text-[12px] font-medium leading-tight line-clamp-2 text-foreground">
        {cedente.razao_social}
      </p>
      {cedente.nome_fantasia && cedente.nome_fantasia !== cedente.razao_social && (
        <p className="text-[10px] leading-tight text-muted-foreground truncate mt-0.5">
          {cedente.nome_fantasia}
        </p>
      )}
      {cedente.cnpj && (
        <p className="text-[10px] leading-none text-muted-foreground tabular-nums mt-1">
          {fmtCNPJ(cedente.cnpj)}
        </p>
      )}
      {(cedente.setor || cedente.faturamento_medio != null) && (
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {cedente.setor ? (
            <span className="text-[10px] leading-none text-muted-foreground truncate">
              {cedente.setor}
            </span>
          ) : (
            <span />
          )}
          {cedente.faturamento_medio != null && (
            <span className="text-[11px] font-medium text-primary tabular-nums leading-none">
              {fmtBRL(cedente.faturamento_medio)}
            </span>
          )}
        </div>
      )}
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
      className={`flex flex-col w-64 shrink-0 rounded-md bg-muted/30 border ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="px-2.5 py-1.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: STAGE_COLORS[stage] }}
          />
          <span className="text-[12px] font-medium text-foreground truncate">
            {STAGE_LABEL[stage]}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
          {cedentes.length}
        </span>
      </div>
      <div className="p-1.5 space-y-1.5 flex-1 overflow-y-auto min-h-[160px] max-h-[calc(100vh-220px)]">
        {cedentes.map((c) => (
          <CedenteCardItem key={c.id} cedente={c} onOpen={() => onOpen(c.id)} />
        ))}
        {cedentes.length === 0 && (
          <div className="text-[10px] leading-none text-muted-foreground/60 text-center py-3">
            Vazio
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="px-2.5 py-1 border-t text-[10px] leading-none text-muted-foreground text-right tabular-nums">
          {fmtBRL(total)}
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

  return (
    <>
      <PageTabs
        title="Pipeline"
        description="Arraste os cards entre estágios. Duplo-clique abre o cedente."
        tabs={[]}
        actions={
          <Button
            onClick={() => navigate("/cedentes/novo")}
            size="sm"
            className="h-7 text-[12px]"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo cadastro
          </Button>
        }
      />
      <div className="space-y-3 max-w-full">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-3">
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
                <Card className="p-2 w-64 shadow-[var(--shadow-elegant)]">
                  <p className="text-[12px] font-medium leading-tight">
                    {activeCedente.razao_social}
                  </p>
                  {activeCedente.cnpj && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {fmtCNPJ(activeCedente.cnpj)}
                    </p>
                  )}
                </Card>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </>
  );
}
