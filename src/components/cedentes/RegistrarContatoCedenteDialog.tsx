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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CEDENTE_ACTIVITY_LABEL,
  CEDENTE_ACTIVITY_TYPES,
  todayISO,
  type CedenteActivityType,
} from "@/lib/cedente-activities";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedente: { id: string; razao_social: string; last_contact_date?: string | null } | null;
  onSaved?: () => void;
}

export function RegistrarContatoCedenteDialog({ open, onOpenChange, cedente, onSaved }: Props) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<CedenteActivityType>("ligacao");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setType("ligacao");
      setDescription("");
      setNotes("");
    }
  }, [open]);

  async function handleSave() {
    if (!cedente) return;
    if (!description.trim()) {
      toast.error("Descreva o contato realizado");
      return;
    }
    setSaving(true);
    const desc = notes.trim() ? `${description.trim()}\n\n${notes.trim()}` : description.trim();
    const occurred = new Date(`${date}T12:00:00`).toISOString();

    const { error } = await (supabase as any)
      .from("cedente_contact_activities")
      .insert({ cedente_id: cedente.id, type, description: desc, occurred_at: occurred });
    if (error) {
      toast.error("Erro ao registrar", { description: error.message });
      setSaving(false);
      return;
    }

    if (!cedente.last_contact_date || date > cedente.last_contact_date) {
      await (supabase as any)
        .from("cedentes")
        .update({ last_contact_date: date })
        .eq("id", cedente.id);
    }

    toast.success("Contato registrado");
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Registrar contato</DialogTitle>
          {cedente && (
            <p className="text-[11px] text-muted-foreground leading-tight">{cedente.razao_social}</p>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="h-7 text-[12px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Canal</Label>
              <Select value={type} onValueChange={(v) => setType(v as CedenteActivityType)}>
                <SelectTrigger className="h-7 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CEDENTE_ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-[12px]">
                      {CEDENTE_ACTIVITY_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Resumo</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Com quem falou / o que rolou"
              className="h-7 text-[12px]"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Notas (opcional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-[12px] min-h-0"
            />
          </div>
        </div>

        <DialogFooter className="gap-1">
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
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
