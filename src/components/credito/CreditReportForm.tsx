import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftIndicator } from "@/components/ui/draft-indicator";
import {
  SECTION_ORDER,
  SECTION_LABEL,
  SECTION_HINT,
  SECTION_FIELDS,
  SectionKey,
  isSectionComplete,
  computeCompletude,
  RECOMENDACAO_OPTIONS,
  FieldDef,
} from "@/lib/credit-report";

interface Props {
  cedenteId: string;
  proposalId?: string | null;
}

type ReportRow = {
  id: string;
  proposal_id: string;
  cedente_id: string;
  identificacao: any;
  empresa: any;
  rede_societaria: any;
  carteira: any;
  restritivos: any;
  financeiro: any;
  due_diligence: any;
  pleito: any;
  parecer_comercial: string | null;
  parecer_regional: string | null;
  parecer_compliance: string | null;
  parecer_analista: string | null;
  pontos_positivos: string | null;
  pontos_atencao: string | null;
  conclusao: string | null;
  recomendacao: string | null;
  completude: number;
  updated_at: string;
};

const emptyReport = (cedenteId: string, proposalId?: string | null): Partial<ReportRow> => ({
  proposal_id: proposalId ?? null,
  cedente_id: cedenteId,
  identificacao: {}, empresa: {}, rede_societaria: {}, carteira: {},
  restritivos: {}, financeiro: {}, due_diligence: {}, pleito: {},
});

export function CreditReportForm({ cedenteId, proposalId }: Props) {
  const { user, hasRole } = useAuth();
  const [report, setReport] = useState<Partial<ReportRow>>(emptyReport(cedenteId, proposalId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<Partial<ReportRow>>({
    key: `credit-report:${cedenteId}`,
    value: report,
    setValue: (v) => { setReport(v); setDirty(true); },
    enabled: !loading,
  });

  const canEdit =
    hasRole("admin") || hasRole("analista_credito") ||
    hasRole("gestor_credito") || hasRole("gestor_risco");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("credit_reports")
        .select("*")
        .eq("cedente_id", cedenteId)
        .maybeSingle();
      if (!active) return;
      if (error) toast.error("Erro ao carregar relatório", { description: error.message });
      if (data) setReport(data as ReportRow);
      else setReport(emptyReport(cedenteId, proposalId));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [cedenteId, proposalId]);

  const completude = useMemo(() => computeCompletude(report as any), [report]);

  const setSection = (key: SectionKey, fieldKey: string, value: any) => {
    setReport((r) => ({ ...r, [key]: { ...(r[key] ?? {}), [fieldKey]: value } }));
    setDirty(true);
  };

  const setTopField = (key: keyof ReportRow, value: any) => {
    setReport((r) => ({ ...r, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      ...report,
      cedente_id: cedenteId,
      completude: computeCompletude(report as any),
      updated_by: user.id,
    };
    // proposal_id é opcional: só envia se houver
    if (proposalId) payload.proposal_id = proposalId;
    else if (!report.proposal_id) delete payload.proposal_id;
    if (!report.id) payload.created_by = user.id;

    const { data, error } = await supabase
      .from("credit_reports")
      .upsert(payload, { onConflict: "cedente_id" })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    setReport(data as ReportRow);
    setDirty(false);
    clearDraft();
    toast.success("Relatório salvo");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando relatório…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com progresso */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold">Relatório estruturado de crédito</h3>
            <p className="text-xs text-muted-foreground">
              Preencha as 8 seções para liberar envio ao comitê.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={completude === 8 ? "default" : "outline"}>
              {completude}/8 seções
            </Badge>
            {canEdit && (
              <Button onClick={save} disabled={saving || !dirty} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            )}
          </div>
        </div>
        <Progress value={(completude / 8) * 100} className="h-2" />
        <DraftIndicator
          lastSavedAt={lastSavedAt}
          restored={restored}
          onDiscard={() => discardDraft(emptyReport(cedenteId, proposalId))}
        />
      </div>

      {/* Acordeão das 8 seções */}
      <Accordion type="multiple" defaultValue={["identificacao"]} className="space-y-2">
        {SECTION_ORDER.map((key) => {
          const complete = isSectionComplete((report as any)[key], key);
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{SECTION_LABEL[key]}</div>
                    <div className="text-xs text-muted-foreground">{SECTION_HINT[key]}</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {SECTION_FIELDS[key].map((f) => (
                    <FieldRenderer
                      key={f.key}
                      field={f}
                      value={(report as any)[key]?.[f.key] ?? ""}
                      onChange={(v) => setSection(key, f.key, v)}
                      disabled={!canEdit}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Pareceres em camadas + conclusão */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-base font-semibold">Pareceres em camadas e conclusão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextareaField label="Parecer comercial (executivo)" value={report.parecer_comercial ?? ""} onChange={(v) => setTopField("parecer_comercial", v)} disabled={!canEdit} />
          <TextareaField label="Parecer regional (gerência)" value={report.parecer_regional ?? ""} onChange={(v) => setTopField("parecer_regional", v)} disabled={!canEdit} />
          <TextareaField label="Parecer compliance" value={report.parecer_compliance ?? ""} onChange={(v) => setTopField("parecer_compliance", v)} disabled={!canEdit} />
          <TextareaField label="Parecer analista de crédito" value={report.parecer_analista ?? ""} onChange={(v) => setTopField("parecer_analista", v)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextareaField label="🟢 Pontos positivos" value={report.pontos_positivos ?? ""} onChange={(v) => setTopField("pontos_positivos", v)} disabled={!canEdit} />
          <TextareaField label="🟡 Pontos de atenção" value={report.pontos_atencao ?? ""} onChange={(v) => setTopField("pontos_atencao", v)} disabled={!canEdit} />
        </div>
        <TextareaField label="📌 Conclusão" value={report.conclusao ?? ""} onChange={(v) => setTopField("conclusao", v)} disabled={!canEdit} rows={3} />
        <div className="space-y-2 max-w-xs">
          <Label>Recomendação final</Label>
          <Select value={report.recomendacao ?? ""} onValueChange={(v) => setTopField("recomendacao", v)} disabled={!canEdit}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {RECOMENDACAO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving || !dirty} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar relatório
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldRenderer({ field, value, onChange, disabled }: {
  field: FieldDef; value: any; onChange: (v: any) => void; disabled?: boolean;
}) {
  const wrapper = field.full || field.type === "textarea" ? "md:col-span-2" : "";
  return (
    <div className={`space-y-1.5 ${wrapper}`}>
      <Label className="text-xs">
        {field.label}{field.required && <span className="text-destructive"> *</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      ) : field.type === "select" ? (
        <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function TextareaField({ label, value, onChange, disabled, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}
