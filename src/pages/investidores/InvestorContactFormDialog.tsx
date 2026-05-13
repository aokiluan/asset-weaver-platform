import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  INVESTOR_TYPES,
  INVESTOR_TYPE_LABEL,
  STAGE_LABEL,
  STAGE_ORDER,
  type InvestorContact,
  type InvestorStage,
  type InvestorType,
} from "@/lib/investor-contacts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: InvestorContact | null;
  onSaved: () => void;
  userId: string;
}

interface FormState {
  name: string;
  contact_name: string;
  phone: string;
  ticket: number | null;
  last_contact_date: string;
  type: InvestorType;
  stage: InvestorStage;
  next_action: string;
  notes: string;
}

const empty: FormState = {
  name: "",
  contact_name: "",
  phone: "",
  ticket: null,
  last_contact_date: "",
  type: "investidor_pj",
  stage: "prospeccao",
  next_action: "",
  notes: "",
};

export function InvestorContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
  userId,
}: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        contact
          ? {
              name: contact.name ?? "",
              contact_name: contact.contact_name ?? "",
              phone: contact.phone ?? "",
              ticket: contact.ticket,
              last_contact_date: contact.last_contact_date ?? "",
              type: contact.type,
              stage: contact.stage,
              next_action: contact.next_action ?? "",
              notes: contact.notes ?? "",
            }
          : empty,
      );
    }
  }, [open, contact]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Nome/Empresa é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      ticket: form.ticket,
      last_contact_date: form.last_contact_date || null,
      type: form.type,
      stage: form.stage,
      next_action: form.next_action.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = contact
      ? await supabase.from("investor_contacts").update(payload).eq("id", contact.id)
      : await supabase.from("investor_contacts").insert({ ...payload, user_id: userId });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success(contact ? "Contato atualizado" : "Contato criado");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[14px]">
            {contact ? "Editar contato" : "Novo contato"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome / Empresa" full>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Nome do contato">
            <Input
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Ticket (R$)">
            <CurrencyInput
              className="h-7 text-[12px] px-2.5 py-1 md:text-[12px]"
              value={form.ticket}
              onValueChange={(v) => set("ticket", v)}
            />
          </Field>
          <Field label="Último contato">
            <Input
              type="date"
              value={form.last_contact_date}
              onChange={(e) => set("last_contact_date", e.target.value)}
            />
          </Field>
          <Field label="Tipo">
            <Select value={form.type} onValueChange={(v) => set("type", v as InvestorType)}>
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTOR_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {INVESTOR_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Estágio">
            <Select value={form.stage} onValueChange={(v) => set("stage", v as InvestorStage)}>
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Próxima ação" full>
            <Input
              value={form.next_action}
              onChange={(e) => set("next_action", e.target.value)}
            />
          </Field>
          <Field label="Notas" full>
            <Textarea
              rows={3}
              className="text-[12px]"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button size="sm" className="h-7" onClick={handleSave} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
