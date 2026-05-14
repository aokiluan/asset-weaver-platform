import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Eye, Download, FileText, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  generateBoletimHtml,
  generateCertificadoHtml,
} from "@/lib/boleta-document-templates";
import {
  getLatestSignatureTracking,
  syncSignatureTracking,
  type SignerStatus,
  type SignatureTrackingRecord,
} from "@/lib/signature-tracking";
import type { BoletaDadosInvestidor, InvestorBoleta, InvestorSeries } from "@/lib/investor-boletas";

type State = "preview" | "sending" | "pending" | "signed";

interface Props {
  boletaId: string;
  boleta: InvestorBoleta;
  dados: BoletaDadosInvestidor;
  series: InvestorSeries;
  onAdvance: () => void;
  onClose?: () => void;
}

export function SignatureStep({ boletaId, boleta, dados, series, onAdvance, onClose }: Props) {
  const [state, setState] = useState<State>("preview");
  const [signers, setSigners] = useState<SignerStatus[]>([]);
  const [previewDoc, setPreviewDoc] = useState<"boletim" | "certificado" | null>(null);

  const boletimHtml = generateBoletimHtml({ boleta, dados, series });
  const certificadoHtml = generateCertificadoHtml({ boleta, dados, series });

  const apply = useCallback((t: SignatureTrackingRecord | null, notify = false) => {
    if (!t) return;
    setSigners(t.signers);
    if (t.status === "finished") {
      setState("signed");
      if (notify) toast.success("Boleta concluída — todos assinaram!");
      onAdvance();
      return;
    }
    setState("pending");
  }, [onAdvance]);

  // initial load
  useEffect(() => {
    (async () => {
      try {
        const t = await getLatestSignatureTracking(boletaId);
        if (t) apply(t, false);
      } catch (e) { console.error(e); }
    })();
  }, [boletaId, apply]);

  // polling
  useEffect(() => {
    if (state !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const t = await syncSignatureTracking(boletaId);
        if (!cancelled) apply(t, true);
      } catch (e) { console.error(e); }
    };
    const id = window.setInterval(tick, 15000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [state, boletaId, apply]);

  const handleSend = async () => {
    setState("sending");
    try {
      const { data, error } = await supabase.functions.invoke("send-to-autentique", { body: { boletaId } });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || "Erro");
      const links = (data as any).document?.signerLinks ?? [];
      setSigners(links.map((s: any) => ({ name: s.name, email: s.email, signed: false })));
      setState("pending");
      toast.success("Documentos enviados para assinatura");
    } catch (err) {
      console.error(err);
      setState("preview");
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    }
  };

  const handleDownload = (kind: "boletim" | "certificado") => {
    const html = kind === "boletim" ? boletimHtml : certificadoHtml;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-${dados.nome ?? "boleta"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {state === "preview" && (
        <>
          <div className="text-[12px] text-muted-foreground">
            Revise os documentos e envie para assinatura digital via Autentique. Boletim + Certificado em um único envelope.
          </div>
          {[
            { key: "boletim" as const, label: "Boletim de Subscrição" },
            { key: "certificado" as const, label: "Certificado de Debêntures" },
          ].map((d) => (
            <div key={d.key} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/20">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] font-medium">{d.label}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setPreviewDoc(d.key)}>
                  <Eye className="h-3.5 w-3.5 mr-1" />Ver
                </Button>
                <Button variant="ghost" size="sm" className="h-7" onClick={() => handleDownload(d.key)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="p-2.5 rounded-md border bg-muted/20 space-y-1">
            <p className="text-[11px] font-medium">Signatários:</p>
            <p className="text-[11px] text-muted-foreground leading-tight">✍️ Everaldo Fernando Silvério (Diretor Presidente)</p>
            <p className="text-[11px] text-muted-foreground leading-tight">✍️ Luan Aoki Helena Schuwarten (Diretor RI)</p>
            <p className="text-[11px] text-muted-foreground leading-tight">✍️ {dados.nome} (Investidor)</p>
          </div>
          <Button size="sm" className="h-7" onClick={handleSend}>
            <Send className="h-3.5 w-3.5 mr-1" /> Enviar para assinatura
          </Button>
        </>
      )}

      {state === "sending" && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-[12px] text-muted-foreground">Enviando para o Autentique…</p>
        </div>
      )}

      {state === "pending" && (
        <>
          <div className="flex items-center gap-2 p-2.5 rounded-md border bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <div>
              <p className="text-[12px] font-medium leading-tight">Aguardando assinatura</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Os links foram enviados por e-mail.</p>
            </div>
          </div>
          <div className="p-2.5 rounded-md border space-y-2">
            <p className="text-[11px] font-medium leading-none">Status dos signatários</p>
            {signers.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  {s.signed
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />}
                  <span className="leading-tight">{s.name || s.email}</span>
                </div>
                <Badge variant={s.signed ? "default" : "secondary"} className="text-[10px]">
                  {s.signed ? "Assinado" : "Pendente"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Atualizando a cada 15s…</p>
        </>
      )}

      {state === "signed" && (
        <div className="flex flex-col items-center gap-2 py-6">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-[12px] font-medium">Boleta concluída!</p>
          <p className="text-[11px] text-muted-foreground leading-tight text-center">
            Todos os signatários assinaram. A boleta foi marcada como concluída automaticamente.
          </p>
          {onClose && (
            <Button size="sm" className="h-7 mt-2" onClick={onClose}>Fechar</Button>
          )}
        </div>
      )}

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-[14px]">
              {previewDoc === "boletim" ? "Boletim de Subscrição" : "Certificado de Debêntures"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded bg-white">
            <iframe
              srcDoc={previewDoc === "boletim" ? boletimHtml : certificadoHtml}
              className="w-full h-full min-h-[600px] border-0"
              title="Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
