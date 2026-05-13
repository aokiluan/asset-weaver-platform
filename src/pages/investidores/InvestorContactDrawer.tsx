import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  fmtCompactBRL,
  INVESTOR_ACTIVITY_LABEL,
  INVESTOR_TYPE_LABEL,
  nextStage,
  prevStage,
  STAGE_LABEL,
  STAGE_ORDER,
  type InvestorActivity,
  type InvestorContact,
  type InvestorStage,
} from "@/lib/investor-contacts";
import { cn } from "@/lib/utils";

interface Props {
  contact: InvestorContact | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (c: InvestorContact) => void;
  onRegisterContact: (c: InvestorContact) => void;
  onRequestStageMove: (c: InvestorContact, to: InvestorStage) => void;
}

export function InvestorContactDrawer({
  contact,
  onClose,
  onChanged,
  onEdit,
  onRegisterContact,
  onRequestStageMove,
}: Props) {
  const open = !!contact;
  const [activities, setActivities] = useState<InvestorActivity[]>([]);

  useEffect(() => {
    if (!contact) {
      setActivities([]);
      return;
    }
    supabase
      .from("investor_contact_activities")
      .select("*")
      .eq("contact_id", contact.id)
      .order("occurred_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setActivities((data ?? []) as InvestorActivity[]));
  }, [contact]);

  async function moveStage(dir: "prev" | "next") {
    if (!contact) return;
    const target = dir === "next" ? nextStage(contact.stage) : prevStage(contact.stage);
    if (!target) return;
    const patch: { stage: InvestorStage; last_contact_date?: string } = { stage: target };
    // Auto-stamp do último contato apenas ao avançar
    if (isAdvance(contact.stage, target)) patch.last_contact_date = todayISO();

    const { error } = await supabase
      .from("investor_contacts")
      .update(patch)
      .eq("id", contact.id);
    if (error) return toast.error("Erro ao mover estágio", { description: error.message });
    toast.success(`Movido para ${STAGE_LABEL[target]}`);
    onChanged();
  }

  async function handleDelete() {
    if (!contact) return;
    if (!confirm(`Excluir contato "${contact.name}"?`)) return;
    const { error } = await supabase.from("investor_contacts").delete().eq("id", contact.id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    toast.success("Contato excluído");
    onChanged();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        {contact && (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-[14px] leading-tight">{contact.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {INVESTOR_TYPE_LABEL[contact.type]}
                </Badge>
                <Badge className="text-[10px] font-normal">{STAGE_LABEL[contact.stage]}</Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              <StageChips stage={contact.stage} />

              <div className="rounded-md border bg-card p-2.5 space-y-2">
                <Row label="Ticket" value={fmtCompactBRL(contact.ticket)} />
                <Row label="Contato" value={contact.contact_name ?? "—"} />
                <Row label="Telefone" value={contact.phone ?? "—"} />
                <Row
                  label="Último contato"
                  value={
                    contact.last_contact_date
                      ? new Date(contact.last_contact_date + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"
                  }
                />
                <Row
                  label="Próxima ação"
                  value={contact.next_action ?? "—"}
                  accent={!!contact.next_action}
                />
                <Row label="Notas" value={contact.notes ?? "—"} multiline />
              </div>
            </div>

            <div className="border-t px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => moveStage("prev")}
                  disabled={!prevStage(contact.stage)}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Voltar
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => moveStage("next")}
                  disabled={!nextStage(contact.stage)}
                >
                  Avançar
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onEdit(contact)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  value,
  multiline,
  accent,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-[12px] text-foreground leading-tight",
          multiline && "whitespace-pre-wrap",
          accent && "text-primary font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StageChips({ stage }: { stage: InvestorStage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex flex-wrap gap-1">
      {STAGE_ORDER.map((s, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <span
            key={s}
            className={cn(
              "text-[10px] leading-none px-1.5 py-1 rounded border",
              active && "bg-primary/10 border-primary/40 text-primary font-medium",
              done && !active && "bg-muted border-transparent text-muted-foreground",
              !active && !done && "border-border text-muted-foreground/70",
            )}
          >
            {STAGE_LABEL[s]}
          </span>
        );
      })}
    </div>
  );
}
