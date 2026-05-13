import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fmtCompactBRL,
  INVESTOR_TYPE_LABEL,
  nextStage,
  prevStage,
  STAGE_LABEL,
  STAGE_ORDER,
  type InvestorContact,
} from "@/lib/investor-contacts";
import { cn } from "@/lib/utils";

interface Props {
  contact: InvestorContact | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (c: InvestorContact) => void;
}

export function InvestorContactDrawer({ contact, onClose, onChanged, onEdit }: Props) {
  const open = !!contact;

  async function moveStage(dir: "prev" | "next") {
    if (!contact) return;
    const target = dir === "next" ? nextStage(contact.stage) : prevStage(contact.stage);
    if (!target) return;
    const { error } = await supabase
      .from("investor_contacts")
      .update({ stage: target })
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
              <Stepper stage={contact.stage} />

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
                <Row label="Próxima ação" value={contact.next_action ?? "—"} />
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
}: {
  label: string;
  value: string;
  multiline?: boolean;
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
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Stepper({ stage }: { stage: (typeof STAGE_ORDER)[number] }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                i <= idx ? "bg-primary" : "bg-muted-foreground/30",
              )}
            />
            <span
              className={cn(
                "text-[9px] leading-none text-center truncate w-full",
                i === idx ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {STAGE_LABEL[s]}
            </span>
          </div>
          {i < STAGE_ORDER.length - 1 && (
            <div
              className={cn(
                "h-px flex-1 -mt-3",
                i < idx ? "bg-primary" : "bg-muted-foreground/30",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
