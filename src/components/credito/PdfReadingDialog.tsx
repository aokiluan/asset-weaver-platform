import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2, ChevronsDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Worker do pdf.js (vite resolve para URL final)
// @ts-expect-error - bundler vai resolver
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;

export type ReadingItemKey = "lido_relatorio_comercial" | "lido_analise_credito";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  pdfUrl: string | null;
  loading?: boolean;
  proposalId: string | null;
  itemKey: ReadingItemKey;
  alreadyConfirmed: boolean;
  onConfirmed: () => void;
}

export function PdfReadingDialog({
  open,
  onOpenChange,
  title,
  pdfUrl,
  loading,
  proposalId,
  itemKey,
  alreadyConfirmed,
  onConfirmed,
}: Props) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [reachedEnd, setReachedEnd] = useState(alreadyConfirmed);
  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [progress, setProgress] = useState(alreadyConfirmed ? 100 : 0);
  const [rendering, setRendering] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);

  // Reset state quando abre
  useEffect(() => {
    if (open) {
      setReachedEnd(alreadyConfirmed);
      setConfirmed(alreadyConfirmed);
      setProgress(alreadyConfirmed ? 100 : 0);
    }
  }, [open, alreadyConfirmed]);

  // Renderiza páginas quando o pdfUrl muda
  useEffect(() => {
    if (!open || !pdfUrl || !pagesContainerRef.current) return;
    let cancelled = false;
    const container = pagesContainerRef.current;
    container.innerHTML = "";
    setRendering(true);

    (async () => {
      try {
        const pdf = await (pdfjs as any).getDocument(pdfUrl).promise;
        if (cancelled) return;
        setPagesCount(pdf.numPages);
        const targetWidth = Math.min(800, container.clientWidth - 16);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / viewport.width;
          const scaled = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.className = "mx-auto mb-3 shadow-sm border bg-white block";
          canvas.style.width = `${scaled.width}px`;
          canvas.style.height = `${scaled.height}px`;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
      } catch (err: any) {
        if (!cancelled) toast.error("Falha ao renderizar PDF", { description: err?.message });
      } finally {
        if (!cancelled) {
          setRendering(false);
          // Re-checa se já está no fim (PDF pequeno)
          requestAnimationFrame(() => handleScroll());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, open]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max <= 0 ? 100 : Math.min(100, Math.round((el.scrollTop / max) * 100));
    setProgress(pct);
    if (pct >= 98) setReachedEnd(true);
  };

  const handleConfirm = async (v: boolean) => {
    if (!v || !reachedEnd) return;
    setConfirmed(true);
    if (proposalId && user) {
      const { error } = await supabase.from("committee_vote_checklist").insert({
        proposal_id: proposalId,
        voter_id: user.id,
        item_key: itemKey,
      });
      // 23505 = duplicate key, ignore silently
      if (error && (error as any).code !== "23505") {
        toast.error("Falha ao registrar leitura", { description: error.message });
        setConfirmed(false);
        return;
      }
    }
    onConfirmed();
    toast.success("Leitura confirmada");
  };

  const tryClose = (next: boolean) => {
    if (!next && !confirmed && !alreadyConfirmed) {
      toast.warning("Conclua a leitura antes de fechar");
      return;
    }
    onOpenChange(next);
  };

  const canClose = confirmed || alreadyConfirmed;

  return (
    <Dialog open={open} onOpenChange={tryClose}>
      <DialogContent
        className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => {
          if (!canClose) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) {
            e.preventDefault();
            toast.warning("Conclua a leitura antes de fechar");
          }
        }}
      >
        <DialogHeader className="p-3 border-b space-y-1">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-[13px] font-semibold leading-tight truncate">
              {title}
            </DialogTitle>
            <Badge variant={canClose ? "default" : "secondary"} className="text-[10px] h-5 shrink-0">
              {canClose ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Lido</>
              ) : (
                "Leitura obrigatória"
              )}
            </Badge>
          </div>
          {/* Barra de progresso */}
          <div className="h-1 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto bg-muted/30 p-2"
        >
          {(loading || rendering) && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando PDF…
            </div>
          )}
          <div ref={pagesContainerRef} />
          {!loading && !rendering && !reachedEnd && pagesCount > 0 && (
            <div className="sticky bottom-2 flex justify-center pointer-events-none">
              <button
                onClick={() => {
                  scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }}
                className="pointer-events-auto rounded-full bg-primary text-primary-foreground text-[11px] px-3 py-1.5 shadow-md flex items-center gap-1 hover:bg-primary/90"
              >
                <ChevronsDown className="h-3.5 w-3.5" /> Ir para o final
              </button>
            </div>
          )}
        </div>

        <div className="p-3 border-t flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-[12px] leading-tight cursor-pointer select-none">
            <Checkbox
              checked={confirmed}
              disabled={!reachedEnd || alreadyConfirmed}
              onCheckedChange={(v) => handleConfirm(!!v)}
            />
            <span>
              Confirmo que li o relatório integralmente
              {!reachedEnd && (
                <span className="text-muted-foreground"> · role até o final para liberar</span>
              )}
            </span>
          </label>
          <Button
            size="sm"
            variant={canClose ? "default" : "outline"}
            disabled={!canClose}
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
