import { Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  lastSavedAt: Date | null;
  restored?: boolean;
  onDiscard?: () => void;
  className?: string;
}

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function DraftIndicator(_props: Props) {
  return null;
  // eslint-disable-next-line no-unreachable
  return (
    <div
      className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}
    >
      {lastSavedAt ? (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>
            {restored ? "Rascunho restaurado · " : "Rascunho salvo · "}
            {fmtTime(lastSavedAt)}
          </span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Sem rascunho</span>
        </>
      )}
      {onDiscard && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onDiscard}
        >
          Descartar
        </Button>
      )}
    </div>
  );
}
