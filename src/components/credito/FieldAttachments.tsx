import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImagePlus, Loader2, X, Crop } from "lucide-react";
import { toast } from "sonner";
import { DocumentSnipDialog } from "./DocumentSnipDialog";

export interface Attachment {
  path: string;
  name: string;
  caption?: string;
}

interface Props {
  cedenteId: string;
  fieldKey: string;
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  disabled?: boolean;
}

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

export function FieldAttachments({ cedenteId, fieldKey, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [snipOpen, setSnipOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const missing = value.filter((a) => !urls[a.path]);
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (a) => {
          const { data } = await supabase.storage.from("report-files").createSignedUrl(a.path, 3600);
          return [a.path, data?.signedUrl ?? ""] as const;
        }),
      );
      if (!alive) return;
      setUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { alive = false; };
  }, [value]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPT.split(",").includes(file.type)) {
        toast.error(`${file.name}: formato não suportado`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: máximo 5 MB`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "png";
      const id = crypto.randomUUID();
      const path = `cedentes/${cedenteId}/credit-report/${fieldKey}/${id}.${ext}`;
      const { error } = await supabase.storage.from("report-files").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        toast.error(`Falha ao enviar ${file.name}`, { description: error.message });
        continue;
      }
      added.push({ path, name: file.name });
    }
    setUploading(false);
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(`${added.length} imagem(ns) anexada(s)`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (att: Attachment) => {
    await supabase.storage.from("report-files").remove([att.path]);
    onChange(value.filter((a) => a.path !== att.path));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ImagePlus className="h-3 w-3 mr-1" />}
          Anexar imagem
        </Button>
        {value.length > 0 && (
          <span className="text-[11px] text-muted-foreground">{value.length} anexada(s)</span>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a) => (
            <div key={a.path} className="relative group">
              <button
                type="button"
                onClick={() => urls[a.path] && setPreview(urls[a.path])}
                className="block h-16 w-16 rounded border bg-muted overflow-hidden"
                title={a.name}
              >
                {urls[a.path] ? (
                  <img src={urls[a.path]} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  </div>
                )}
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remover"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl p-2">
          {preview && <img src={preview} alt="Preview" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
