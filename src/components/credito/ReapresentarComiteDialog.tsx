import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  cedenteId: string;
  cedenteNome?: string;
  onDone?: () => void;
  trigger?: React.ReactNode;
}

const MIN = 30;

export function ReapresentarComiteDialog({ cedenteId, cedenteNome, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [mudancas, setMudancas] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = justificativa.trim().length >= MIN;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const { error } = await supabase.rpc("reapresentar_proposta_comite" as any, {
      _cedente_id: cedenteId,
      _justificativa: justificativa.trim(),
      _mudancas: mudancas.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Proposta reapresentada — cedente voltou para Análise de crédito");
    setOpen(false);
    setJustificativa("");
    setMudancas("");
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="default" className="h-7 text-[11px] gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reapresentar ao comitê
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Reapresentar ao comitê</DialogTitle>
          <DialogDescription className="text-[11px]">
            {cedenteNome ? <><strong>{cedenteNome}</strong> — </> : null}
            Uma nova proposta será criada vinculada à anterior. O cedente volta para
            <strong> Análise de crédito</strong> para que o time revise o parecer antes de submeter
            novamente. A justificativa fica registrada na próxima ata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px]">
              Justificativa da reapresentação <span className="text-destructive">*</span>
            </Label>
            <Textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que esta proposta deve ser reavaliada pelo comitê?"
              className="text-[12px]"
            />
            <p className="text-[10px] text-muted-foreground leading-none">
              {justificativa.trim().length}/{MIN} caracteres mínimos
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">O que mudou desde a última votação? (opcional)</Label>
            <Textarea
              rows={3}
              value={mudancas}
              onChange={(e) => setMudancas(e.target.value)}
              placeholder="Ex.: novas garantias, atualização de faturamento, novo documento anexado…"
              className="text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-7 text-[11px]">
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid || busy} className="h-7 text-[11px]">
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
            Reapresentar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
