import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  data_visita: z.string().min(1, "Informe a data"),
  participantes: z.string().trim().min(3, "Liste os participantes").max(500),
  contexto: z.string().trim().min(10, "Descreva o contexto").max(2000),
  percepcoes: z.string().trim().min(10, "Descreva as percepções").max(2000),
  pontos_atencao: z.string().trim().max(2000).optional().or(z.literal("")),
  recomendacao: z.string().trim().min(3, "Informe a recomendação").max(1000),
});

type Form = z.infer<typeof schema>;

interface Props {
  cedenteId: string;
  onSaved?: () => void;
}

export function CedenteVisitReportForm({ cedenteId, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    data_visita: "",
    participantes: "",
    contexto: "",
    percepcoes: "",
    pontos_atencao: "",
    recomendacao: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cedente_visit_reports")
        .select("*")
        .eq("cedente_id", cedenteId)
        .maybeSingle();
      if (data) {
        setExistingId(data.id);
        setForm({
          data_visita: data.data_visita,
          participantes: data.participantes,
          contexto: data.contexto,
          percepcoes: data.percepcoes,
          pontos_atencao: data.pontos_atencao ?? "",
          recomendacao: data.recomendacao,
        });
      }
      setLoading(false);
    })();
  }, [cedenteId]);

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first.message);
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); toast.error("Não autenticado"); return; }

    const payload = {
      cedente_id: cedenteId,
      data_visita: parsed.data.data_visita,
      participantes: parsed.data.participantes,
      contexto: parsed.data.contexto,
      percepcoes: parsed.data.percepcoes,
      pontos_atencao: parsed.data.pontos_atencao || null,
      recomendacao: parsed.data.recomendacao,
      created_by: auth.user.id,
    };

    const { error } = existingId
      ? await supabase.from("cedente_visit_reports").update(payload).eq("id", existingId)
      : await supabase.from("cedente_visit_reports").insert(payload);

    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success("Relatório de visita salvo");
    onSaved?.();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Data da visita *</Label>
          <Input type="date" value={form.data_visita} onChange={(e) => setForm(f => ({ ...f, data_visita: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Participantes *</Label>
          <Input
            placeholder="Ex.: João (CFO Cedente), Maria (Comercial)"
            value={form.participantes}
            onChange={(e) => setForm(f => ({ ...f, participantes: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Contexto / Objetivo da visita *</Label>
        <Textarea
          rows={3}
          placeholder="Por que a visita aconteceu, o que se buscou entender..."
          value={form.contexto}
          onChange={(e) => setForm(f => ({ ...f, contexto: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Percepções comerciais *</Label>
        <Textarea
          rows={4}
          placeholder="Qualificação do negócio, posicionamento, sazonalidade, principais clientes/sacados, etc."
          value={form.percepcoes}
          onChange={(e) => setForm(f => ({ ...f, percepcoes: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Pontos de atenção</Label>
        <Textarea
          rows={3}
          placeholder="Riscos identificados, sinais de alerta, dependências críticas..."
          value={form.pontos_atencao}
          onChange={(e) => setForm(f => ({ ...f, pontos_atencao: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Recomendação *</Label>
        <Textarea
          rows={2}
          placeholder="Avançar para análise / Pedir mais informações / Não recomendar"
          value={form.recomendacao}
          onChange={(e) => setForm(f => ({ ...f, recomendacao: e.target.value }))}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {existingId ? "Atualizar relatório" : "Salvar relatório"}
        </Button>
      </div>
    </div>
  );
}
