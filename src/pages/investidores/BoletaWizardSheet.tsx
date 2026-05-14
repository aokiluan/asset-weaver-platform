import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BOLETA_STATUS_LABEL,
  BOLETA_STEPS,
  fmtBRL,
  type BoletaDadosInvestidor,
  type InvestorBoleta,
  type InvestorSeries,
} from "@/lib/investor-boletas";
import type { InvestorContact } from "@/lib/investor-contacts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: InvestorContact | null;
  boleta: InvestorBoleta | null;
  onSaved: () => void;
}

export function BoletaWizardSheet({ open, onOpenChange, contact, boleta, onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [series, setSeries] = useState<InvestorSeries[]>([]);
  const [boletaId, setBoletaId] = useState<string | null>(null);

  // form state
  const [dados, setDados] = useState<BoletaDadosInvestidor>({});
  const [seriesId, setSeriesId] = useState<string>("");
  const [valor, setValor] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [contratoPath, setContratoPath] = useState<string | null>(null);
  const [comprovantePath, setComprovantePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // load séries
  useEffect(() => {
    if (!open) return;
    supabase
      .from("investor_series")
      .select("*")
      .eq("ativa", true)
      .order("ordem")
      .then(({ data }) => setSeries((data ?? []) as InvestorSeries[]));
  }, [open]);

  // hydrate from boleta or contact
  useEffect(() => {
    if (!open) return;
    if (boleta) {
      setBoletaId(boleta.id);
      setStep(boleta.current_step || 1);
      setDados(boleta.dados_investidor || {});
      setSeriesId(boleta.series_id ?? "");
      setValor(boleta.valor ?? null);
      setObservacoes(boleta.observacoes ?? "");
      setContratoPath(boleta.contrato_path);
      setComprovantePath(boleta.comprovante_path);
    } else {
      setBoletaId(null);
      setStep(1);
      setDados({
        nome: contact?.contact_name ?? contact?.name ?? "",
      });
      setSeriesId("");
      setValor(contact?.ticket ?? null);
      setObservacoes("");
      setContratoPath(null);
      setComprovantePath(null);
    }
  }, [open, boleta, contact]);

  const selectedSeries = useMemo(
    () => series.find((s) => s.id === seriesId) ?? null,
    [series, seriesId],
  );

  async function ensureBoleta(extra: Record<string, unknown> = {}): Promise<string | null> {
    if (!user || !contact) return null;
    const base = {
      contact_id: contact.id,
      user_id: user.id,
      series_id: seriesId || null,
      valor: valor,
      prazo_meses: selectedSeries?.prazo_meses ?? null,
      dados_investidor: dados as never,
      observacoes: observacoes || null,
      current_step: step,
      contrato_path: contratoPath,
      comprovante_path: comprovantePath,
      ...extra,
    } as never;

    if (boletaId) {
      const { error } = await supabase
        .from("investor_boletas")
        .update(base)
        .eq("id", boletaId);
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        return null;
      }
      return boletaId;
    } else {
      const { data, error } = await supabase
        .from("investor_boletas")
        .insert(base)
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Erro ao criar boleta", { description: error?.message });
        return null;
      }
      setBoletaId(data.id);
      return data.id;
    }
  }

  async function handleNext() {
    if (!user || !contact) return;
    if (step === 1) {
      if (!dados.nome || !dados.cpf_cnpj) {
        toast.error("Informe nome e CPF/CNPJ");
        return;
      }
    }
    if (step === 2) {
      if (!seriesId || !valor) {
        toast.error("Selecione série e informe o valor");
        return;
      }
    }
    setSaving(true);
    const id = await ensureBoleta({ current_step: Math.min(step + 1, 4) });
    setSaving(false);
    if (id) {
      setStep((s) => Math.min(s + 1, 4));
      onSaved();
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    await ensureBoleta();
    setSaving(false);
    toast.success("Rascunho salvo");
    onSaved();
    onOpenChange(false);
  }

  async function uploadFile(file: File, kind: "contrato" | "comprovante") {
    if (!user) return;
    const id = boletaId ?? (await ensureBoleta());
    if (!id) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("investor-boletas")
      .upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      toast.error("Falha no upload", { description: error.message });
      return;
    }
    if (kind === "contrato") {
      setContratoPath(path);
      await supabase
        .from("investor_boletas")
        .update({
          contrato_path: path,
          contrato_assinado_em: new Date().toISOString(),
          status: "assinada",
          current_step: 4,
        })
        .eq("id", id);
      setStep(4);
      toast.success("Contrato enviado");
    } else {
      setComprovantePath(path);
      await supabase
        .from("investor_boletas")
        .update({
          comprovante_path: path,
          pagamento_enviado_em: new Date().toISOString(),
          status: "pagamento_enviado",
        })
        .eq("id", id);
      toast.success("Comprovante enviado");
    }
    onSaved();
  }

  async function handleConcluir(moverParaAtivo: boolean) {
    if (!boletaId || !contact) return;
    setSaving(true);
    const { error } = await supabase
      .from("investor_boletas")
      .update({ status: "concluida", concluida_em: new Date().toISOString() })
      .eq("id", boletaId);
    if (error) {
      toast.error("Erro ao concluir", { description: error.message });
      setSaving(false);
      return;
    }
    if (moverParaAtivo) {
      await supabase
        .from("investor_contacts")
        .update({ stage: "investidor_ativo" })
        .eq("id", contact.id);
    }
    setSaving(false);
    toast.success("Boleta concluída");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[16px]">
            {boleta ? "Continuar boleta" : "Nova boleta"}
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            {contact?.name}
            {boleta && (
              <>
                {" · "}
                <Badge variant="secondary" className="text-[10px]">
                  {BOLETA_STATUS_LABEL[boleta.status]}
                </Badge>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 my-4">
          {BOLETA_STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0",
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step > s.id ? <Check className="h-3 w-3" /> : s.id}
              </div>
              <div
                className={cn(
                  "text-[11px] truncate",
                  step >= s.id ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </div>
              {i < BOLETA_STEPS.length - 1 && (
                <div className="h-px flex-1 bg-border" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {step === 1 && (
            <div className="space-y-3">
              <Field label="Nome completo" value={dados.nome ?? ""} onChange={(v) => setDados({ ...dados, nome: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="CPF / CNPJ" value={dados.cpf_cnpj ?? ""} onChange={(v) => setDados({ ...dados, cpf_cnpj: v })} />
                <Field label="E-mail" value={dados.email ?? ""} onChange={(v) => setDados({ ...dados, email: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="RG" value={dados.rg ?? ""} onChange={(v) => setDados({ ...dados, rg: v })} />
                <Field label="Órgão emissor" value={dados.orgao_emissor ?? ""} onChange={(v) => setDados({ ...dados, orgao_emissor: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CepField
                  value={dados.cep ?? ""}
                  onChange={(v) => setDados((d) => ({ ...d, cep: v }))}
                  onResolved={(addr) =>
                    setDados((d) => ({
                      ...d,
                      cep: addr.cep,
                      endereco: addr.logradouro || d.endereco,
                      bairro: addr.bairro || d.bairro,
                      cidade: addr.cidade || d.cidade,
                      estado: addr.estado || d.estado,
                    }))
                  }
                />
                <Field label="Cidade" value={dados.cidade ?? ""} onChange={(v) => setDados({ ...dados, cidade: v })} />
                <Field label="UF" value={dados.estado ?? ""} onChange={(v) => setDados({ ...dados, estado: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Endereço" value={dados.endereco ?? ""} onChange={(v) => setDados({ ...dados, endereco: v })} />
                <Field label="Nº" value={dados.numero ?? ""} onChange={(v) => setDados({ ...dados, numero: v })} />
                <Field label="Bairro" value={dados.bairro ?? ""} onChange={(v) => setDados({ ...dados, bairro: v })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Série</Label>
                <Select value={seriesId} onValueChange={setSeriesId}>
                  <SelectTrigger className="h-7 text-[12px]">
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSeries && (
                <div className="text-[11px] text-muted-foreground">
                  Indexador: {selectedSeries.indexador ?? "—"} ·
                  Spread: {selectedSeries.spread ?? "—"}% ·
                  Prazo: {selectedSeries.prazo_meses ?? "—"} meses
                </div>
              )}
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Valor do investimento</Label>
                <CurrencyInput
                  value={valor ?? 0}
                  onValueChange={(v) => setValor(v)}
                  className="h-7 text-[12px]"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Observações</Label>
                <Textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-[12px]"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="text-[12px] text-muted-foreground">
                Faça upload do contrato/termo assinado pelo investidor (PDF).
              </div>
              <FileUploader
                accept="application/pdf"
                currentPath={contratoPath}
                uploading={uploading}
                onFile={(f) => uploadFile(f, "contrato")}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="text-[12px] text-muted-foreground">
                Faça upload do comprovante de pagamento.
              </div>
              <FileUploader
                accept="application/pdf,image/*"
                currentPath={comprovantePath}
                uploading={uploading}
                onFile={(f) => uploadFile(f, "comprovante")}
              />
              {comprovantePath && (
                <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                  <div className="text-[12px] font-medium">Resumo</div>
                  <div className="text-[11px] text-muted-foreground">
                    {dados.nome} · {selectedSeries?.nome} · {fmtBRL(valor)}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={saving}
                      onClick={() => handleConcluir(true)}
                    >
                      Concluir e marcar como Ativo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={saving}
                      onClick={() => handleConcluir(false)}
                    >
                      Apenas concluir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6 flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            disabled={step === 1 || saving}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={saving}
              onClick={handleSaveDraft}
            >
              Salvar rascunho
            </Button>
            {step < 4 && (
              <Button size="sm" className="h-7" disabled={saving} onClick={handleNext}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Próximo <ArrowRight className="h-3.5 w-3.5 ml-1" /></>}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-7 text-[12px]" />
    </div>
  );
}

function FileUploader({
  accept,
  currentPath,
  uploading,
  onFile,
}: {
  accept: string;
  currentPath: string | null;
  uploading: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <label className="block border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...
        </div>
      ) : currentPath ? (
        <div className="flex items-center justify-center gap-2 text-[12px] text-foreground">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Arquivo enviado · clique para substituir
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Upload className="h-3.5 w-3.5" /> Clique para enviar
        </div>
      )}
    </label>
  );
}
