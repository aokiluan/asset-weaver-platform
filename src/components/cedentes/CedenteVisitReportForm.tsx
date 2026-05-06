import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Save, Plus, Trash2, Upload, ImageIcon, FileDown, Pencil, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftIndicator } from "@/components/ui/draft-indicator";
import { VisitReportVersionsPanel } from "./VisitReportVersionsPanel";
import { generateVisitReportPdf } from "@/lib/visit-report-pdf";

interface Props {
  cedenteId: string;
  onSaved?: () => void;
}

type EmpresaLigada = { nome: string; cnpj: string; relacao: string };
type Avalista = { nome: string; cpf: string };

type ModalidadeFull = {
  ativo: boolean;
  limite: string;
  prazo_medio: string;
  taxa: string;
  observacao: string;
};

interface Modalidades {
  desconto_convencional: ModalidadeFull;
  comissaria: ModalidadeFull;
  comissaria_escrow: ModalidadeFull;
  nota_comercial: ModalidadeFull;
}

const emptyFull = (): ModalidadeFull => ({ ativo: false, limite: "", prazo_medio: "", taxa: "", observacao: "" });

const defaultModalidades = (): Modalidades => ({
  desconto_convencional: emptyFull(),
  comissaria: emptyFull(),
  comissaria_escrow: emptyFull(),
  nota_comercial: emptyFull(),
});

interface FormState {
  // cabeçalho
  data_visita: string;
  tipo_visita: string;
  visitante: string;
  entrevistado_nome: string;
  entrevistado_cargo: string;
  entrevistado_cpf: string;
  entrevistado_telefone: string;
  entrevistado_email: string;
  // negócio
  ramo_atividade: string;
  faturamento_mensal: string;
  principais_produtos: string;
  qtd_funcionarios: string;
  pct_vendas_pf: string;
  pct_vendas_pj: string;
  pct_vendas_cheque: string;
  pct_vendas_boleto: string;
  pct_vendas_cartao: string;
  pct_vendas_outros: string;
  pct_fat_debito: string;
  // adicionais
  parceiros_financeiros: string;
  empresas_ligadas: EmpresaLigada[];
  // pleito
  limite_global_solicitado: string;
  modalidades: Modalidades;
  avalistas_solidarios: Avalista[];
  assinatura_digital_tipo: string;
  assinatura_digital_observacao: string;
  // parecer
  parecer_comercial: string;
  pontos_atencao: string;
  fotos: { path: string; name: string }[];
}

const empty = (): FormState => ({
  data_visita: "",
  tipo_visita: "",
  visitante: "",
  entrevistado_nome: "",
  entrevistado_cargo: "",
  entrevistado_cpf: "",
  entrevistado_telefone: "",
  entrevistado_email: "",
  ramo_atividade: "",
  faturamento_mensal: "",
  principais_produtos: "",
  qtd_funcionarios: "",
  pct_vendas_pf: "",
  pct_vendas_pj: "",
  pct_vendas_cheque: "",
  pct_vendas_boleto: "",
  pct_vendas_cartao: "",
  pct_vendas_outros: "",
  pct_fat_debito: "",
  parceiros_financeiros: "",
  empresas_ligadas: [],
  limite_global_solicitado: "",
  modalidades: defaultModalidades(),
  avalistas_solidarios: [],
  assinatura_digital_tipo: "",
  assinatura_digital_observacao: "",
  parecer_comercial: "",
  pontos_atencao: "",
  fotos: [],
});

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const int = (v: string) => (v.trim() === "" ? null : Math.trunc(Number(v)));

