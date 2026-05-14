import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  value: number;
  terminal?: boolean;
}

interface FunnelViewProps {
  stages: FunnelStage[];
  fmtValue: (v: number) => string;
}

/**
 * Visualização em funil: barras horizontais proporcionais ao número de itens
 * (ou ao valor total) por estágio, com taxa de conversão entre etapas.
 * Estágios terminais ficam abaixo, em cinza, fora do cálculo de conversão.
 */
export function FunnelView({ stages, fmtValue }: FunnelViewProps) {
  const [mode, setMode] = useState<"count" | "value">("count");

  const funnel = stages.filter((s) => !s.terminal);
  const terminals = stages.filter((s) => s.terminal);

  const metric = (s: FunnelStage) => (mode === "count" ? s.count : s.value);
  const max = Math.max(1, ...funnel.map(metric));
  const first = funnel[0] ? metric(funnel[0]) : 0;

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Funil de conversão
        </span>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as "count" | "value")}
          size="sm"
        >
          <ToggleGroupItem value="count" className="h-6 px-2 text-[11px]">
            por nº
          </ToggleGroupItem>
          <ToggleGroupItem value="value" className="h-6 px-2 text-[11px]">
            por valor
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1.5">
        {funnel.map((s, i) => {
          const m = metric(s);
          const pct = max > 0 ? (m / max) * 100 : 0;
          const conv = i === 0 ? null : first > 0 ? (metric(s) / first) * 100 : null;
          const stepConv =
            i === 0
              ? null
              : metric(funnel[i - 1]) > 0
              ? (metric(s) / metric(funnel[i - 1])) * 100
              : null;
          return (
            <FunnelRow
              key={s.key}
              label={s.label}
              count={s.count}
              value={fmtValue(s.value)}
              widthPct={pct}
              opacity={Math.max(0.35, 1 - i * 0.1)}
              conv={conv}
              stepConv={stepConv}
            />
          );
        })}
      </div>

      {terminals.length > 0 && (
        <>
          <div className="mt-3 pt-3 border-t">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Estágios terminais
            </span>
          </div>
          <div className="space-y-1.5 mt-2">
            {terminals.map((s) => {
              const m = metric(s);
              const pct = max > 0 ? (m / max) * 100 : 0;
              return (
                <FunnelRow
                  key={s.key}
                  label={s.label}
                  count={s.count}
                  value={fmtValue(s.value)}
                  widthPct={pct}
                  opacity={0.4}
                  terminal
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FunnelRow({
  label,
  count,
  value,
  widthPct,
  opacity,
  conv,
  stepConv,
  terminal,
}: {
  label: string;
  count: number;
  value: string;
  widthPct: number;
  opacity: number;
  conv?: number | null;
  stepConv?: number | null;
  terminal?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr_auto] items-center gap-3">
      <div className="text-[12px] text-foreground truncate">{label}</div>
      <div className="relative h-7 rounded bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded transition-all",
            terminal ? "bg-muted-foreground/40" : "bg-primary",
          )}
          style={{ width: `${widthPct}%`, opacity }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] tabular-nums">
          <span className={cn("font-medium", terminal ? "text-muted-foreground" : "text-foreground")}>
            {count}
          </span>
          <span className="text-muted-foreground">{value}</span>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground tabular-nums w-20 text-right leading-tight">
        {conv != null ? (
          <>
            <div>{conv.toFixed(0)}% do topo</div>
            {stepConv != null && (
              <div className="opacity-70">{stepConv.toFixed(0)}% etapa</div>
            )}
          </>
        ) : terminal ? (
          <span className="opacity-60">—</span>
        ) : (
          <span className="opacity-60">topo</span>
        )}
      </div>
    </div>
  );
}
