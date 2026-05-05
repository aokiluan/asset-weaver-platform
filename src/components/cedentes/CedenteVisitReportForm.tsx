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
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftIndicator } from "@/components/ui/draft-indicator";

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
});

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const int = (v: string) => (v.trim() === "" ? null : Math.trunc(Number(v)));

export function CedenteVisitReportForm({ cedenteId, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty());

  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<FormState>({
    key: `visit-report:${cedenteId}`,
    value: form,
    setValue: setForm,
    enabled: !loading,
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
        const d: any = data;
        setExistingId(d.id);
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
        });
      }
      setLoading(false);
    })();
  }, [cedenteId]);

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
      // legados — preservar contrato (NULLáveis agora)
      percepcoes: form.parecer_comercial,
      recomendacao: form.parecer_comercial.slice(0, 1000),
      participantes: [form.visitante, form.entrevistado_nome].filter(Boolean).join(" / ") || null,
      contexto: form.tipo_visita || null,
      created_by: auth.user.id,
    };

    const { error } = existingId
      ? await supabase.from("cedente_visit_reports").update(payload).eq("id", existingId)
      : await supabase.from("cedente_visit_reports").insert(payload);

    setSaving(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success("Relatório comercial salvo");
    clearDraft();
    onSaved?.();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div className="space-y-4">
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
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                <ModFull title="Desconto convencional" v={form.modalidades.desconto_convencional} onChange={(p) => setMod("desconto_convencional", p)} />
                <ModFull title="Comissária" v={form.modalidades.comissaria} onChange={(p) => setMod("comissaria", p)} />
                <ModFull title="Comissária com conta escrow" v={form.modalidades.comissaria_escrow} onChange={(p) => setMod("comissaria_escrow", p)} />
                <ModFull title="Nota comercial" v={form.modalidades.nota_comercial} onChange={(p) => setMod("nota_comercial", p)} />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Assinatura digital — tipo</Label>
                <Select value={form.assinatura_digital_tipo} onValueChange={(v) => set("assinatura_digital_tipo", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="icp_brasil">ICP-Brasil</SelectItem>
                    <SelectItem value="eletronica_simples">Eletrônica simples</SelectItem>
                    <SelectItem value="fisica">Física (papel)</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observação sobre assinatura</Label>
                <Input value={form.assinatura_digital_observacao} onChange={(e) => set("assinatura_digital_observacao", e.target.value)} />
              </div>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
        <DraftIndicator
          lastSavedAt={lastSavedAt}
          restored={restored}
          onDiscard={() => discardDraft(empty())}
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {existingId ? "Atualizar relatório" : "Salvar relatório"}
        </Button>
      </div>
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
