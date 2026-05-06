import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCheck, ArrowUpRight, ListChecks } from "lucide-react";

export interface ChecklistItem {
  key: string;
  label: string;
  hint?: string;
  tab: "visita" | "credito";
}

interface Props {
  proposalId: string;
  cedenteId: string;
  items: ChecklistItem[];
  onProgress?: (info: { completed: number; total: number; allDone: boolean }) => void;
}

export function ReadingChecklist({ proposalId, cedenteId, items, onProgress }: Props) {
  const { user } = useAuth();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("committee_vote_checklist")
        .select("item_key")
        .eq("proposal_id", proposalId)
        .eq("voter_id", user.id);
      if (!active) return;
      setChecked(new Set((data ?? []).map((r: any) => r.item_key)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [proposalId, user?.id]);

  useEffect(() => {
    onProgress?.({
      completed: checked.size,
      total: items.length,
      allDone: items.every((i) => checked.has(i.key)),
    });
  }, [checked, items, onProgress]);

  const toggle = async (item: ChecklistItem) => {
    if (!user) return;
    const isChecked = checked.has(item.key);
    if (isChecked) {
      const next = new Set(checked); next.delete(item.key); setChecked(next);
      await supabase.from("committee_vote_checklist")
        .delete()
        .eq("proposal_id", proposalId).eq("voter_id", user.id).eq("item_key", item.key);
    } else {
      const next = new Set(checked); next.add(item.key); setChecked(next);
      await supabase.from("committee_vote_checklist")
        .insert({ proposal_id: proposalId, voter_id: user.id, item_key: item.key });
    }
  };

  const completed = checked.size;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const allDone = completed === total;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Revisão antes de votar
        </h4>
        <span className={`text-xs tabular-nums ${allDone ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
          {completed}/{total}
        </span>
      </div>
      <Progress value={pct} className={allDone ? "[&>div]:bg-green-600" : ""} />
      <p className="text-xs text-muted-foreground">
        Marque cada item depois de revisar a fonte. {allDone
          ? "Tudo revisado — você pode votar com segurança."
          : "Você ainda pode votar sem completar, mas isso ficará registrado."}
      </p>

      <ul className="space-y-1.5">
        {loading ? (
          <li className="text-xs text-muted-foreground">Carregando…</li>
        ) : items.map((it) => {
          const done = checked.has(it.key);
          return (
            <li key={it.key} className="flex items-start gap-2.5 rounded-md border p-2.5 hover:bg-muted/30 transition">
              <Checkbox
                id={`chk-${it.key}`}
                checked={done}
                onCheckedChange={() => toggle(it)}
                className="mt-0.5"
              />
              <label htmlFor={`chk-${it.key}`} className="flex-1 min-w-0 cursor-pointer">
                <div className={`text-sm ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {it.label}
                </div>
                {it.hint && <div className="text-[11px] text-muted-foreground">{it.hint}</div>}
              </label>
              <Link
                to={`/cedentes/${cedenteId}?tab=${it.tab}`}
                className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                Abrir <ArrowUpRight className="h-3 w-3" />
              </Link>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <div className="flex items-center gap-2 text-xs text-green-600 font-medium pt-1">
          <CheckCheck className="h-4 w-4" /> Checklist completo
        </div>
      )}
    </Card>
  );
}
