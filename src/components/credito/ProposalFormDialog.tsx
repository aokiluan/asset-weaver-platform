import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Cedente { id: string; razao_social: string; status: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cedenteId?: string;
  onSaved: (proposalId: string) => void;
}

interface FormValues {
  cedente_id: string;
  valor_solicitado: number;
  prazo_dias?: number | null;
  taxa_sugerida?: number | null;
  finalidade?: string | null;
  garantias?: string | null;
  observacoes?: string | null;
}

export function ProposalFormDialog({ open, onOpenChange, cedenteId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [cedentes, setCedentes] = useState<Cedente[]>([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { cedente_id: cedenteId ?? "", valor_solicitado: 0 },
  });

  useEffect(() => {
    if (!open) return;
    reset({ cedente_id: cedenteId ?? "", valor_solicitado: 0 });
    (async () => {
      const { data } = await supabase.from("cedentes")
        .select("id,razao_social,status")
        .in("status", ["aprovado", "em_analise", "prospect"])
        .order("razao_social");
      setCedentes(data ?? []);
    })();
  }, [open]); // eslint-disable-line

  const cId = watch("cedente_id");

  const onSubmit = async (values: FormValues) => {
    if (!values.cedente_id) { toast.error("Selecione o cedente"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("credit_proposals").insert({
      cedente_id: values.cedente_id,
      valor_solicitado: Number(values.valor_solicitado),
      prazo_dias: values.prazo_dias ? Number(values.prazo_dias) : null,
      taxa_sugerida: values.taxa_sugerida ? Number(values.taxa_sugerida) : null,
      finalidade: values.finalidade || null,
      garantias: values.garantias || null,
      observacoes: values.observacoes || null,
      stage: "analise",
      created_by: auth.user?.id,
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error("Erro ao criar proposta", { description: error.message }); return; }
    toast.success("Proposta criada e enviada para análise");
    onSaved(data.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova proposta de crédito</DialogTitle>
          <DialogDescription>A alçada será calculada automaticamente pelo valor solicitado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cedente *</Label>
            <Select value={cId} onValueChange={(v) => setValue("cedente_id", v)} disabled={Boolean(cedenteId)}>
              <SelectTrigger><SelectValue placeholder="Selecione o cedente" /></SelectTrigger>
              <SelectContent>
                {cedentes.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="valor_solicitado">Valor solicitado (R$) *</Label>
              <Input id="valor_solicitado" type="number" step="0.01" {...register("valor_solicitado", { required: true, min: 0.01 })} />
              {errors.valor_solicitado && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo_dias">Prazo (dias)</Label>
              <Input id="prazo_dias" type="number" {...register("prazo_dias")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxa_sugerida">Taxa sugerida (% a.m.)</Label>
              <Input id="taxa_sugerida" type="number" step="0.0001" {...register("taxa_sugerida")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalidade">Finalidade</Label>
            <Input id="finalidade" {...register("finalidade")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="garantias">Garantias</Label>
            <Textarea id="garantias" rows={2} {...register("garantias")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={3} {...register("observacoes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar proposta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
