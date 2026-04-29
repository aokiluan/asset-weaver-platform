import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  ok: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedenteId: string;
  checklist: ChecklistItem[];
  onSent: () => void;
}

export function EnviarAnaliseDialog({ open, onOpenChange, cedenteId, checklist, onSent }: Props) {
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const allOk = checklist.every((c) => c.ok);
  const pendentes = checklist.filter((c) => !c.ok);

  const enviar = async () => {
    if (!allOk) return;
    setSaving(true);
    const updates: Record<string, unknown> = { stage: "cadastro" };
    if (obs.trim()) updates.observacoes = obs.trim();
    const { error } = await supabase.from("cedentes").update(updates).eq("id", cedenteId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao enviar", { description: error.message });
      return;
    }
    toast.success("Cadastro enviado para análise");
    onOpenChange(false);
    setObs("");
    onSent();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar para análise de cadastro</DialogTitle>
          <DialogDescription>
            Confira os requisitos antes de enviar. O analista de cadastro receberá este cedente na fila.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {checklist.map((c, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 text-sm rounded-md border px-3 py-2",
                c.ok ? "border-border" : "border-destructive/30 bg-destructive/5",
              )}
            >
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              )}
              <span className={cn(!c.ok && "text-destructive")}>{c.label}</span>
            </li>
          ))}
        </ul>

        {!allOk && (
          <p className="text-xs text-destructive">
            Resolva os {pendentes.length} item(ns) acima para liberar o envio.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="obs-envio">Observação para o analista (opcional)</Label>
          <Textarea
            id="obs-envio"
            rows={3}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: priorizar análise, particularidades do cliente..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={!allOk || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar para análise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
