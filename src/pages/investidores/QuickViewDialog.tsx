import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fmtCompactBRL,
  INVESTOR_ACTIVITY_LABEL,
  INVESTOR_TYPE_LABEL,
  STAGE_LABEL,
  type InvestorActivity,
  type InvestorContact,
} from "@/lib/investor-contacts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: InvestorContact | null;
  onRegisterContact: (c: InvestorContact) => void;
  onOpenDetails: (c: InvestorContact) => void;
}

export function QuickViewDialog({
  open,
  onOpenChange,
  contact,
  onRegisterContact,
  onOpenDetails,
}: Props) {
  const [activities, setActivities] = useState<InvestorActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;
    setLoading(true);
    supabase
      .from("investor_contact_activities")
      .select("*")
      .eq("contact_id", contact.id)
      .order("occurred_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setActivities((data ?? []) as InvestorActivity[]);
        setLoading(false);
      });
  }, [open, contact]);

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] leading-tight">{contact.name}</DialogTitle>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {INVESTOR_TYPE_LABEL[contact.type]}
            </Badge>
            <Badge className="text-[10px] font-normal">{STAGE_LABEL[contact.stage]}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-card p-2.5">
            <Field label="Telefone" value={contact.phone ?? "—"} />
            <Field label="Ticket" value={fmtCompactBRL(contact.ticket)} />
            <Field label="Contato" value={contact.contact_name ?? "—"} />
            <Field
              label="Último contato"
              value={
                contact.last_contact_date
                  ? new Date(contact.last_contact_date + "T00:00:00").toLocaleDateString("pt-BR")
                  : "—"
              }
            />
          </div>

          {contact.next_action && (
            <div className="rounded-md border bg-card p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                Próxima ação
              </div>
              <div className="text-[12px] text-primary font-medium leading-tight mt-1">
                → {contact.next_action}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-1.5">
              Histórico de interações
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-3 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-[11px] text-muted-foreground py-2 border border-dashed rounded-md text-center">
                Nenhum contato registrado.
              </div>
            ) : (
              <div className="space-y-1.5">
                {activities.map((a) => (
                  <div key={a.id} className="border-l-2 border-border pl-2">
                    <div className="text-[10px] text-muted-foreground leading-none">
                      {new Date(a.occurred_at).toLocaleDateString("pt-BR")} ·{" "}
                      {INVESTOR_ACTIVITY_LABEL[a.type]}
                    </div>
                    <div className="text-[12px] text-foreground leading-tight mt-0.5 whitespace-pre-wrap">
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => {
              onOpenChange(false);
              onOpenDetails(contact);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Abrir detalhes
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              onOpenChange(false);
              onRegisterContact(contact);
            }}
          >
            <Phone className="h-3.5 w-3.5 mr-1" />
            Registrar contato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </span>
      <span className="text-[12px] text-foreground leading-tight">{value}</span>
    </div>
  );
}
