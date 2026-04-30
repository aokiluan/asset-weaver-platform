import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    label: "Enviar para Comercial",
    target: "novo",
    fromStages: ["cadastro", "analise", "comite", "formalizacao"],
    roles: ["analista_cadastro", "analista_credito", "gestor_credito", "comite", "gestor_risco", "admin"],
    variant: "outline",
    icon: Undo2,
    isReturn: true,
    skipGates: true,
  },
  {
    key: "to-cadastro",
    label: "Enviar para Cadastro",
    target: "cadastro",
    fromStages: ["novo", "analise", "comite"],
    roles: ["comercial", "gestor_comercial", "analista_cadastro", "admin"],
    variant: "default",
    icon: Send,
  },
  {
    key: "to-credito",
    label: "Enviar para Crédito",
    target: "analise",
    fromStages: ["cadastro", "comite"],
    roles: ["analista_cadastro", "analista_credito", "gestor_credito", "admin"],
    variant: "default",
    icon: Send,
  },
  {
    key: "to-comite",
    label: "Enviar para Comitê",
    target: "comite",
    fromStages: ["analise"],
    roles: ["analista_credito", "gestor_credito", "admin"],
    variant: "default",
    icon: Send,
  },
];

interface Props {
  cedenteId: string;
  stage: CedenteStage;
  isOwner: boolean;
  gateInfo: Omit<CedenteForGates, "stage">;
  onChanged: () => void;
}

export function CedenteStageActions({ cedenteId, stage, isOwner, gateInfo, onChanged }: Props) {
  const { hasRole } = useAuth();
  const [confirmTarget, setConfirmTarget] = useState<Transition | null>(null);
  const [returnOpen, setReturnOpen] = useState<Transition | null>(null);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  // Pendências da etapa atual (somente para botões "para frente")
  const gate = useMemo(() => evaluateGates({ stage, ...gateInfo }), [stage, gateInfo]);

  const visible = TRANSITIONS.filter((t) => {
    if (t.target === stage) return false;
    if (!t.fromStages.includes(stage)) return false;
    const hasAnyRole = t.roles.some((r) => hasRole(r));
    const ownerOverride = t.key === "to-cadastro" && stage === "novo" && isOwner;
    return hasAnyRole || ownerOverride;
  });

  if (visible.length === 0) return null;

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
    onChanged();
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-2 justify-end">
        {visible.map((t) => {
          const Icon = t.icon;
          // Para botões "para frente", checa pendências de gate da etapa atual
          const blockedByGates = !t.skipGates && gate.pendentes.length > 0;
          const disabled = saving || blockedByGates;

          const btn = (
            <Button
              key={t.key}
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

          if (blockedByGates) {
            return (
              <Tooltip key={t.key}>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{btn}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-xs">
                  Pendências:{"\n"}• {gate.pendentes.join("\n• ")}
                </TooltipContent>
              </Tooltip>
            );
          }
          return btn;
        })}
      </div>

      {/* Confirmação de avanço */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O cedente será movido para a etapa <strong>{confirmTarget ? STAGE_LABEL[confirmTarget.target] : ""}</strong>.
              Todos os usuários com acesso verão a nova etapa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); if (confirmTarget) doAdvance(confirmTarget.target); }}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
