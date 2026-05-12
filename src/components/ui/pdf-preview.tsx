import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

(pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfPreviewProps {
  /** URL (blob:, data:, https:) or ArrayBuffer/Uint8Array */
  src: string | ArrayBuffer | Uint8Array;
  className?: string;
  /** rendering scale; default 1.4 */
  scale?: number;
}

/**
 * Renderiza um PDF inteiramente em <canvas> usando pdfjs-dist.
 * Evita o visualizador nativo do Chrome (que pode ser bloqueado em iframes
 * aninhados/sandboxed, como o preview do Lovable).
 */
export function PdfPreview({ src, className, scale = 1.4 }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pdfDoc: any = null;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const params: any =
          typeof src === "string" ? { url: src } : { data: src };
        pdfDoc = await (pdfjs as any).getDocument(params).promise;
        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "block mx-auto mb-2 shadow-sm rounded";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          container.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Falha ao carregar PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        pdfDoc?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [src, scale]);

  return (
    <div className={cn("relative w-full h-full overflow-auto bg-muted/30 rounded-md p-2", className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-destructive">
          {error}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
