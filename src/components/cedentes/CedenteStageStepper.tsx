import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABEL, type AppRole } from "@/lib/roles";
import {
  CedenteStage,
  STAGE_COLORS,
  STAGE_LABEL,
  STAGE_ORDER,
  STAGE_PERMISSIONS,
  evaluateGates,
  nextStage,
  type CedenteForGates,
} from "@/lib/cedente-stages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  stage: CedenteStage;
  isOwner: boolean;
  gateInfo: Omit<CedenteForGates, "stage">;
  onAdvance: (target: CedenteStage) => void;
}

export function CedenteStageStepper({ stage, isOwner, gateInfo, onAdvance }: Props) {
  const { hasRole } = useAuth();

  const next = nextStage(stage);
  const gate = useMemo(() => evaluateGates({ stage, ...gateInfo }), [stage, gateInfo]);

  const allowedRoles = STAGE_PERMISSIONS[stage] ?? [];
  const userHasRole =
    allowedRoles.some((r) => hasRole(r)) || (stage === "novo" && isOwner);
  const gatesOk = gate.pendentes.length === 0;
  const canAdvance = !!next && userHasRole && gatesOk;

  const currentIdx = STAGE_ORDER.indexOf(stage);

  // Tooltip text para a próxima etapa
  const nextTooltip = (() => {
    if (!next) return "Etapa final";
    if (!userHasRole) {
      return "Seu usuário não tem permissão";
    }
    if (!gatesOk) return `Pendências:\n• ${gate.pendentes.join("\n• ")}`;
    return `Avançar para ${STAGE_LABEL[next]}`;
  })();

  return (
    <TooltipProvider delayDuration={200}>
      <ol className="flex items-center w-full gap-1 sm:gap-2">
        {STAGE_ORDER.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isNext = !!next && s === next;
          const isFuture = idx > currentIdx && !isNext;
          const color = STAGE_COLORS[s];

          // Conector à direita (não desenha após o último)
          const showConnector = idx < STAGE_ORDER.length - 1;
          const connectorActive = idx < currentIdx;

          // Stepper agora é apenas visual; o avanço é feito pelos botões dedicados
          const dotInteractive = false;
          const dotBlocked = false;

          const dot = (
            <div
              role="presentation"
              className={cn(
                "relative flex items-center justify-center rounded-full border-2 transition-all",
                "h-3 w-3 sm:h-3.5 sm:w-3.5",
                isCurrent && "ring-4 ring-offset-1 ring-offset-background",
                dotInteractive &&
                  "cursor-pointer hover:scale-125 hover:shadow-md focus-visible:outline-none focus-visible:ring-2",
                dotBlocked && "cursor-not-allowed opacity-60",
                isFuture && "opacity-40",
              )}
              style={{
                background: isDone || isCurrent ? color : "transparent",
                borderColor: color,
                ...(isCurrent ? { boxShadow: `0 0 0 4px ${color}33` } : {}),
              }}
              aria-label={`${STAGE_LABEL[s]}${isCurrent ? " (atual)" : ""}`}
            >
              {isDone && <Check className="h-2 w-2 text-white" strokeWidth={4} />}
            </div>
          );

          return (
            <li key={s} className="flex items-center flex-1 min-w-0 last:flex-none">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>{dot}</TooltipTrigger>
                  <TooltipContent side="top" className="whitespace-pre-line max-w-xs text-xs">
                    {isCurrent
                      ? `Etapa atual: ${STAGE_LABEL[s]}`
                      : isDone
                        ? `Concluído: ${STAGE_LABEL[s]}`
                        : isNext
                          ? nextTooltip
                          : `${STAGE_LABEL[s]} (etapas seguintes)`}
                  </TooltipContent>
                </Tooltip>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs leading-tight text-center whitespace-normal break-words",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                    isFuture && "opacity-60",
                  )}
                  title={STAGE_LABEL[s]}
                >
                  {STAGE_LABEL[s]}
                </span>
              </div>
              {showConnector && (
                <div
                  className="flex-1 h-0.5 mx-1 sm:mx-2 mb-4 rounded-full transition-colors"
                  style={{
                    background: connectorActive ? color : "hsl(var(--muted))",
                    opacity: connectorActive ? 0.7 : 1,
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </TooltipProvider>
  );
}
