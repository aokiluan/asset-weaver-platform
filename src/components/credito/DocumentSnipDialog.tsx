import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Image as ImageIcon, Crop } from "lucide-react";
import { toast } from "sonner";

interface DocRow {
  id: string;
  nome_arquivo: string;
  mime_type: string | null;
  storage_path: string;
  categoria?: { nome: string } | null;
}

interface Props {
  cedenteId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCaptured: (blob: Blob, label: string) => void;
}

interface Rect { x: number; y: number; w: number; h: number }

export function DocumentSnipDialog({ cedenteId, open, onOpenChange, onCaptured }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selected, setSelected] = useState<DocRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [rect, setRect] = useState<Rect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingDocs(true);
    (async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, nome_arquivo, mime_type, storage_path, categoria:documento_categorias(nome)")
        .eq("cedente_id", cedenteId)
        .order("created_at", { ascending: false });
      if (error) toast.error("Falha ao carregar documentos", { description: error.message });
      setDocs((data as any) ?? []);
      setLoadingDocs(false);
    })();
  }, [open, cedenteId]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setSignedUrl(null);
      setRect(null);
      setPage(1);
      setPageCount(1);
      setScale(1.5);
      pdfDocRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    setRect(null);
    setPage(1);
    pdfDocRef.current = null;
    (async () => {
      const { data, error } = await supabase.storage
        .from("cedente-docs")
        .createSignedUrl(selected.storage_path, 3600);
      if (error || !data) {
        toast.error("Falha ao abrir documento", { description: error?.message });
        return;
      }
      setSignedUrl(data.signedUrl);
    })();
  }, [selected]);

  const syncOverlay = () => {
    const src = sourceCanvasRef.current;
    const ov = overlayCanvasRef.current;
    if (!src || !ov) return;
    ov.width = src.width;
    ov.height = src.height;
    drawOverlay(rect);
  };

  const drawOverlay = (r: Rect | null) => {
    const ov = overlayCanvasRef.current;
    if (!ov) return;
    const ctx = ov.getContext("2d")!;
    ctx.clearRect(0, 0, ov.width, ov.height);
    if (!r) return;
    ctx.fillStyle = "hsla(217, 91%, 60%, 0.18)";
    ctx.strokeStyle = "hsl(217, 91%, 60%)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  };

  useEffect(() => { drawOverlay(rect); }, [rect]);

  useEffect(() => {
    if (!signedUrl || !selected) return;
    const canvas = sourceCanvasRef.current;
    if (!canvas) return;
    const isImage = (selected.mime_type ?? "").startsWith("image/");
    const isPdf = (selected.mime_type ?? "") === "application/pdf" || selected.nome_arquivo.toLowerCase().endsWith(".pdf");

    let cancelled = false;
    setRendering(true);

    (async () => {
      try {
        if (isImage) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (cancelled) return;
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, w, h);
            syncOverlay();
            setPageCount(1);
            setRendering(false);
          };
          img.onerror = () => { setRendering(false); toast.error("Falha ao carregar imagem"); };
          img.src = signedUrl;
        } else if (isPdf) {
          const pdfjs: any = await import("pdfjs-dist");
          // @ts-ignore
          const workerMod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
          pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

          if (!pdfDocRef.current) {
            const pdf = await pdfjs.getDocument({ url: signedUrl }).promise;
            if (cancelled) return;
            pdfDocRef.current = pdf;
            setPageCount(pdf.numPages);
          }
          const pdf = pdfDocRef.current;
          const pg = await pdf.getPage(page);
          const viewport = pg.getViewport({ scale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await pg.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;
          syncOverlay();
          setRendering(false);
        } else {
          setRendering(false);
          toast.error("Tipo de arquivo não suportado para captura");
        }
      } catch (e: any) {
        if (!cancelled) {
          setRendering(false);
          toast.error("Falha ao renderizar", { description: e?.message });
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedUrl, selected, page, scale]);

  const getPos = (e: React.MouseEvent) => {
    const ov = overlayCanvasRef.current!;
    const r = ov.getBoundingClientRect();
    const sx = ov.width / r.width;
    const sy = ov.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const p = getPos(e);
    startRef.current = p;
    setDrawing(true);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !startRef.current) return;
    const p = getPos(e);
    const s = startRef.current;
    setRect({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  };
  const handleMouseUp = () => { setDrawing(false); startRef.current = null; };

  const handleCapture = async () => {
    if (!rect || !selected || rect.w < 5 || rect.h < 5) {
      toast.error("Selecione uma área maior");
      return;
    }
    const src = sourceCanvasRef.current!;
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(rect.w);
    tmp.height = Math.round(rect.h);
    const ctx = tmp.getContext("2d")!;
    ctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    tmp.toBlob((blob) => {
      if (!blob) { toast.error("Falha ao gerar recorte"); return; }
      const label = pageCount > 1
        ? `Recorte de ${selected.nome_arquivo} (pág. ${page})`
        : `Recorte de ${selected.nome_arquivo}`;
      onCaptured(blob, label);
      onOpenChange(false);
    }, "image/png", 0.95);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="text-sm">Capturar área de um documento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[260px_1fr] min-h-0">
          <div className="border-r overflow-hidden flex flex-col">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b">
              Documentos do cedente
            </div>
            <ScrollArea className="flex-1">
              {loadingDocs ? (
                <div className="p-4 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
                </div>
              ) : docs.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">Nenhum documento anexado.</div>
              ) : (
                <ul className="p-1">
                  {docs.map((d) => {
                    const isImg = (d.mime_type ?? "").startsWith("image/");
                    const isPdf = (d.mime_type ?? "") === "application/pdf" || d.nome_arquivo.toLowerCase().endsWith(".pdf");
                    const supported = isImg || isPdf;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          disabled={!supported}
                          onClick={() => setSelected(d)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-start gap-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed ${selected?.id === d.id ? "bg-accent" : ""}`}
                          title={!supported ? "Tipo não suportado" : d.nome_arquivo}
                        >
                          {isImg ? <ImageIcon className="h-3 w-3 mt-0.5 shrink-0" /> : <FileText className="h-3 w-3 mt-0.5 shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{d.nome_arquivo}</div>
                            {d.categoria?.nome && (
                              <div className="text-[10px] text-muted-foreground truncate">{d.categoria.nome}</div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b text-xs">
              {selected ? (
                <>
                  <span className="truncate flex-1">{selected.nome_arquivo}</span>
                  {pageCount > 1 && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <span className="tabular-nums">{page} / {pageCount}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}>
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <span className="tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}>
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">Selecione um documento à esquerda</span>
              )}
            </div>

            <ScrollArea className="flex-1 bg-muted/40">
              <div className="p-4 flex justify-center">
                {selected ? (
                  <div className="relative inline-block">
                    <canvas ref={sourceCanvasRef} className="block shadow-sm bg-white" />
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 cursor-crosshair"
                      style={{ width: "100%", height: "100%" }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    />
                    {rendering && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-20">Nada selecionado.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t">
          <div className="flex-1 text-[11px] text-muted-foreground">
            {selected && !rect && "Arraste sobre o documento para selecionar a área."}
            {rect && rect.w > 5 && rect.h > 5 && `Área: ${Math.round(rect.w)} × ${Math.round(rect.h)} px`}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleCapture} disabled={!rect || rect.w < 5 || rect.h < 5}>
            <Crop className="h-3 w-3 mr-1" /> Recortar e anexar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
