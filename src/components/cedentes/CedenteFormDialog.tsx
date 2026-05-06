import { useEffect, useState } from "react";
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

type CedenteStatus = "prospect" | "em_analise" | "aprovado" | "reprovado" | "inativo";

export interface CedenteFormValues {
  id?: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  setor?: string | null;
  faturamento_medio?: number | null;
  status: CedenteStatus;
  limite_aprovado?: number | null;
  observacoes?: string | null;
  owner_id?: string | null;
  lead_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<CedenteFormValues>;
  onSaved: () => void;
}

interface Owner { id: string; nome: string }

export function CedenteFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const isEdit = Boolean(initial?.id);
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CedenteFormValues>({
    defaultValues: { status: "prospect", razao_social: "", cnpj: "", ...initial },
  });

  useEffect(() => {
    if (!open) return;
    reset({ status: "prospect", razao_social: "", cnpj: "", ...initial });
    (async () => {
      const [{ data: pr }, { data: auth }] = await Promise.all([
        supabase.from("profiles").select("id,nome").eq("ativo", true).order("nome"),
        supabase.auth.getUser(),
      ]);
      setOwners(pr ?? []);
      if (!isEdit && auth.user && !initial?.owner_id) {
        setValue("owner_id", auth.user.id);
      }
    })();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = watch("status");
  const ownerId = watch("owner_id");
  const allValues = watch();

  const draftKey = open ? `cedente-${initial?.id ?? "new"}` : null;
  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<CedenteFormValues>({
    key: draftKey,
    value: allValues,
    setValue: (v) => reset(v),
    enabled: open,
  });

  const onSubmit = async (values: CedenteFormValues) => {
    setSaving(true);
    const payload = {
      razao_social: values.razao_social.trim(),
      nome_fantasia: values.nome_fantasia || null,
      cnpj: values.cnpj.replace(/\D/g, ""),
      email: values.email || null,
      telefone: values.telefone || null,
      endereco: values.endereco || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      cep: values.cep || null,
      setor: values.setor || null,
      faturamento_medio: values.faturamento_medio ? Number(values.faturamento_medio) : null,
      status: values.status,
      limite_aprovado: values.limite_aprovado ? Number(values.limite_aprovado) : null,
      observacoes: values.observacoes || null,
      owner_id: values.owner_id || null,
      lead_id: values.lead_id || null,
    };

    let error;
    if (isEdit && initial?.id) {
      ({ error } = await supabase.from("cedentes").update(payload).eq("id", initial.id));
    } else {
      const { data: auth } = await supabase.auth.getUser();
      ({ error } = await supabase.from("cedentes").insert({ ...payload, created_by: auth.user?.id }));
    }
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(isEdit ? "Cedente atualizado" : "Cedente criado");
    clearDraft();
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cedente" : "Novo cedente"}</DialogTitle>
          <DialogDescription>Dados cadastrais e de status do cedente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="razao_social">Razão social *</Label>
              <Input id="razao_social" {...register("razao_social", { required: true })} />
              {errors.razao_social && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="nome_fantasia">Nome fantasia</Label>
              <Input id="nome_fantasia" {...register("nome_fantasia")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input id="cnpj" {...register("cnpj", { required: true })} />
              {errors.cnpj && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="setor">Setor</Label>
              <Input id="setor" {...register("setor")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="faturamento_medio">Faturamento médio mensal (R$)</Label>
              <CurrencyInput
                id="faturamento_medio"
                value={watch("faturamento_medio") ?? null}
                onValueChange={(v) => setValue("faturamento_medio", v, { shouldDirty: true })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" {...register("endereco")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" {...register("cidade")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="estado">UF</Label>
              <Input id="estado" maxLength={2} {...register("estado")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" {...register("cep")} />
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as CedenteStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="limite_aprovado">Limite aprovado (R$)</Label>
              <CurrencyInput
                id="limite_aprovado"
                value={watch("limite_aprovado") ?? null}
                onValueChange={(v) => setValue("limite_aprovado", v, { shouldDirty: true })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Responsável comercial</Label>
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

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={3} {...register("observacoes")} />
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <DraftIndicator
              lastSavedAt={lastSavedAt}
              restored={restored}
              onDiscard={() => discardDraft({ status: "prospect", razao_social: "", cnpj: "", ...initial })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Salvar alterações" : "Criar cedente"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
