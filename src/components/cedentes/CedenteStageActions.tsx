import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";
import {
  CedenteStage, STAGE_LABEL, evaluateGates, type CedenteForGates,
} from "@/lib/cedente-stages";

interface Transition {
  key: string;
  label: string;
  target: CedenteStage;
  fromStages: CedenteStage[];
  roles: AppRole[];
  variant: "default" | "outline" | "destructive";
  icon: typeof Send;
  isReturn?: boolean; // exige motivo
  // se definido, ignora avaliação por gates (ex: devolução não precisa de gates)
  skipGates?: boolean;
}

const TRANSITIONS: Transition[] = [
  {
    key: "to-comercial",
    label: "Devolver ao Comercial",
    target: "novo",
    fromStages: ["cadastro", "analise", "comite", "formalizacao"],
    roles: ["cadastro", "credito", "comite", "formalizacao", "admin", "gestor_geral"],
    variant: "outline",
    icon: Undo2,
    isReturn: true,
    skipGates: true,
  },
  {
    key: "to-cadastro",
    label: "Enviar para Cadastro",
    target: "cadastro",
    fromStages: ["novo"],
    roles: ["comercial", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
  },
  {
    key: "to-credito",
    label: "Enviar para Crédito",
    target: "analise",
    fromStages: ["cadastro"],
    roles: ["cadastro", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
  },
  {
    key: "to-comite",
    label: "Enviar para Comitê",
    target: "comite",
    fromStages: ["analise"],
    roles: ["credito", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
  },
  {
    key: "to-ativo",
    label: "Ativar cedente",
    target: "ativo",
    fromStages: ["formalizacao"],
    roles: ["formalizacao", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
  },
];

// Atalho de retorno: quando o cedente foi devolvido ao Comercial,
// permitir reenviar direto para a etapa que pediu a revisão (sem passar pelo Cadastro).
const RETURN_SHORTCUTS: Record<string, Transition> = {
  analise: {
    key: "to-credito-direct",
    label: "Reenviar para Crédito",
    target: "analise",
    fromStages: ["novo"],
    roles: ["comercial", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
    skipGates: true,
  },
  comite: {
    key: "to-comite-direct",
    label: "Reenviar para Comitê",
    target: "comite",
    fromStages: ["novo"],
    roles: ["comercial", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
    skipGates: true,
  },
  formalizacao: {
    key: "to-formalizacao-direct",
    label: "Reenviar para Formalização",
    target: "formalizacao",
    fromStages: ["novo"],
    roles: ["comercial", "admin", "gestor_geral"],
    variant: "default",
    icon: Send,
    skipGates: true,
  },
};

interface Props {
  cedenteId: string;
  stage: CedenteStage;
  isOwner: boolean;
  gateInfo: Omit<CedenteForGates, "stage">;
  onChanged: () => void;
  returnedFromStage?: CedenteStage | null;
}

export function CedenteStageActions({ cedenteId, stage, isOwner, gateInfo, onChanged, returnedFromStage }: Props) {
  const { hasRole } = useAuth();
  const [confirmTarget, setConfirmTarget] = useState<Transition | null>(null);
  const [returnOpen, setReturnOpen] = useState<Transition | null>(null);
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  // Pendências da etapa atual (somente para botões "para frente")
  const gate = useMemo(() => evaluateGates({ stage, ...gateInfo }), [stage, gateInfo]);

  // Mostramos sempre os 4 botões; cada um habilita conforme regras
  const evaluations = TRANSITIONS.map((t) => {
    const isCurrent = t.target === stage;
    const stageOk = t.fromStages.includes(stage);
    const hasAnyRole = t.roles.some((r) => hasRole(r));
    const ownerOverride = t.key === "to-cadastro" && stage === "novo" && isOwner;
    const roleOk = hasAnyRole || ownerOverride;
    const gatesOk = t.skipGates ? true : gate.pendentes.length === 0;

    let reason: string | null = null;
    if (isCurrent) reason = `Cedente já está na etapa ${STAGE_LABEL[stage]}`;
    else if (!stageOk) reason = `Não disponível na etapa atual (${STAGE_LABEL[stage]})`;
    else if (!roleOk) {
      reason = "Seu usuário não tem permissão";
    } else if (!gatesOk) {
      reason = `Pendências:\n• ${gate.pendentes.join("\n• ")}`;
    }

    return { t, enabled: reason === null, reason };
  });

  const doAdvance = async (target: CedenteStage, extraObs?: string) => {
    setSaving(true);
    const updates: { stage: CedenteStage; observacoes?: string } = { stage: target };
    if (extraObs) updates.observacoes = extraObs;
    const { error } = await supabase.from("cedentes").update(updates).eq("id", cedenteId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      return;
    }
    toast.success(`Cedente movido para ${STAGE_LABEL[target]}`);
    setConfirmTarget(null);
    setReturnOpen(null);
    setMotivo("");
    setObservacao("");
    onChanged();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-2 justify-end">
        {evaluations.map(({ t, enabled, reason }) => {
          const Icon = t.icon;
          const disabled = saving || !enabled;

          const btn = (
            <Button
              variant={t.variant}
              disabled={disabled}
              onClick={() => {
                if (t.isReturn) setReturnOpen(t);
                else setConfirmTarget(t);
              }}
            >
              <Icon className="h-4 w-4 mr-2" />
              {t.label}
            </Button>
          );

          if (reason) {
            return (
              <Tooltip key={t.key}>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex">{btn}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
                  {reason}
                </TooltipContent>
              </Tooltip>
            );
          }
          return <span key={t.key} className="inline-flex">{btn}</span>;
        })}
      </div>

      {/* Confirmação de avanço (com observação opcional) */}
      <Dialog
        open={!!confirmTarget}
        onOpenChange={(o) => { if (!o) { setConfirmTarget(null); setObservacao(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTarget?.label}?</DialogTitle>
            <DialogDescription>
              O cedente será movido para a etapa <strong>{confirmTarget ? STAGE_LABEL[confirmTarget.target] : ""}</strong>.
              Todos os usuários com acesso verão a nova etapa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="obs-envio">Observação para o próximo responsável (opcional)</Label>
            <Textarea
              id="obs-envio"
              rows={4}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: priorizar análise, particularidades do cliente, pendências em aberto..."
            />
            <p className="text-[11px] text-muted-foreground">
              A observação aparece no histórico do cedente, junto com a mudança de etapa.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmTarget(null); setObservacao(""); }} disabled={saving}>
              Cancelar
            </Button>
            <Button
              disabled={saving}
              onClick={() => { if (confirmTarget) doAdvance(confirmTarget.target, observacao.trim() || undefined); }}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Devolução com motivo */}
      <Dialog open={!!returnOpen} onOpenChange={(o) => { if (!o) { setReturnOpen(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{returnOpen?.label}</DialogTitle>
            <DialogDescription>
              Informe o motivo da devolução. Será registrado nas observações do cedente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-devolucao">Motivo</Label>
            <Textarea
              id="motivo-devolucao"
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: contrato social desatualizado, falta comprovante de endereço..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnOpen(null); setMotivo(""); }} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !motivo.trim()}
              onClick={() => {
                if (!motivo.trim()) { toast.error("Informe o motivo"); return; }
                if (returnOpen) doAdvance(returnOpen.target, `[Devolvido]: ${motivo.trim()}`);
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
