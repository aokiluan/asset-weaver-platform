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
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";

interface Stage { id: string; nome: string; ordem: number; cor: string | null }
interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  tipo: "cedente" | "investidor";
  valor_estimado: number | null;
  stage_id: string | null;
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const fmt = (v: number | null) =>
    v == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-md bg-card border shadow-[var(--shadow-card)] cursor-grab active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{lead.nome}</p>
        <Badge variant={lead.tipo === "cedente" ? "default" : "secondary"} className="text-[10px]">{lead.tipo}</Badge>
      </div>
      {lead.empresa && <p className="text-xs text-muted-foreground mt-1">{lead.empresa}</p>}
      {lead.valor_estimado != null && (
        <p className="text-xs font-semibold text-primary mt-2 tabular-nums">{fmt(lead.valor_estimado)}</p>
      )}
    </div>
  );
}

function StageColumn({ stage, leads }: { stage: Stage; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-lg bg-muted/40 border ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: stage.cor ?? "hsl(var(--primary))" }} />
          <span className="text-sm font-semibold">{stage.nome}</span>
          <span className="text-xs text-muted-foreground">({leads.length})</span>
        </div>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto min-h-[200px] max-h-[calc(100vh-260px)]">
        {leads.map((l) => <LeadCard key={l.id} lead={l} />)}
        {leads.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">Vazio</div>
        )}
      </div>
      {total > 0 && (
        <div className="p-2 border-t text-xs text-muted-foreground text-right tabular-nums">
          Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(total)}
        </div>
      )}
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { document.title = "Pipeline | Securitizadora"; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st }, { data: lds }] = await Promise.all([
      supabase.from("pipeline_stages").select("id,nome,ordem,cor").eq("ativo", true).order("ordem"),
      supabase.from("leads").select("id,nome,empresa,tipo,valor_estimado,stage_id").order("created_at", { ascending: false }),
    ]);
    setStages(st ?? []);
    setLeads((lds ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const leadId = String(active.id);
    const newStage = String(over.id);

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === newStage) return;

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage_id: newStage } : l));

    const { error } = await supabase.from("leads").update({ stage_id: newStage }).eq("id", leadId);
    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      load();
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 max-w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Arraste os cards entre estágios.</p>
        </div>
        <Button onClick={() => navigate("/cedentes/novo")}>
          <Plus className="h-4 w-4 mr-2" /> Novo cadastro
        </Button>
      </header>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((s) => (
            <StageColumn key={s.id} stage={s} leads={leads.filter((l) => l.stage_id === s.id)} />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <Card className="p-3 w-72 shadow-[var(--shadow-elegant)]">
              <p className="text-sm font-medium">{activeLead.nome}</p>
              {activeLead.empresa && <p className="text-xs text-muted-foreground">{activeLead.empresa}</p>}
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} />
    </div>
  );
}
