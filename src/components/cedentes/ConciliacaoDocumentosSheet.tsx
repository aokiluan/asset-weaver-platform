import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import * as pdfjs from "pdfjs-dist";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2, FileText,
  Sparkles, Download, PartyPopper, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Categoria, Documento } from "./DocumentosUploadKanban";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedenteId: string;
  cedenteRazaoSocial: string;
  cedenteCnpj: string;
  documentos: Documento[];
  categorias: Categoria[];
  onChanged: () => void;
}

const fmtBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

// (anteriormente havia ação "devolver"; removida — reclassificação acontece direto na conciliação)

function PdfCanvasPreview({ pdfUrl, fileName }: { pdfUrl: string; fileName: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;
    container.innerHTML = "";
    setRendering(true);
    setRenderError(null);

    (async () => {
      try {
        const pdf = await (pdfjs as any).getDocument(pdfUrl).promise;
        if (cancelled) return;

        const targetWidth = Math.max(320, Math.min(1100, container.clientWidth - 24));

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;

          const viewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          canvas.className = "block max-w-full shadow-sm border rounded-sm";
          canvas.style.width = `${scaledViewport.width}px`;
          canvas.style.height = `${scaledViewport.height}px`;

          const context = canvas.getContext("2d");
          if (!context) continue;

          await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
          if (cancelled) return;

          const wrapper = document.createElement("div");
          wrapper.className = "mb-3 flex justify-center";
          wrapper.appendChild(canvas);
          container.appendChild(wrapper);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.message ?? "Não foi possível renderizar este PDF.";
          setRenderError(message);
          toast.error("Falha ao renderizar PDF", { description: message });
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  return (
    <div className="h-full overflow-auto p-3">
      {rendering && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando PDF…
        </div>
      )}
      {renderError ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <FileText className="h-10 w-10 opacity-40" />
          <p className="text-sm leading-tight">Não foi possível abrir a pré-visualização de {fileName}.</p>
        </div>
      ) : (
        <div ref={containerRef} className="min-h-full" />
      )}
    </div>
  );
}

export function ConciliacaoDocumentosSheet({
  open, onOpenChange, cedenteId, cedenteRazaoSocial, cedenteCnpj,
  documentos, categorias, onChanged,
}: Props) {
  const [somenteComCategoria, setSomenteComCategoria] = useState(true);

  const pendentesTodos = useMemo(
    () => documentos.filter((d) => d.status === "pendente"),
    [documentos],
  );
  const pendentesSemCategoria = useMemo(
    () => pendentesTodos.filter((d) => !d.categoria_id).length,
    [pendentesTodos],
  );
  const fila = useMemo(
    () => somenteComCategoria
      ? pendentesTodos.filter((d) => !!d.categoria_id)
      : pendentesTodos,
    [pendentesTodos, somenteComCategoria],
  );

  const [idx, setIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Dialog de motivo (reprovar)
  const [reprovarOpen, setReprovarOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviandoMotivo, setEnviandoMotivo] = useState(false);

  const current = fila[idx] ?? null;

  useEffect(() => { if (open) setIdx(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    if (idx >= fila.length && fila.length > 0) setIdx(fila.length - 1);
  }, [fila.length, idx, open]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!current) return;
    setPreviewLoading(true);

    (async () => {
      const { data, error } = await supabase.storage
        .from("cedente-docs")
        .createSignedUrl(current.storage_path, 300);
      if (cancelled) return;
      if (error || !data) {
        setPreviewLoading(false);
        return;
      }
      setPreviewUrl(data.signedUrl);
      if (!cancelled) setPreviewLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.storage_path, current?.mime_type]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (current && (e.key === "v" || e.key === "V")) { e.preventDefault(); verificar(); }
      else if (current && (e.key === "r" || e.key === "R")) { e.preventDefault(); abrirReprovar(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current, idx, fila.length]);

  const next = () => setIdx((i) => Math.min(fila.length - 1, i + 1));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  const verificar = async () => {
    if (!current) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("documentos").update({
      status: "aprovado", reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", current.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Documento verificado");
    onChanged();
  };

  const abrirReprovar = () => {
    setMotivo("");
    setReprovarOpen(true);
  };

  const confirmarMotivo = async () => {
    if (!current || !reprovarOpen) return;
    const txt = motivo.trim();
    if (!txt) { toast.error("Informe o motivo"); return; }
    setEnviandoMotivo(true);
    const { data: auth } = await supabase.auth.getUser();

    const { error } = await supabase.from("documentos").update({
      status: "reprovado", reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", current.id);
    if (error) {
      setEnviandoMotivo(false);
      toast.error("Erro ao atualizar documento", { description: error.message });
      return;
    }

    const comentario = `📄 Documento reprovado · ${current.nome_arquivo}\n\n${txt}`;
    const { error: histErr } = await supabase.from("cedente_history").insert({
      cedente_id: cedenteId,
      user_id: auth.user?.id ?? null,
      evento: "COMENTARIO",
      detalhes: {
        comentario,
        documento_id: current.id,
        acao: "reprovado",
      } as any,
    });
    setEnviandoMotivo(false);
    if (histErr) {
      toast.error("Documento atualizado, mas falhou ao publicar no Histórico", {
        description: histErr.message,
      });
    } else {
      toast.success("Documento reprovado e registrado no Histórico");
    }
    setReprovarOpen(false);
    setMotivo("");
    onChanged();
  };

  const aceitarSugestao = async () => {
    if (!current?.categoria_sugerida_id) return;
    const { error } = await supabase.from("documentos").update({
      categoria_id: current.categoria_sugerida_id,
      categoria_sugerida_id: null,
    }).eq("id", current.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    onChanged();
  };

  const moverPara = async (catId: string | null) => {
    if (!current) return;
    const { error } = await supabase.from("documentos").update({
      categoria_id: catId, categoria_sugerida_id: null,
    }).eq("id", current.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    onChanged();
  };

  const baixar = async () => {
    if (!current) return;
    const { data, error } = await supabase.storage.from("cedente-docs")
      .createSignedUrl(current.storage_path, 60);
    if (error || !data) { toast.error("Erro", { description: error?.message }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const categoriaAtual = current
    ? categorias.find((c) => c.id === current.categoria_id) ?? null
    : null;
  const categoriaSugerida = current
    ? categorias.find((c) => c.id === current.categoria_sugerida_id) ?? null
    : null;

  const isPdf = current?.mime_type?.includes("pdf");
  const isImg = current?.mime_type?.startsWith("image/");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-screen sm:max-w-none lg:max-w-[95vw] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <div className="flex flex-col gap-2 px-4 py-3 border-b bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">
                Conciliação de documentos · {cedenteRazaoSocial}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">{cedenteCnpj}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={somenteComCategoria}
                  onChange={(e) => { setSomenteComCategoria(e.target.checked); setIdx(0); }}
                  className="h-3 w-3 accent-primary"
                />
                Apenas com categoria
              </label>
              {fila.length > 0 && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {Math.min(idx + 1, fila.length)} de {fila.length}
                </span>
              )}
            </div>
          </div>
          {somenteComCategoria && pendentesSemCategoria > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 px-2.5 py-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="flex-1">
                <span className="font-medium">{pendentesSemCategoria}</span> documento(s) ainda sem categoria —
                peça ao comercial para classificar antes de validar.
              </span>
              <button
                onClick={() => { setSomenteComCategoria(false); setIdx(0); }}
                className="text-amber-700 dark:text-amber-300 hover:underline font-medium whitespace-nowrap"
              >
                Ver mesmo assim
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        {fila.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <PartyPopper className="h-12 w-12 text-primary" />
            <h3 className="text-lg font-semibold">Tudo conciliado!</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Não há documentos pendentes de validação para este cedente.
            </p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : !current ? null : (
          <div className="flex-1 grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] overflow-hidden">
            {/* FICHA */}
            <div className="border-r overflow-y-auto p-4 space-y-3 bg-muted/10">
              <section className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Arquivo</p>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-all">{current.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtBytes(current.tamanho_bytes)} • enviado em{" "}
                      {new Date(current.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Categoria</p>
                {categoriaAtual ? (
                  <Badge variant="secondary" className="text-xs">{categoriaAtual.nome}</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Sem categoria</Badge>
                )}
                {categoriaSugerida && !current.categoria_id && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2 mt-1.5 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs flex-1">
                      IA sugere: <span className="font-medium">{categoriaSugerida.nome}</span>
                    </span>
                    <Button size="sm" className="h-6 text-xs" onClick={aceitarSugestao}>
                      Aceitar
                    </Button>
                  </div>
                )}
                <div className="pt-1">
                  <select
                    className="w-full text-xs rounded-md border bg-background px-2 py-1.5"
                    value={current.categoria_id ?? ""}
                    onChange={(e) => moverPara(e.target.value || null)}
                  >
                    <option value="">— Sem categoria —</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}{c.obrigatorio ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={baixar}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar arquivo original
                </Button>
              </section>
            </div>

            {/* VIEWER */}
            <div className="bg-muted/40 relative overflow-hidden">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {previewUrl && isPdf && (
                <PdfCanvasPreview
                  key={current.id}
                  pdfUrl={previewUrl}
                  fileName={current.nome_arquivo}
                />
              )}
              {previewUrl && isImg && (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={current.nome_arquivo}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {previewUrl && !isPdf && !isImg && (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-30" />
                  <p className="text-sm">Pré-visualização indisponível</p>
                  <Button size="sm" variant="outline" onClick={baixar}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer com ações principais */}
        {fila.length > 0 && current && (
          <div className="border-t bg-card px-4 py-3 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={prev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="flex-1 flex items-center justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={abrirReprovar}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" /> Reprovar (R)
              </Button>
              <Button onClick={verificar} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como verificado (V)
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={next}
              disabled={idx >= fila.length - 1}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Dialog de motivo */}
        <Dialog open={reprovarOpen} onOpenChange={(v) => { if (!v) { setReprovarOpen(false); setMotivo(""); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reprovar documento</DialogTitle>
              <DialogDescription>
                O motivo será publicado no <strong>Histórico</strong> do cedente para que os outros perfis vejam.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Motivo</label>
              <Textarea
                rows={4}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: documento ilegível, fora do prazo de validade, divergência de CNPJ…"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setReprovarOpen(false); setMotivo(""); }} disabled={enviandoMotivo}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarMotivo}
                disabled={!motivo.trim() || enviandoMotivo}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {enviandoMotivo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reprovar e publicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

export default ConciliacaoDocumentosSheet;
