import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  cedenteId: string;
  canApprove: boolean; // gates ok para avançar para "analise"
  pendencias: string[]; // o que falta para avançar
  onChanged: () => void;
}

export function RevisarCadastroActions({ cedenteId, canApprove, pendencias, onChanged }: Props) {
  const [devolverOpen, setDevolverOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const aprovar = async () => {
    if (!canApprove) {
      toast.error("Há pendências", { description: pendencias.join(" • ") });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cedentes").update({ stage: "analise" }).eq("id", cedenteId);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Cadastro aprovado, enviado para análise de crédito");
    onChanged();
  };

  const devolver = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da devolução");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("cedentes").update({
      stage: "novo",
      observacoes: `[Devolvido pela análise]: ${motivo.trim()}`,
    }).eq("id", cedenteId);
    setSaving(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Cedente devolvido ao comercial");
    setDevolverOpen(false);
    setMotivo("");
    onChanged();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setDevolverOpen(true)}>
        <Undo2 className="h-4 w-4 mr-2" /> Devolver ao comercial
      </Button>
      <Button onClick={aprovar} disabled={!canApprove || saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        Aprovar cadastro
      </Button>

      <Dialog open={devolverOpen} onOpenChange={setDevolverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver ao comercial</DialogTitle>
            <DialogDescription>
              Explique o motivo. O comercial verá esta observação ao retomar o cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-dev">Motivo</Label>
            <Textarea
              id="motivo-dev"
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: contrato social desatualizado, falta comprovante de endereço..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolverOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={devolver} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