export function CedenteVisitReportForm({ cedenteId, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<number>(0);
  const [precisaRevisao, setPrecisaRevisao] = useState<boolean>(false);
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [motivoAlteracao, setMotivoAlteracao] = useState<string>("");
  const [versionsRefresh, setVersionsRefresh] = useState(0);
  const [form, setForm] = useState<FormState>(empty());
  const readOnly = mode === "view";

  // Draft só ativa em modo create (nunca em edit/view de versão existente).
  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<FormState>({
    key: `visit-report:${cedenteId}`,
    value: form,
    setValue: (v: any) => setForm({ ...v, fotos: Array.isArray(v?.fotos) ? v.fotos : [], modalidades: { ...defaultModalidades(), ...(v?.modalidades || {}) } }),
    enabled: !loading && mode === "create",
  });

  const loadFromDb = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cedente_visit_reports")
      .select("*")
      .eq("cedente_id", cedenteId)
      .maybeSingle();
    if (data) {
      const d: any = data;
      setExistingId(d.id);
      setVersaoAtual(d.versao_atual ?? 1);
      setPrecisaRevisao(!!d.precisa_revisao);
      setMode("view");
      const mods = (d.modalidades && typeof d.modalidades === "object")
        ? { ...defaultModalidades(), ...d.modalidades }
        : defaultModalidades();
      setForm({
        data_visita: d.data_visita ?? "",
        tipo_visita: d.tipo_visita ?? "",
        visitante: d.visitante ?? "",
        entrevistado_nome: d.entrevistado_nome ?? "",
        entrevistado_cargo: d.entrevistado_cargo ?? "",
        entrevistado_cpf: d.entrevistado_cpf ?? "",
        entrevistado_telefone: d.entrevistado_telefone ?? "",
        entrevistado_email: d.entrevistado_email ?? "",
        ramo_atividade: d.ramo_atividade ?? "",
        faturamento_mensal: d.faturamento_mensal != null ? String(d.faturamento_mensal) : "",
        principais_produtos: d.principais_produtos ?? "",
        qtd_funcionarios: d.qtd_funcionarios != null ? String(d.qtd_funcionarios) : "",
        pct_vendas_pf: d.pct_vendas_pf != null ? String(d.pct_vendas_pf) : "",
        pct_vendas_pj: d.pct_vendas_pj != null ? String(d.pct_vendas_pj) : "",
        pct_vendas_cheque: d.pct_vendas_cheque != null ? String(d.pct_vendas_cheque) : "",
        pct_vendas_boleto: d.pct_vendas_boleto != null ? String(d.pct_vendas_boleto) : "",
        pct_vendas_cartao: d.pct_vendas_cartao != null ? String(d.pct_vendas_cartao) : "",
        pct_vendas_outros: d.pct_vendas_outros != null ? String(d.pct_vendas_outros) : "",
        pct_fat_debito: (d as any).pct_fat_debito != null ? String((d as any).pct_fat_debito) : "",
        parceiros_financeiros: d.parceiros_financeiros ?? "",
        empresas_ligadas: Array.isArray(d.empresas_ligadas) ? d.empresas_ligadas : [],
        limite_global_solicitado: d.limite_global_solicitado != null ? String(d.limite_global_solicitado) : "",
        modalidades: mods,
        avalistas_solidarios: Array.isArray(d.avalistas_solidarios) ? d.avalistas_solidarios : [],
        assinatura_digital_tipo: d.assinatura_digital_tipo ?? "",
        assinatura_digital_observacao: d.assinatura_digital_observacao ?? "",
        parecer_comercial: d.parecer_comercial ?? d.percepcoes ?? "",
        pontos_atencao: d.pontos_atencao ?? "",
        fotos: Array.isArray((d as any).fotos) ? (d as any).fotos : [],
      });
    } else {
      setMode("create");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedenteId]);

  const enterEditMode = () => {
    setMotivoAlteracao("");
    setMode("edit");
  };

  const cancelEdit = async () => {
    setMotivoAlteracao("");
    await loadFromDb();
  };


  const totalPct = useMemo(() => {
    return [form.pct_vendas_pf, form.pct_vendas_pj]
      .reduce((acc, v) => acc + (Number((v ?? "").replace(",", ".")) || 0), 0);
  }, [form]);

  const totalFat = useMemo(() => {
    return [form.pct_vendas_boleto, form.pct_vendas_cartao, form.pct_fat_debito, form.pct_vendas_cheque, form.pct_vendas_outros]
      .reduce((acc, v) => acc + (Number((v ?? "").replace(",", ".")) || 0), 0);
  }, [form]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setMod = <K extends keyof Modalidades>(k: K, patch: Partial<Modalidades[K]>) =>
    setForm((f) => ({ ...f, modalidades: { ...f.modalidades, [k]: { ...f.modalidades[k], ...patch } } }));

  const [uploadingFotos, setUploadingFotos] = useState(false);

  const uploadFotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploadingFotos(true);
    try {
      const novos: { path: string; name: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${cedenteId}/visita-fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("cedente-docs").upload(path, file, { upsert: false });
        if (error) { toast.error(`Falha ao enviar ${file.name}`, { description: error.message }); continue; }
        novos.push({ path, name: file.name });
      }
      if (novos.length) setForm((f) => ({ ...f, fotos: [...f.fotos, ...novos] }));
    } finally {
      setUploadingFotos(false);
    }
  };

  const removerFoto = async (idx: number) => {
    const foto = form.fotos[idx];
    if (!foto) return;
    await supabase.storage.from("cedente-docs").remove([foto.path]);
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, i) => i !== idx) }));
  };

  const abrirFoto = async (path: string) => {
    const { data } = await supabase.storage.from("cedente-docs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const gerarPdf = async () => {
    setGeneratingPdf(true);
    try {
      await generateVisitReportPdf(form as any, cedenteId, `v${versaoAtual}`);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e?.message });
    } finally {
      setGeneratingPdf(false);
    }
  };


  const handleSave = async () => {
    if (!form.data_visita) { toast.error("Informe a data da visita"); return; }
    if (!form.parecer_comercial.trim()) { toast.error("Informe o parecer comercial"); return; }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); toast.error("Não autenticado"); return; }

    const payload: any = {
      cedente_id: cedenteId,
      data_visita: form.data_visita,
      tipo_visita: form.tipo_visita || null,
      visitante: form.visitante || null,
      entrevistado_nome: form.entrevistado_nome || null,
      entrevistado_cargo: form.entrevistado_cargo || null,
      entrevistado_cpf: form.entrevistado_cpf || null,
      entrevistado_telefone: form.entrevistado_telefone || null,
      entrevistado_email: form.entrevistado_email || null,
      ramo_atividade: form.ramo_atividade || null,
      faturamento_mensal: num(form.faturamento_mensal),
      principais_produtos: form.principais_produtos || null,
      qtd_funcionarios: int(form.qtd_funcionarios),
      pct_vendas_pf: num(form.pct_vendas_pf),
      pct_vendas_pj: num(form.pct_vendas_pj),
      pct_vendas_cheque: num(form.pct_vendas_cheque),
      pct_vendas_boleto: num(form.pct_vendas_boleto),
      pct_vendas_cartao: num(form.pct_vendas_cartao),
      pct_vendas_outros: num(form.pct_vendas_outros),
      pct_fat_debito: num(form.pct_fat_debito),
      parceiros_financeiros: form.parceiros_financeiros || null,
      empresas_ligadas: form.empresas_ligadas,
      limite_global_solicitado: num(form.limite_global_solicitado),
      modalidades: form.modalidades,
      avalistas_solidarios: form.avalistas_solidarios,
      assinatura_digital_tipo: form.assinatura_digital_tipo || null,
      assinatura_digital_observacao: form.assinatura_digital_observacao || null,
      parecer_comercial: form.parecer_comercial,
      pontos_atencao: form.pontos_atencao || null,
      fotos: form.fotos,
      // legados — preservar contrato (NULLáveis agora)
      percepcoes: form.parecer_comercial,
      recomendacao: form.parecer_comercial.slice(0, 1000),
      participantes: [form.visitante, form.entrevistado_nome].filter(Boolean).join(" / ") || null,
      contexto: form.tipo_visita || null,
      created_by: auth.user.id,
    };

    if (mode === "edit") {
      if (!motivoAlteracao.trim()) {
        setSaving(false);
        toast.error("Informe o motivo da alteração");
        return;
      }
    }

    let reportId = existingId;
    let novaVersao = versaoAtual || 1;

    if (existingId) {
      const { error } = await supabase
        .from("cedente_visit_reports")
        .update({ ...payload, versao_atual: (versaoAtual || 1) + (mode === "edit" ? 1 : 0), precisa_revisao: mode === "edit" ? false : precisaRevisao })
        .eq("id", existingId);
      if (error) { setSaving(false); toast.error("Erro ao salvar", { description: error.message }); return; }
      novaVersao = (versaoAtual || 1) + (mode === "edit" ? 1 : 0);
    } else {
      const { data: ins, error } = await supabase
        .from("cedente_visit_reports")
        .insert({ ...payload, versao_atual: 1, precisa_revisao: false })
        .select("id")
        .single();
      if (error || !ins) { setSaving(false); toast.error("Erro ao salvar", { description: error?.message }); return; }
      reportId = ins.id;
      novaVersao = 1;
    }

    // Snapshot da versão
    const versionRow: any = {
      report_id: reportId,
      cedente_id: cedenteId,
      versao: novaVersao,
      is_current: true,
      motivo_alteracao: mode === "edit" ? motivoAlteracao.trim() : null,
      data_visita: payload.data_visita,
      tipo_visita: payload.tipo_visita,
      visitante: payload.visitante,
      entrevistado_nome: payload.entrevistado_nome,
      entrevistado_cargo: payload.entrevistado_cargo,
      entrevistado_cpf: payload.entrevistado_cpf,
      entrevistado_telefone: payload.entrevistado_telefone,
      entrevistado_email: payload.entrevistado_email,
      ramo_atividade: payload.ramo_atividade,
      faturamento_mensal: payload.faturamento_mensal,
      principais_produtos: payload.principais_produtos,
      qtd_funcionarios: payload.qtd_funcionarios,
      pct_vendas_pf: payload.pct_vendas_pf,
      pct_vendas_pj: payload.pct_vendas_pj,
      pct_vendas_cheque: payload.pct_vendas_cheque,
      pct_vendas_boleto: payload.pct_vendas_boleto,
      pct_vendas_cartao: payload.pct_vendas_cartao,
      pct_vendas_outros: payload.pct_vendas_outros,
      pct_fat_debito: payload.pct_fat_debito,
      parceiros_financeiros: payload.parceiros_financeiros,
      empresas_ligadas: payload.empresas_ligadas,
      limite_global_solicitado: payload.limite_global_solicitado,
      modalidades: payload.modalidades,
      avalistas_solidarios: payload.avalistas_solidarios,
      assinatura_digital_tipo: payload.assinatura_digital_tipo,
      assinatura_digital_observacao: payload.assinatura_digital_observacao,
      parecer_comercial: payload.parecer_comercial,
      pontos_atencao: payload.pontos_atencao,
      fotos: payload.fotos,
      created_by: auth.user.id,
    };

    if (mode === "edit") {
      // Marca versões anteriores como não-atuais
      await (supabase as any)
        .from("cedente_visit_report_versions")
        .update({ is_current: false })
        .eq("report_id", reportId);
    }

    const { error: vErr } = await (supabase as any)
      .from("cedente_visit_report_versions")
      .insert(versionRow);

    setSaving(false);
    if (vErr) { toast.error("Erro ao registrar versão", { description: vErr.message }); return; }

    toast.success(mode === "edit" ? `Nova versão (v${novaVersao}) salva` : "Relatório comercial salvo");
    clearDraft();
    setMotivoAlteracao("");
    setVersionsRefresh((n) => n + 1);
    await loadFromDb();
    onSaved?.();
  };


  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {precisaRevisao && mode !== "edit" && (
        <div className="flex items-start gap-2 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-md p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cadastro em revalidação</p>
            <p className="text-xs">Crie uma nova versão do relatório antes de avançar.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {existingId && (
            <>
              <span className="px-2 py-0.5 rounded-md border bg-muted/40">Versão atual: v{versaoAtual || 1}</span>
              {mode === "view" && <span className="text-green-700 dark:text-green-400">somente leitura</span>}
              {mode === "edit" && <span className="text-amber-700 dark:text-amber-400">editando nova versão</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === "view" && existingId && (
            <Button variant="default" onClick={enterEditMode}>
              <Pencil className="h-4 w-4 mr-2" /> Alterar relatório
            </Button>
          )}
          {mode === "edit" && (
            <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
          <Button variant="outline" onClick={gerarPdf} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </div>
      </div>

      {mode === "edit" && (
        <div className="space-y-2 border rounded-md p-3 bg-muted/30">
          <Label>Motivo da alteração *</Label>
          <Textarea
            rows={2}
            placeholder="Descreva brevemente o que mudou e por quê..."
            value={motivoAlteracao}
            onChange={(e) => setMotivoAlteracao(e.target.value)}
          />
        </div>
      )}

      <fieldset disabled={readOnly} className={readOnly ? "opacity-90" : ""}>
      <Accordion type="multiple" defaultValue={["cabecalho"]} className="space-y-2">

        {/* 1. Cabeçalho */}
        <AccordionItem value="cabecalho" className="border rounded-md px-4">
          <AccordionTrigger>1. Cabeçalho da visita</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data da visita *</Label>
                <Input type="date" value={form.data_visita} onChange={(e) => set("data_visita", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de visita</Label>
                <Select value={form.tipo_visita} onValueChange={(v) => set("tipo_visita", v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospeccao">Prospecção</SelectItem>
                    <SelectItem value="acompanhamento">Acompanhamento</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visitante (executivo)</Label>
                <Input value={form.visitante} onChange={(e) => set("visitante", e.target.value)} />
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Entrevistado</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.entrevistado_nome} onChange={(e) => set("entrevistado_nome", e.target.value)} /></div>
                <div className="space-y-2"><Label>Cargo</Label><Input value={form.entrevistado_cargo} onChange={(e) => set("entrevistado_cargo", e.target.value)} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.entrevistado_telefone} onChange={(e) => set("entrevistado_telefone", e.target.value)} /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.entrevistado_email} onChange={(e) => set("entrevistado_email", e.target.value)} /></div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Negócio */}
        <AccordionItem value="negocio" className="border rounded-md px-4">
          <AccordionTrigger>2. Dados do negócio</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Ramo de atividade</Label><Input value={form.ramo_atividade} onChange={(e) => set("ramo_atividade", e.target.value)} /></div>
              <div className="space-y-2"><Label>Faturamento mensal (R$)</Label><Input inputMode="decimal" value={form.faturamento_mensal} onChange={(e) => set("faturamento_mensal", e.target.value)} /></div>
              <div className="space-y-2"><Label>Nº de funcionários</Label><Input inputMode="numeric" value={form.qtd_funcionarios} onChange={(e) => set("qtd_funcionarios", e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Principais produtos / serviços</Label>
              <Textarea rows={2} value={form.principais_produtos} onChange={(e) => set("principais_produtos", e.target.value)} />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Distribuição de vendas (%)</p>
                <span className={`text-xs ${Math.abs(totalPct - 100) < 0.01 ? "text-green-600" : totalPct > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                  Total: {totalPct.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["pct_vendas_pf", "PF"], ["pct_vendas_pj", "PJ"],
                ].map(([k, lbl]) => (
                  <div key={k} className="space-y-2">
                    <Label>{lbl}</Label>
                    <Input inputMode="decimal" value={(form as any)[k]} onChange={(e) => set(k as any, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Forma de faturamento (%)</p>
                <span className={`text-xs ${Math.abs(totalFat - 100) < 0.01 ? "text-green-600" : totalFat > 100 ? "text-destructive" : "text-muted-foreground"}`}>
                  Total: {totalFat.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ["pct_vendas_boleto", "Boleto"], ["pct_vendas_cartao", "Cartão"],
                  ["pct_fat_debito", "Débito em conta"], ["pct_vendas_cheque", "Cheque"],
                  ["pct_vendas_outros", "Outros"],
                ].map(([k, lbl]) => (
                  <div key={k} className="space-y-2">
                    <Label>{lbl}</Label>
                    <Input inputMode="decimal" value={(form as any)[k]} onChange={(e) => set(k as any, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Adicionais */}
        <AccordionItem value="adicionais" className="border rounded-md px-4">
          <AccordionTrigger>3. Informações adicionais</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Parceiros financeiros (bancos/factorings com quem opera)</Label>
              <Textarea rows={2} value={form.parceiros_financeiros} onChange={(e) => set("parceiros_financeiros", e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Empresas ligadas / grupo econômico</Label>
                <Button size="sm" variant="outline" onClick={() => set("empresas_ligadas", [...form.empresas_ligadas, { nome: "", cnpj: "", relacao: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              {form.empresas_ligadas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma empresa ligada cadastrada.</p>}
              {form.empresas_ligadas.map((e, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                  <div className="col-span-12 md:col-span-4 space-y-1"><Label className="text-xs">Razão social</Label>
                    <Input value={e.nome} onChange={(ev) => { const arr = [...form.empresas_ligadas]; arr[i] = { ...arr[i], nome: ev.target.value }; set("empresas_ligadas", arr); }} />
                  </div>
                  <div className="col-span-7 md:col-span-3 space-y-1"><Label className="text-xs">CNPJ</Label>
                    <Input value={e.cnpj} onChange={(ev) => { const arr = [...form.empresas_ligadas]; arr[i] = { ...arr[i], cnpj: ev.target.value }; set("empresas_ligadas", arr); }} />
                  </div>
                  <div className="col-span-4 md:col-span-4 space-y-1"><Label className="text-xs">Relação</Label>
                    <Input placeholder="Ex.: matriz, filial, sócio em comum" value={e.relacao} onChange={(ev) => { const arr = [...form.empresas_ligadas]; arr[i] = { ...arr[i], relacao: ev.target.value }; set("empresas_ligadas", arr); }} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("empresas_ligadas", form.empresas_ligadas.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Pleito */}
        <AccordionItem value="pleito" className="border rounded-md px-4">
          <AccordionTrigger>4. Pleito de crédito</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Limite global solicitado (R$)</Label>
              <Input inputMode="decimal" value={form.limite_global_solicitado} onChange={(e) => set("limite_global_solicitado", e.target.value)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Modalidades operacionais</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <ModFull title="Desconto convencional" v={form.modalidades.desconto_convencional ?? emptyFull()} onChange={(p) => setMod("desconto_convencional", p)} />
                <ModFull title="Comissária" v={form.modalidades.comissaria ?? emptyFull()} onChange={(p) => setMod("comissaria", p)} />
                <ModFull title="Comissária com conta escrow" v={form.modalidades.comissaria_escrow ?? emptyFull()} onChange={(p) => setMod("comissaria_escrow", p)} />
                <ModFull title="Nota comercial" v={form.modalidades.nota_comercial ?? emptyFull()} onChange={(p) => setMod("nota_comercial", p)} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Avalistas solidários</Label>
                <Button size="sm" variant="outline" onClick={() => set("avalistas_solidarios", [...form.avalistas_solidarios, { nome: "", cpf: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              {form.avalistas_solidarios.length === 0 && <p className="text-sm text-muted-foreground">Nenhum avalista informado.</p>}
              {form.avalistas_solidarios.map((a, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                  <div className="col-span-12 md:col-span-7 space-y-1"><Label className="text-xs">Nome</Label>
                    <Input value={a.nome} onChange={(ev) => { const arr = [...form.avalistas_solidarios]; arr[i] = { ...arr[i], nome: ev.target.value }; set("avalistas_solidarios", arr); }} />
                  </div>
                  <div className="col-span-11 md:col-span-4 space-y-1"><Label className="text-xs">CPF</Label>
                    <Input value={a.cpf} onChange={(ev) => { const arr = [...form.avalistas_solidarios]; arr[i] = { ...arr[i], cpf: ev.target.value }; set("avalistas_solidarios", arr); }} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button size="icon" variant="ghost" onClick={() => set("avalistas_solidarios", form.avalistas_solidarios.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>

          </AccordionContent>
        </AccordionItem>

        {/* 5. Parecer */}
        <AccordionItem value="parecer" className="border rounded-md px-4">
          <AccordionTrigger>5. Parecer comercial</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Parecer comercial *</Label>
              <Textarea rows={5} placeholder="Avaliação geral, recomendação, próximos passos..." value={form.parecer_comercial} onChange={(e) => set("parecer_comercial", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pontos de atenção</Label>
              <Textarea rows={3} placeholder="Riscos, alertas, dependências..." value={form.pontos_atencao} onChange={(e) => set("pontos_atencao", e.target.value)} />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label>Fotos</Label>
                <Button size="sm" variant="outline" asChild disabled={uploadingFotos}>
                  <label className="cursor-pointer">
                    {uploadingFotos ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                    Adicionar fotos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { uploadFotos(e.target.files); e.target.value = ""; }}
                    />
                  </label>
                </Button>
              </div>
              {form.fotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma foto adicionada.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {form.fotos.map((f, i) => (
                    <div key={i} className="border rounded-md p-2 space-y-1 bg-muted/30">
                      <button
                        type="button"
                        onClick={() => abrirFoto(f.path)}
                        className="w-full aspect-square rounded bg-background flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </button>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs truncate flex-1" title={f.name}>{f.name}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removerFoto(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      </fieldset>

      <VisitReportVersionsPanel reportId={existingId} refreshKey={versionsRefresh} />

      {mode !== "view" && (
        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
          <DraftIndicator
            lastSavedAt={lastSavedAt}
            restored={restored}
            onDiscard={() => discardDraft(empty())}
          />
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {mode === "edit" ? "Salvar nova versão" : "Salvar relatório"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModFull({ title, v, onChange }: { title: string; v: ModalidadeFull; onChange: (p: Partial<ModalidadeFull>) => void }) {
  return (
    <div className="border rounded-md p-2.5 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={v.ativo} onCheckedChange={(c) => onChange({ ativo: !!c })} />
        <span className="font-medium text-sm">{title}</span>
      </label>
      {v.ativo && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label className="text-[11px]">Limite (R$)</Label><Input className="h-8" inputMode="decimal" value={v.limite} onChange={(e) => onChange({ limite: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Prazo (dias)</Label><Input className="h-8" inputMode="numeric" value={v.prazo_medio} onChange={(e) => onChange({ prazo_medio: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Taxa (% a.m.)</Label><Input className="h-8" inputMode="decimal" value={v.taxa} onChange={(e) => onChange({ taxa: e.target.value })} /></div>
          <div className="space-y-1 col-span-3"><Label className="text-[11px]">Observação</Label><Input className="h-8" value={v.observacao} onChange={(e) => onChange({ observacao: e.target.value })} /></div>
        </div>
      )}
    </div>
  );
}
