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
import { CheckCircle2, Circle, Loader2, Save, FileDown, Pencil, X, AlertTriangle } from "lucide-react";
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
import { FieldAttachments, Attachment } from "./FieldAttachments";
import { generateCreditReportPdf } from "@/lib/credit-report-pdf";
import { CreditReportVersionsPanel } from "./CreditReportVersionsPanel";

const ATT_KEY = "__attachments";
function getAtt(section: any, fieldKey: string): Attachment[] {
  return (section?.[ATT_KEY]?.[fieldKey] ?? []) as Attachment[];
}
function getTopAtt(top: any, fieldKey: string): Attachment[] {
  return (top?.[fieldKey] ?? []) as Attachment[];
}

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
  attachments_top: any;
  versao_atual: number;
  precisa_revisao: boolean;
  updated_at: string;
};

const emptyReport = (cedenteId: string, proposalId?: string | null): Partial<ReportRow> => ({
  proposal_id: proposalId ?? null,
  cedente_id: cedenteId,
  identificacao: {}, empresa: {}, rede_societaria: {}, carteira: {},
  restritivos: {}, financeiro: {}, due_diligence: {}, pleito: {},
  attachments_top: {},
});

function setSectionAtt(section: any, fieldKey: string, list: Attachment[]) {
  const att = { ...(section?.[ATT_KEY] ?? {}), [fieldKey]: list };
  return { ...(section ?? {}), [ATT_KEY]: att };
}

type Mode = "create" | "view" | "edit";

