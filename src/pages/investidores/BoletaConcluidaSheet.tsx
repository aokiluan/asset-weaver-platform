import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfPreview } from "@/components/ui/pdf-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BOLETA_STATUS_LABEL, BOLETA_STATUS_VARIANT, fmtBRL,
  type InvestorBoleta, type InvestorSeries,
} from "@/lib/investor-boletas";
import { type InvestorContact } from "@/lib/investor-contacts";
import { resolveInvestorName } from "@/lib/investor-name";

interface SignedFile { name: string; storage_path: string; saved_at?: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boleta: InvestorBoleta | null;
  contact: InvestorContact | null;
  series: InvestorSeries | undefined;
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</div>
      <div className="text-[12px] text-foreground leading-tight">{value ?? "—"}</div>
    </div>
  );
}

export function BoletaConcluidaSheet({ open, onOpenChange, boleta, contact, series }: Props) {
  const [signedFiles, setSignedFiles] = useState<SignedFile[]>([]);
  const [investidorId, setInvestidorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadFiles(boletaId: string) {
    setLoading(true);
    const [{ data: t }, { data: b }] = await Promise.all([
      (supabase.from as any)("signature_tracking")
        .select("signed_files").eq("boleta_id", boletaId)
        .order("created_at", { ascending: false }).limit(1),
      supabase.from("investor_boletas").select("investidor_id").eq("id", boletaId).maybeSingle(),
    ]);
    const row = (t as any[])?.[0];
    const files = Array.isArray(row?.signed_files) ? row.signed_files as SignedFile[] : [];
    setSignedFiles(files);
    setInvestidorId((b as any)?.investidor_id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (!open || !boleta) return;
    loadFiles(boleta.id);
  }, [open, boleta]);

  async function handleResync() {
    if (!boleta) return;
    setSyncing(true);
    const { error } = await supabase.functions.invoke("sync-autentique-status", {
      body: { boletaId: boleta.id },
    });
    setSyncing(false);
    if (error) {
      toast.error("Falha ao buscar arquivos", { description: error.message });
      return;
    }
    await loadFiles(boleta.id);
    toast.success("Sincronização concluída");
  }

  async function handleDownload(file: SignedFile) {
    setDownloading(file.storage_path);
    try {
      const { data, error } = await supabase.storage
        .from("investor-boletas")
        .download(file.storage_path);
      if (error || !data) throw error ?? new Error("Falha no download");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error("Não foi possível baixar", { description: e?.message });
    } finally {
      setDownloading(null);
    }
  }

  const [viewing, setViewing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  async function handleView(file: SignedFile) {
    setViewing(file.storage_path);
    try {
      const { data, error } = await supabase.storage
        .from("investor-boletas")
        .download(file.storage_path);
      if (error || !data) throw error ?? new Error("Falha ao abrir");
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      setPreviewName(file.name);
      setPreviewUrl(url);
    } catch (e: any) {
      toast.error("Não foi possível visualizar", { description: e?.message });
    } finally {
      setViewing(null);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName("");
  }

  if (!boleta) return null;
  const dados = (boleta.dados_investidor || {}) as Record<string, any>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[14px] flex items-center gap-2">
            {resolveInvestorName(contact, boleta, "Boleta concluída")}
            <Badge variant={BOLETA_STATUS_VARIANT[boleta.status]} className="text-[9px] h-4 px-1.5">
              {BOLETA_STATUS_LABEL[boleta.status]}
            </Badge>
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Boleta · {fmtBRL(boleta.valor)} · {series?.nome ?? "Sem série"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="rounded-md border bg-card p-2.5 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Resumo</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label="Série" value={series?.nome} />
              <Field label="Valor" value={fmtBRL(boleta.valor)} />
              <Field label="Prazo" value={boleta.prazo_meses ? `${boleta.prazo_meses} meses` : "—"} />
              <Field label="Taxa efetiva" value={boleta.taxa_efetiva != null ? `${boleta.taxa_efetiva}%` : "—"} />
              <Field label="Concluída em" value={fmtDate(boleta.concluida_em)} />
              <Field label="Assinada em" value={fmtDate(boleta.contrato_assinado_em)} />
            </div>
          </div>

          <div className="rounded-md border bg-card p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Investidor</div>
              {investidorId && (
                <Button asChild variant="ghost" size="sm" className="h-6 text-[11px]">
                  <Link to={`/diretorio/investidores/${investidorId}`}>
                    Abrir pasta <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Field label="Nome" value={dados.nome} />
              <Field label="CPF/CNPJ" value={dados.cpf_cnpj} />
              <Field label="E-mail" value={dados.email} />
              <Field label="Telefone" value={dados.telefone} />
            </div>
          </div>

          <div className="rounded-md border bg-card p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">
                Documentos assinados
              </div>
              <Button
                variant="outline" size="sm"
                className="h-6 text-[11px]"
                onClick={handleResync}
                disabled={syncing}
              >
                {syncing
                  ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Sincronizando</>
                  : "Buscar arquivos"}
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center text-[11px] text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Carregando...
              </div>
            ) : signedFiles.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/80 py-2">
                Nenhum PDF assinado disponível ainda. Sincronize a assinatura para baixar.
              </div>
            ) : (
              <div className="space-y-1.5">
                {signedFiles.map((f) => (
                  <div key={f.storage_path} className="flex items-center gap-2 rounded border p-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1 text-[12px] truncate">{f.name}</div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 text-[11px] px-2"
                      onClick={() => handleView(f)}
                      disabled={viewing === f.storage_path}
                      title="Visualizar"
                    >
                      {viewing === f.storage_path
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><Eye className="h-3 w-3 mr-1" /> Ver</>}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => handleDownload(f)}
                      disabled={downloading === f.storage_path}
                    >
                      {downloading === f.storage_path
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><Download className="h-3 w-3 mr-1" /> Baixar</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      <Dialog open={!!previewUrl} onOpenChange={(v) => { if (!v) closePreview(); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-3 py-2 border-b">
            <DialogTitle className="text-[12px] font-medium truncate">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewUrl && <PdfPreview src={previewUrl} className="h-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
