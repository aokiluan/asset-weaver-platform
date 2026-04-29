import { Check, Circle, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CedenteStage,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_DESCRIPTION,
  GateResult,
} from "@/lib/cedente-stages";

interface Props {
  stage: CedenteStage;
  gate: GateResult;
  onAdvance: () => void;
  onReturn?: () => void;
  onInativar?: () => void;
  advancing?: boolean;
}

export function CedenteStageBar({ stage, gate, onAdvance, onReturn, onInativar, advancing }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const isFinal = stage === "ativo" || stage === "inativo";

  return (
    <div className="rounded-lg border bg-card p-6 space-y-5">
      {/* Stepper horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STAGE_ORDER.map((s, idx) => {
          const isDone = idx < currentIdx || stage === "ativo";
          const isCurrent = idx === currentIdx && stage !== "inativo";
          return (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2",
                    isDone && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-background",
                    !isDone && !isCurrent && "border-muted text-muted-foreground bg-background",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {STAGE_LABEL[s]}
                </span>
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-10 mb-5",
                    isDone ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
        {stage === "inativo" && (
          <Badge variant="destructive" className="ml-3">Inativo</Badge>
        )}
      </div>

      {/* Descrição do estágio */}
      <div className="text-sm text-muted-foreground border-t pt-4">
        <span className="font-medium text-foreground">{STAGE_LABEL[stage]}: </span>
        {STAGE_DESCRIPTION[stage]}
      </div>

      {/* Gates */}
      {!isFinal && gate.next && (
        <div className="space-y-3 border-t pt-4">
          <div className="text-sm font-medium">
            Para avançar para <span className="text-primary">{STAGE_LABEL[gate.next]}</span>:
          </div>
          <ul className="space-y-1.5 text-sm">
            {gate.atendidos.map((item) => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
            {gate.pendentes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={onAdvance} disabled={!gate.allowed || advancing}>
              {advancing ? "Avançando..." : `Avançar para ${STAGE_LABEL[gate.next]}`}
            </Button>
            {onReturn && currentIdx > 0 && (
              <Button variant="outline" onClick={onReturn}>
                Devolver para etapa anterior
              </Button>
            )}
            {onInativar && (
              <Button variant="ghost" onClick={onInativar} className="text-destructive">
                Inativar
              </Button>
            )}
          </div>
        </div>
      )}

      {isFinal && (
        <div className="border-t pt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Circle className="h-3 w-3" />
          {(stage as CedenteStage) === "ativo"
            ? "Cedente ativo. Pode operar normalmente."
            : "Cedente inativo. Operações bloqueadas."}
        </div>
      )}
    </div>
  );
}
