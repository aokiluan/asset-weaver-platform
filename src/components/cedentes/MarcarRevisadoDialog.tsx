import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  cedenteId: string;
  cedenteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function MarcarRevisadoDialog({
  cedenteId,
  cedenteNome,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("marcar_cadastro_revisado", {
      _cedente_id: cedenteId,
      _observacao: observacao.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao registrar revisão", { description: error.message });
      return;
    }
    toast.success("Renovação cadastral registrada", {
      description: "Próxima revisão daqui a 6 meses.",
    });
    setObservacao("");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Marcar cadastro revisado
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Confirma que o cadastro de <span className="font-medium">{cedenteNome}</span> foi
            revisado hoje. A próxima renovação será exigida em 6 meses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-[11px] text-muted-foreground">
            Observação (opcional)
          </label>
          <Textarea
            placeholder="Ex: documentos atualizados, sem pendências."
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            className="text-[12px]"
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button size="sm" className="h-7 text-[11px]" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Confirmar revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
