import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { iniciarCiclo } from "@/lib/revalidacao-ciclos";

interface Props {
  cedenteId: string;
  cedenteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function IniciarRevalidacaoDialog({
  cedenteId,
  cedenteNome,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await iniciarCiclo(cedenteId);
      toast.success("Revalidação iniciada", {
        description: "Esteira de revalidação aberta para o cedente.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error("Não foi possível iniciar", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Iniciar revalidação cadastral
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Será aberto um novo ciclo de revalidação para{" "}
            <span className="font-medium">{cedenteNome}</span>. O cedente continua ativo para
            operação enquanto a esteira de revalidação corre em paralelo (Cadastro → Crédito →
            Comitê → Formalização, se necessário).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-2.5 text-[11px] leading-tight space-y-1">
          <div className="font-medium text-foreground">O que muda:</div>
          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
            <li>Documentos vigentes ficam como histórico (somente leitura).</li>
            <li>Comercial sobe novas versões dos documentos no novo ciclo.</li>
            <li>Novo parecer comercial, novo parecer de crédito e nova sessão de comitê.</li>
            <li>Contrato vigente permanece — só nasce novo se o comitê alterar condições.</li>
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Iniciar revalidação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
