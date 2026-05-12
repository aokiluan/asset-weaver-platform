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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  concluirCiclo,
  type RevalidacaoDecisao,
  DECISAO_LABEL,
} from "@/lib/revalidacao-ciclos";

interface Props {
  cicloId: string;
  numero: number;
  cedenteNome: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ConcluirRevalidacaoDialog({
  cicloId,
  numero,
  cedenteNome,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [decisao, setDecisao] = useState<RevalidacaoDecisao>("mantido");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await concluirCiclo(cicloId, decisao, obs.trim() || null);
      toast.success("Revalidação concluída", {
        description:
          decisao === "encerrado"
            ? "Cedente movido para inativo."
            : "Próxima revalidação daqui a 6 meses.",
      });
      setObs("");
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast.error("Não foi possível concluir", { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Concluir revalidação · Ciclo #{numero}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Encerre o ciclo de revalidação de <span className="font-medium">{cedenteNome}</span>{" "}
            registrando a decisão final.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <div className="space-y-1">
            <Label className="text-[11px]">Decisão</Label>
            <Select value={decisao} onValueChange={(v) => setDecisao(v as RevalidacaoDecisao)}>
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mantido">{DECISAO_LABEL.mantido} — sem mudança</SelectItem>
                <SelectItem value="alterado">{DECISAO_LABEL.alterado} — novas condições</SelectItem>
                <SelectItem value="encerrado">{DECISAO_LABEL.encerrado} — encerrar relacionamento</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {decisao === "mantido" &&
                "Cadastro permanece como está. Contrato vigente continua válido."}
              {decisao === "alterado" &&
                "Comitê redefiniu condições. Considere gerar nova minuta na Formalização."}
              {decisao === "encerrado" &&
                "Cedente sai de operação e vai para Inativo."}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Observação (opcional)</Label>
            <Textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Resumo da decisão, condições alteradas, etc."
              className="text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Concluir ciclo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
