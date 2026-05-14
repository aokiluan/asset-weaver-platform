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
import { STAGE_LABEL, type CedenteStage } from "@/lib/cedente-stages";
import {
  CEDENTE_ACTIVITY_LABEL,
  type CedenteActivity,
} from "@/lib/cedente-activities";

export interface CedenteQuickView {
  id: string;
  razao_social: string;
  cnpj: string | null;
  stage: CedenteStage;
  setor: string | null;
  faturamento_medio: number | null;
  cidade: string | null;
  estado: string | null;
  limite_aprovado: number | null;
  next_action: string | null;
  last_contact_date: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedente: CedenteQuickView | null;
  onRegisterContact: (c: CedenteQuickView) => void;
  onOpenDetails: (c: CedenteQuickView) => void;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);

const fmtCNPJ = (s: string | null) => {
  if (!s) return "—";
  const d = s.replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export function CedenteQuickViewDialog({
  open,
  onOpenChange,
  cedente,
  onRegisterContact,
  onOpenDetails,
}: Props) {
  const [activities, setActivities] = useState<CedenteActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !cedente) return;
    setLoading(true);
    (supabase as any)
      .from("cedente_contact_activities")
      .select("*")
      .eq("cedente_id", cedente.id)
      .order("occurred_at", { ascending: false })
      .limit(3)
      .then(({ data }: { data: CedenteActivity[] | null }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, [open, cedente]);

  if (!cedente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] leading-tight">{cedente.razao_social}</DialogTitle>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge className="text-[10px] font-normal">{STAGE_LABEL[cedente.stage]}</Badge>
            {cedente.setor && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {cedente.setor}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-card p-2.5">
            <Field label="CNPJ" value={fmtCNPJ(cedente.cnpj)} />
            <Field label="Faturamento" value={fmtBRL(cedente.faturamento_medio)} />
            <Field
              label="Localização"
              value={
                cedente.cidade
                  ? `${cedente.cidade}${cedente.estado ? `/${cedente.estado}` : ""}`
                  : "—"
              }
            />
            <Field label="Limite aprovado" value={fmtBRL(cedente.limite_aprovado)} />
          </div>

          {cedente.next_action && (
            <div className="rounded-md border bg-card p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                Próxima ação
              </div>
              <div className="text-[12px] text-primary font-medium leading-tight mt-1">
                → {cedente.next_action}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-1.5">
              Histórico de contatos
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
                      {CEDENTE_ACTIVITY_LABEL[a.type]}
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
              onOpenDetails(cedente);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Abrir cadastro
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              onOpenChange(false);
              onRegisterContact(cedente);
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