export function CreditReportForm({ cedenteId, proposalId }: Props) {
  const { user, hasRole } = useAuth();
  const [report, setReport] = useState<Partial<ReportRow>>(emptyReport(cedenteId, proposalId));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cedenteNome, setCedenteNome] = useState<string>("");
  const [mode, setMode] = useState<Mode>("create");
  const [motivoAlteracao, setMotivoAlteracao] = useState("");
  const [versionsRefresh, setVersionsRefresh] = useState(0);

  const versaoAtual = (report as any).versao_atual ?? 1;
  const draftKey = `credit-report:${cedenteId}:${mode === "edit" ? `edit:v${versaoAtual}` : "new"}`;

  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<Partial<ReportRow>>({
    key: draftKey,
    value: report,
    setValue: (v) => { setReport(v); setDirty(true); },
    enabled: !loading && (mode === "create" || mode === "edit"),
  });

  const canEdit = hasRole("admin") || hasRole("credito");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data, error }, ced] = await Promise.all([
        supabase.from("credit_reports").select("*").eq("cedente_id", cedenteId).maybeSingle(),
        supabase.from("cedentes").select("razao_social").eq("id", cedenteId).maybeSingle(),
      ]);
      if (!active) return;
      if (error) toast.error("Erro ao carregar relatório", { description: error.message });
      if (data) {
        setReport(data as ReportRow);
        setMode("view");
      } else {
        setReport(emptyReport(cedenteId, proposalId));
        setMode("create");
      }
      setCedenteNome((ced.data as any)?.razao_social ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [cedenteId, proposalId]);

  const completude = useMemo(() => computeCompletude(report as any), [report]);
  const isReadOnly = mode === "view" || !canEdit;
  const precisaRevisao = (report as any).precisa_revisao;

  const setSection = (key: SectionKey, fieldKey: string, value: any) => {
    setReport((r) => ({ ...r, [key]: { ...(r[key] ?? {}), [fieldKey]: value } }));
    setDirty(true);
  };

  const setSectionAttachments = (key: SectionKey, fieldKey: string, list: Attachment[]) => {
    setReport((r) => ({ ...r, [key]: setSectionAtt(r[key], fieldKey, list) }));
    setDirty(true);
  };

  const setTopField = (key: keyof ReportRow, value: any) => {
    setReport((r) => ({ ...r, [key]: value }));
    setDirty(true);
  };

  const setTopAttachments = (fieldKey: string, list: Attachment[]) => {
    setReport((r) => ({ ...r, attachments_top: { ...((r as any).attachments_top ?? {}), [fieldKey]: list } }));
    setDirty(true);
  };

  const handleAlterar = () => {
    setMode("edit");
    setMotivoAlteracao("");
    setDirty(false);
  };

  const handleCancelarEdicao = async () => {
    setMode("view");
    setMotivoAlteracao("");
    setDirty(false);
    clearDraft();
    // recarregar versão atual
    const { data } = await supabase.from("credit_reports").select("*").eq("cedente_id", cedenteId).maybeSingle();
    if (data) setReport(data as ReportRow);
  };

  const save = async () => {
    if (!user) return;
    if (mode === "edit" && !motivoAlteracao.trim()) {
      toast.error("Informe o motivo da alteração");
      return;
    }
    setSaving(true);

    const novaVersao = mode === "edit" ? (versaoAtual || 1) + 1 : (versaoAtual || 1);
    const completudeCalc = computeCompletude(report as any);

    const payload: any = {
      ...report,
      cedente_id: cedenteId,
      completude: completudeCalc,
      updated_by: user.id,
      versao_atual: novaVersao,
      precisa_revisao: false,
    };
    if (proposalId) payload.proposal_id = proposalId;
    else if (!report.proposal_id) delete payload.proposal_id;
    if (!report.id) payload.created_by = user.id;

    const { data, error } = await supabase
      .from("credit_reports")
      .upsert(payload, { onConflict: "cedente_id" })
      .select()
      .single();
    if (error) { setSaving(false); toast.error("Erro ao salvar", { description: error.message }); return; }
    const saved = data as ReportRow;

    // Marca versões anteriores como não-atual
    if (mode === "edit") {
      await supabase
        .from("credit_report_versions" as any)
        .update({ is_current: false })
        .eq("report_id", saved.id);
    }

    // Insere snapshot da nova versão
    const snapshot: any = {
      report_id: saved.id,
      cedente_id: saved.cedente_id,
      proposal_id: saved.proposal_id,
      versao: novaVersao,
      is_current: true,
      motivo_alteracao: mode === "edit" ? motivoAlteracao.trim() : null,
      identificacao: saved.identificacao,
      empresa: saved.empresa,
      rede_societaria: saved.rede_societaria,
      carteira: saved.carteira,
      restritivos: saved.restritivos,
      financeiro: saved.financeiro,
      due_diligence: saved.due_diligence,
      pleito: saved.pleito,
      attachments_top: saved.attachments_top,
      parecer_comercial: saved.parecer_comercial,
      parecer_regional: saved.parecer_regional,
      parecer_compliance: saved.parecer_compliance,
      parecer_analista: saved.parecer_analista,
      pontos_positivos: saved.pontos_positivos,
      pontos_atencao: saved.pontos_atencao,
      conclusao: saved.conclusao,
      recomendacao: saved.recomendacao,
      completude: saved.completude,
      created_by: user.id,
    };
    const { error: vErr } = await supabase.from("credit_report_versions" as any).insert(snapshot);
    setSaving(false);
    if (vErr) { toast.error("Erro ao registrar versão", { description: vErr.message }); return; }

    setReport(saved);
    setDirty(false);
    setMotivoAlteracao("");
    setMode("view");
    clearDraft();
    setVersionsRefresh((n) => n + 1);
    toast.success(mode === "edit" ? `Versão v${novaVersao} salva` : "Relatório salvo");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando relatório…</div>;
  }

  return (
    <div className="space-y-3.5">
      {precisaRevisao && mode === "view" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cadastro em revalidação</p>
            <p className="text-xs text-muted-foreground">Crie uma nova versão do relatório antes de avançar.</p>
          </div>
        </div>
      )}

      {/* Header com progresso */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">Relatório estruturado de crédito</h3>
              <p className="text-xs text-muted-foreground">
                Preencha as 8 seções para liberar envio ao comitê.
              </p>
            </div>
            {report.id && (
              <span className="px-2 py-0.5 rounded-md border bg-muted/40 text-xs">
                Versão atual: v{versaoAtual || 1}
              </span>
            )}
            {mode === "view" && <Badge variant="secondary" className="text-[10px]">Somente leitura</Badge>}
            {mode === "edit" && <Badge className="text-[10px]">Editando nova versão</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={completude === 8 ? "default" : "outline"}>
              {completude}/8 seções
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  await generateCreditReportPdf(report, cedenteNome);
                  toast.success("PDF gerado");
                } catch (e: any) {
                  toast.error("Falha ao gerar PDF", { description: e?.message });
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
            {canEdit && mode === "view" && report.id && (
              <Button onClick={handleAlterar} size="sm" variant="outline">
                <Pencil className="h-4 w-4 mr-2" /> Alterar relatório
              </Button>
            )}
            {canEdit && mode === "edit" && (
              <Button onClick={handleCancelarEdicao} size="sm" variant="ghost">
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
            )}
          </div>
        </div>
        <Progress value={(completude / 8) * 100} className="h-2" />
        {(mode === "create" || mode === "edit") && (
          <DraftIndicator
            lastSavedAt={lastSavedAt}
            restored={restored}
            onDiscard={() => discardDraft(emptyReport(cedenteId, proposalId))}
          />
        )}
      </div>

      {mode === "edit" && (
        <div className="rounded-lg border bg-card p-4 space-y-0.5">
          <Label htmlFor="motivo-alteracao" className="text-sm">
            Motivo da alteração <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="motivo-alteracao"
            rows={2}
            placeholder="Descreva o que mudou e por quê (ex: revalidação, novos dados de balanço, correção de informação...)"
            value={motivoAlteracao}
            onChange={(e) => setMotivoAlteracao(e.target.value)}
          />
        </div>
      )}

      <div className={`space-y-3.5 ${isReadOnly ? "opacity-90" : ""}`}>
      {/* Acordeão das 8 seções */}
      <Accordion type="multiple" defaultValue={["identificacao"]} className="space-y-0.5">
        {SECTION_ORDER.map((key) => {
          const complete = isSectionComplete((report as any)[key], key);
          return (
            <AccordionItem key={key} value={key} className="border rounded-lg bg-card px-3">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  {complete ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium">{SECTION_LABEL[key]}</span>
                    <span className="text-xs text-muted-foreground truncate">{SECTION_HINT[key]}</span>
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
                      disabled={isReadOnly}
                      cedenteId={cedenteId}
                      attachments={getAtt((report as any)[key], f.key)}
                      onAttachmentsChange={(list) => setSectionAttachments(key, f.key, list)}
                      allowAttachments={
                        key !== "identificacao" &&
                        (key !== "empresa" || ["socios", "respaldo_patrimonial", "atividade", "infraestrutura", "management"].includes(f.key))
                      }
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Parecer do crédito (colapsável) */}
      {(() => {
        const parecerComplete =
          !!report.recomendacao &&
          (!!(report.parecer_analista && String(report.parecer_analista).trim()) ||
            !!(report.conclusao && String(report.conclusao).trim()));
        return (
          <Accordion type="single" collapsible className="space-y-0.5 !mt-0.5">
            <AccordionItem value="parecer_credito" className="border rounded-lg bg-card px-3">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  {parecerComplete ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-medium">Parecer do crédito</span>
                    <span className="text-xs text-muted-foreground truncate">
                      Parecer do analista, pontos positivos/atenção, conclusão e recomendação final.
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2.5 pt-1.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[["parecer_analista", "Parecer analista de crédito"]].map(([key, label]) => (
                      <TextareaField
                        key={key}
                        label={label}
                        value={(report as any)[key] ?? ""}
                        onChange={(v) => setTopField(key as keyof ReportRow, v)}
                        disabled={isReadOnly}
                        cedenteId={cedenteId}
                        fieldKey={key}
                        attachments={getTopAtt((report as any).attachments_top, key)}
                        onAttachmentsChange={(list) => setTopAttachments(key, list)}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      ["pontos_positivos", "🟢 Pontos positivos"],
                      ["pontos_atencao", "🟡 Pontos de atenção"],
                    ].map(([key, label]) => (
                      <TextareaField
                        key={key}
                        label={label}
                        value={(report as any)[key] ?? ""}
                        onChange={(v) => setTopField(key as keyof ReportRow, v)}
                        disabled={isReadOnly}
                        cedenteId={cedenteId}
                        fieldKey={key}
                        attachments={getTopAtt((report as any).attachments_top, key)}
                        onAttachmentsChange={(list) => setTopAttachments(key, list)}
                      />
                    ))}
                  </div>
                  <TextareaField
                    label="📌 Conclusão"
                    value={report.conclusao ?? ""}
                    onChange={(v) => setTopField("conclusao", v)}
                    disabled={isReadOnly}
                    rows={3}
                    cedenteId={cedenteId}
                    fieldKey="conclusao"
                    attachments={getTopAtt((report as any).attachments_top, "conclusao")}
                    onAttachmentsChange={(list) => setTopAttachments("conclusao", list)}
                  />
                  <div className="space-y-2 max-w-xs">
                    <Label>Recomendação final</Label>
                    <Select value={report.recomendacao ?? ""} onValueChange={(v) => setTopField("recomendacao", v)} disabled={isReadOnly}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        {RECOMENDACAO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })()}
      </div>

      <div className="!mt-0.5">
        <CreditReportVersionsPanel reportId={report.id ?? null} cedenteNome={cedenteNome} refreshKey={versionsRefresh} />
      </div>

      {canEdit && (mode === "create" || mode === "edit") && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {mode === "edit" ? "Salvar nova versão" : "Salvar relatório"}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldRenderer({ field, value, onChange, disabled, cedenteId, attachments, onAttachmentsChange, allowAttachments = true }: {
  field: FieldDef; value: any; onChange: (v: any) => void; disabled?: boolean;
  cedenteId: string; attachments: Attachment[]; onAttachmentsChange: (list: Attachment[]) => void;
  allowAttachments?: boolean;
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
      {allowAttachments && (
        <FieldAttachments
          cedenteId={cedenteId}
          fieldKey={field.key}
          value={attachments}
          onChange={onAttachmentsChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function TextareaField({ label, value, onChange, disabled, rows = 2, cedenteId, fieldKey, attachments, onAttachmentsChange, allowAttachments = false }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; rows?: number;
  cedenteId: string; fieldKey: string; attachments: Attachment[]; onAttachmentsChange: (list: Attachment[]) => void;
  allowAttachments?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {allowAttachments && (
        <FieldAttachments
          cedenteId={cedenteId}
          fieldKey={fieldKey}
          value={attachments}
          onChange={onAttachmentsChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
