import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  cedenteId: string;
  canApprove: boolean;
  pendencias: string[];
  onChanged: () => void;
  onlyDevolver?: boolean;
}

export function RevisarCadastroActions({ cedenteId, canApprove, pendencias, onChanged, onlyDevolver }: Props) {
  const [devolverOpen, setDevolverOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [reprovadosCount, setReprovadosCount] = useState(0);

  // Conta documentos reprovados — usado para decidir se exige motivo na devolução
  const refreshReprovados = async () => {
    const { count } = await supabase
      .from("documentos")
      .select("id", { count: "exact", head: true })
      .eq("cedente_id", cedenteId)
      .eq("status", "reprovado");
    setReprovadosCount(count ?? 0);
  };

  useEffect(() => {
    refreshReprovados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedenteId]);

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

  const handleDevolverClick = async () => {
    await refreshReprovados();
    // Se há reprovados, motivos já estão no Histórico → confirmação simples
    // Senão, abre diálogo pedindo motivo
    if (reprovadosCount > 0) {
      setConfirmOpen(true);
    } else {
      setDevolverOpen(true);
    }
  };

  const devolverComMotivo = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da devolução");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("cedentes").update({
      stage: "novo",
      observacoes: `[Devolvido pela análise]: ${motivo.trim()}`,
    }).eq("id", cedenteId);
    if (error) {
      setSaving(false);
      toast.error("Erro", { description: error.message });
      return;
    }
    await supabase.from("cedente_history").insert({
      cedente_id: cedenteId,
      user_id: auth.user?.id ?? null,
      evento: "COMENTARIO",
      detalhes: { comentario: `↩️ Cadastro devolveu ao comercial\n\n${motivo.trim()}` } as any,
    });
    setSaving(false);
    toast.success("Cedente devolvido ao comercial");
    setDevolverOpen(false);
    setMotivo("");
    onChanged();
  };

  const devolverDireto = async () => {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const resumo = `${reprovadosCount} documento(s) reprovado(s) — ver Histórico`;
    const { error } = await supabase.from("cedentes").update({
      stage: "novo",
      observacoes: `[Devolvido pela análise]: ${resumo}`,
    }).eq("id", cedenteId);
    if (error) {
      setSaving(false);
      toast.error("Erro", { description: error.message });
      return;
    }
    await supabase.from("cedente_history").insert({
      cedente_id: cedenteId,
      user_id: auth.user?.id ?? null,
      evento: "COMENTARIO",
      detalhes: { comentario: `↩️ Cadastro devolveu ao comercial · ${resumo}` } as any,
    });
    setSaving(false);
    toast.success("Cedente devolvido ao comercial");
    setConfirmOpen(false);
    onChanged();
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDevolverClick}>
        <Undo2 className="h-4 w-4 mr-2" /> Devolver ao comercial
      </Button>
      {!onlyDevolver && (
        <Button onClick={aprovar} disabled={!canApprove || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Aprovar cadastro
        </Button>
      )}

      {/* Confirmação curta — quando já há documentos reprovados no Histórico */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolver ao comercial?</AlertDialogTitle>
            <AlertDialogDescription>
              {reprovadosCount} documento(s) reprovado(s) já estão registrados no Histórico com os
              respectivos motivos. Não é preciso digitar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); devolverDireto(); }} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Devolver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo com motivo — quando não há reprovados (devolução por outro motivo) */}
      <Dialog open={devolverOpen} onOpenChange={setDevolverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver ao comercial</DialogTitle>
            <DialogDescription>
              Não há documentos reprovados. Explique o motivo da devolução — o comercial verá esta
              observação ao retomar o cadastro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-dev">Motivo</Label>
            <Textarea
              id="motivo-dev"
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: relatório de visita inconsistente, pleito divergente..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolverOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={devolverComMotivo} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
