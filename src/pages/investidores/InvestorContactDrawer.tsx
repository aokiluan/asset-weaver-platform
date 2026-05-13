import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Users,
  StickyNote,
  CheckSquare,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ACTIVITY_LABEL,
  ACTIVITY_TYPES,
  fmtCompactBRL,
  INVESTOR_TYPE_LABEL,
  isAdvance,
  nextStage,
  prevStage,
  STAGE_LABEL,
  STAGE_ORDER,
  todayISO,
  type ActivityType,
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
}

const ACTIVITY_ICON: Record<ActivityType, typeof Phone> = {
  ligacao: Phone,
  email: Mail,
  reuniao: Users,
  nota: StickyNote,
  tarefa: CheckSquare,
};

export function InvestorContactDrawer({ contact, onClose, onChanged, onEdit }: Props) {
  const open = !!contact;
  const [activities, setActivities] = useState<InvestorActivity[]>([]);
  const [actType, setActType] = useState<ActivityType>("ligacao");
  const [actDesc, setActDesc] = useState("");
  const [logging, setLogging] = useState(false);

  async function loadActivities(contactId: string) {
    const { data } = await supabase
      .from("investor_contact_activities")
      .select("*")
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false });
    setActivities((data ?? []) as InvestorActivity[]);
  }

  useEffect(() => {
    if (contact) {
      loadActivities(contact.id);
      setActDesc("");
      setActType("ligacao");
    } else {
      setActivities([]);
    }
  }, [contact?.id]);

  async function moveStage(dir: "prev" | "next") {
    if (!contact) return;
    const target = dir === "next" ? nextStage(contact.stage) : prevStage(contact.stage);
    if (!target) return;
    const patch: { stage: InvestorStage; last_contact_date?: string } = { stage: target };
    if (isAdvance(contact.stage, target)) patch.last_contact_date = todayISO();

    const { error } = await supabase
      .from("investor_contacts")
      .update(patch)
      .eq("id", contact.id);
    if (error) return toast.error("Erro ao mover estágio", { description: error.message });
    toast.success(`Movido para ${STAGE_LABEL[target]}`);
    onChanged();
  }

  async function logActivity() {
    if (!contact || !actDesc.trim()) return;
    setLogging(true);
    const { error } = await supabase.from("investor_contact_activities").insert({
      contact_id: contact.id,
      type: actType,
      description: actDesc.trim(),
    });
    if (error) {
      toast.error("Erro ao registrar atividade", { description: error.message });
      setLogging(false);
      return;
    }
    // Auto-stamp do último contato (exceto nota/tarefa, que não são interação direta)
    if (actType === "ligacao" || actType === "email" || actType === "reuniao") {
      await supabase
        .from("investor_contacts")
        .update({ last_contact_date: todayISO() })
        .eq("id", contact.id);
      onChanged();
    }
    setActDesc("");
    setLogging(false);
    loadActivities(contact.id);
    toast.success("Atividade registrada");
  }

  async function deleteActivity(id: string) {
    if (!contact) return;
    const { error } = await supabase
      .from("investor_contact_activities")
      .delete()
      .eq("id", id);
    if (error) return toast.error("Erro ao excluir", { description: error.message });
    loadActivities(contact.id);
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

              {/* Activity Timeline (estilo Salesforce) */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                  Atividades
                </div>

                <div className="rounded-md border bg-card p-2.5 space-y-2">
                  <div className="flex gap-1.5">
                    <Select value={actType} onValueChange={(v) => setActType(v as ActivityType)}>
                      <SelectTrigger className="h-7 w-[110px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-[12px]">
                            {ACTIVITY_LABEL[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={actDesc}
                      onChange={(e) => setActDesc(e.target.value)}
                      placeholder="Descreva a interação..."
                      className="min-h-[28px] h-7 py-1 text-[12px] resize-none flex-1"
                      rows={1}
                    />
                    <Button
                      size="sm"
                      className="h-7 px-2"
                      disabled={!actDesc.trim() || logging}
                      onClick={logActivity}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {activities.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/70 text-center py-3 border border-dashed rounded-md">
                      Nenhuma atividade registrada
                    </div>
                  ) : (
                    activities.map((a) => {
                      const Icon = ACTIVITY_ICON[a.type];
                      return (
                        <div
                          key={a.id}
                          className="group rounded-md border bg-card p-2 flex gap-2"
                        >
                          <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[11px] font-medium text-foreground leading-none">
                                {ACTIVITY_LABEL[a.type]}
                              </span>
                              <span className="text-[10px] text-muted-foreground leading-none">
                                {new Date(a.occurred_at).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="text-[12px] text-foreground leading-tight mt-1 whitespace-pre-wrap">
                              {a.description}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteActivity(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            aria-label="Excluir atividade"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
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
