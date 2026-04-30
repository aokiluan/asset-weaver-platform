import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftIndicator } from "@/components/ui/draft-indicator";

type LeadTipo = "cedente" | "investidor";

export interface LeadFormValues {
  id?: string;
  tipo: LeadTipo;
  nome: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  empresa?: string | null;
  origem?: string | null;
  valor_estimado?: number | null;
  observacoes?: string | null;
  stage_id?: string | null;
  owner_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<LeadFormValues>;
  onSaved: () => void;
}

interface Stage { id: string; nome: string; ordem: number }
interface Owner { id: string; nome: string }

export function LeadFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = Boolean(initial?.id);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<LeadFormValues>({
    defaultValues: { tipo: "cedente", ...initial },
  });

  useEffect(() => {
    if (!open) return;
    reset({ tipo: "cedente", ...initial });

    (async () => {
      const [{ data: st }, { data: pr }, { data: auth }] = await Promise.all([
        supabase.from("pipeline_stages").select("id,nome,ordem").eq("ativo", true).order("ordem"),
        supabase.from("profiles").select("id,nome").eq("ativo", true).order("nome"),
        supabase.auth.getUser(),
      ]);
      setStages(st ?? []);
      setOwners(pr ?? []);
      if (!isEdit && auth.user) {
        setValue("owner_id", initial?.owner_id ?? auth.user.id);
        if (st && st.length > 0 && !initial?.stage_id) {
          setValue("stage_id", st[0].id);
        }
      }
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipo = watch("tipo");
  const stageId = watch("stage_id");
  const ownerId = watch("owner_id");
  const allValues = watch();

  const draftKey = open ? `lead-${initial?.id ?? "new"}` : null;
  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<LeadFormValues>({
    key: draftKey,
    value: allValues,
    setValue: (v) => reset(v),
    enabled: open,
  });

  const onSubmit = async (values: LeadFormValues) => {
    setSaving(true);
    const payload = {
      tipo: values.tipo,
      nome: values.nome,
      documento: values.documento || null,
      email: values.email || null,
      telefone: values.telefone || null,
      empresa: values.empresa || null,
      origem: values.origem || null,
      valor_estimado: values.valor_estimado ? Number(values.valor_estimado) : null,
      observacoes: values.observacoes || null,
      stage_id: values.stage_id || null,
      owner_id: values.owner_id || null,
    };

    let error;
    if (isEdit && initial?.id) {
      ({ error } = await supabase.from("leads").update(payload).eq("id", initial.id));
    } else {
      const { data: auth } = await supabase.auth.getUser();
      ({ error } = await supabase.from("leads").insert({ ...payload, created_by: auth.user?.id }));
    }
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(isEdit ? "Lead atualizado" : "Lead criado");
    clearDraft();
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription>Cedente ou investidor para o pipeline comercial.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setValue("tipo", v as LeadTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cedente">Cedente</SelectItem>
                  <SelectItem value="investidor">Investidor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome", { required: true })} />
              {errors.nome && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" {...register("empresa")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento">CNPJ / CPF</Label>
              <Input id="documento" {...register("documento")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Input id="origem" placeholder="Indicação, evento, inbound..." {...register("origem")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_estimado">Valor estimado (R$)</Label>
              <CurrencyInput
                id="valor_estimado"
                value={watch("valor_estimado") ?? null}
                onValueChange={(v) => setValue("valor_estimado", v, { shouldDirty: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select value={stageId ?? undefined} onValueChange={(v) => setValue("stage_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={ownerId ?? undefined} onValueChange={(v) => setValue("owner_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={3} {...register("observacoes")} />
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <DraftIndicator
              lastSavedAt={lastSavedAt}
              restored={restored}
              onDiscard={() => discardDraft({ tipo: "cedente", ...initial })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar alterações" : "Criar lead"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
