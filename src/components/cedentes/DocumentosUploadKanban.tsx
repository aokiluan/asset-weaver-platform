import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, XCircle, Download, Trash2, Upload, Loader2, FileText,
  Sparkles, FolderOpen, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Categoria {
  id: string;
  nome: string;
  obrigatorio: boolean;
  ordem: number;
}

export interface Documento {
  id: string;
  cedente_id: string;
  categoria_id: string | null;
  categoria_sugerida_id: string | null;
  classificacao_status: "pendente" | "analisando" | "sugerido" | "erro";
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  status: "pendente" | "aprovado" | "reprovado";
  observacoes: string | null;
  uploaded_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Props {
  cedenteId: string;
  categorias: Categoria[];
  documentos: Documento[];
  onChanged: () => void;
}

const fmtBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const STATUS_VARIANT: Record<Documento["status"], "default" | "secondary" | "destructive"> = {
  pendente: "secondary", aprovado: "default", reprovado: "destructive",
};

export function DocumentosUploadKanban({ cedenteId, categorias, documentos, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Polling enquanto houver docs em "analisando"
  useEffect(() => {
    const analisando = documentos.some((d) => d.classificacao_status === "analisando");
    if (!analisando) return;
    const t = setInterval(onChanged, 2500);
    return () => clearInterval(t);
  }, [documentos, onChanged]);

  const fila = documentos.filter((d) => !d.categoria_id);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Não autenticado");
      setUploading(false);
      return;
    }

    let okCount = 0;
    for (const file of files) {
      try {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${cedenteId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("cedente-docs")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { data: docIns, error: insErr } = await supabase.from("documentos").insert({
          cedente_id: cedenteId,
          categoria_id: null,
          nome_arquivo: file.name,
          storage_path: path,
          tamanho_bytes: file.size,
          mime_type: file.type || null,
          uploaded_by: auth.user.id,
          classificacao_status: "pendente",
        }).select("id").single();
        if (insErr) {
          await supabase.storage.from("cedente-docs").remove([path]);
          throw insErr;
        }
        okCount++;
        // Dispara classificação (fire-and-forget; UI atualiza por polling)
        supabase.functions.invoke("classify-documento", {
          body: { documento_id: docIns.id },
        }).then(({ error, data }) => {
          if (error || (data as any)?.error) {
            console.warn("classify falhou", error || (data as any)?.error);
          }
          onChanged();
        });
      } catch (err: any) {
        toast.error(`Erro ao enviar ${file.name}`, { description: err.message });
      }
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(`${okCount} arquivo(s) enviado(s). Classificando...`);
      onChanged();
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    e.target.value = "";
    uploadFiles(list);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (dt?.files?.length) {
      uploadFiles(Array.from(dt.files));
    }
  };

  const moveTo = async (documentoId: string, categoriaId: string) => {
    const { error } = await supabase.from("documentos").update({
      categoria_id: categoriaId,
      categoria_sugerida_id: null,
    }).eq("id", documentoId);
    if (error) {
      toast.error("Erro ao mover", { description: error.message });
      return;
    }
    onChanged();
  };

  const handleDownload = async (doc: Documento) => {
    const { data, error } = await supabase.storage.from("cedente-docs").createSignedUrl(doc.storage_path, 60);
    if (error || !data) { toast.error("Erro ao gerar link", { description: error?.message }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Documento) => {
    await supabase.storage.from("cedente-docs").remove([doc.storage_path]);
    const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
    if (error) { toast.error("Erro ao remover", { description: error.message }); return; }
    toast.success("Documento removido");
    onChanged();
  };

  const handleReview = async (doc: Documento, status: "aprovado" | "reprovado") => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("documentos").update({
      status, reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", doc.id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    onChanged();
  };

  const onCardDragStart = (e: React.DragEvent, docId: string) => {
    e.dataTransfer.setData("text/documento-id", docId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onCategoryDragOver = (e: React.DragEvent, catId: string) => {
    if (e.dataTransfer.types.includes("text/documento-id")) {
      e.preventDefault();
      setDragOverCat(catId);
    }
  };

  const onCategoryDrop = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    setDragOverCat(null);
    const id = e.dataTransfer.getData("text/documento-id");
    if (id) moveTo(id, catId);
  };

  return (
    <div className="space-y-6">
      {/* Dropzone principal */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 bg-muted/20",
        )}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleSelect} accept=".pdf,.jpg,.jpeg,.png,.webp" />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">
          {uploading ? "Enviando..." : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, JPG, PNG • A IA sugere a categoria automaticamente
        </p>
      </div>

      {/* Fila de não classificados */}
      {fila.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Fila de classificação ({fila.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fila.map((doc) => {
              const sugerida = categorias.find((c) => c.id === doc.categoria_sugerida_id);
              return (
                <div
                  key={doc.id}
                  draggable
                  onDragStart={(e) => onCardDragStart(e, doc.id)}
                  className="border rounded-md p-3 bg-card cursor-move hover:shadow-sm transition-shadow space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" title={doc.nome_arquivo}>{doc.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">{fmtBytes(doc.tamanho_bytes)}</p>
                    </div>
                  </div>

                  {doc.classificacao_status === "analisando" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analisando conteúdo...
                    </div>
                  )}
                  {doc.classificacao_status === "pendente" && (
                    <div className="text-xs text-muted-foreground">Aguardando análise...</div>
                  )}
                  {doc.classificacao_status === "erro" && (
                    <div className="text-xs text-destructive">Falha na sugestão — arraste manualmente.</div>
                  )}
                  {doc.classificacao_status === "sugerido" && sugerida && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">Sugerido:</span>
                        <span className="font-medium">{sugerida.nome}</span>
                      </div>
                      <Button size="sm" className="w-full h-7 text-xs" onClick={() => moveTo(doc.id, sugerida.id)}>
                        Aceitar e mover
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-end gap-1 pt-1 border-t">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(doc)} title="Baixar"><Download className="h-3 w-3" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Remover"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                          <AlertDialogDescription>O arquivo será excluído permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorias (dropzones) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Categorias</h3>
        </div>

        {categorias.map((cat) => {
          const docs = documentos.filter((d) => d.categoria_id === cat.id);
          const aprovado = docs.some((d) => d.status === "aprovado");
          const isOver = dragOverCat === cat.id;
          return (
            <div
              key={cat.id}
              onDragOver={(e) => onCategoryDragOver(e, cat.id)}
              onDragLeave={() => setDragOverCat(null)}
              onDrop={(e) => onCategoryDrop(e, cat.id)}
              className={cn(
                "rounded-md border transition-colors",
                isOver ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{cat.nome}</span>
                  {cat.obrigatorio && <span className="text-destructive text-xs">*</span>}
                  {aprovado ? <Badge variant="default" className="text-xs">OK</Badge>
                    : docs.length > 0 ? <Badge variant="secondary" className="text-xs">Pendente</Badge>
                    : cat.obrigatorio ? <Badge variant="outline" className="text-xs">Faltando</Badge> : null}
                </div>
                <span className="text-xs text-muted-foreground">{docs.length} arquivo(s)</span>
              </div>

              <div className="p-3 min-h-[60px]">
                {docs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Solte um arquivo aqui
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        draggable
                        onDragStart={(e) => onCardDragStart(e, d.id)}
                        className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted/50 cursor-move"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">{d.nome_arquivo}</span>
                        <span className="text-xs text-muted-foreground">{fmtBytes(d.tamanho_bytes)}</span>
                        <Badge variant={STATUS_VARIANT[d.status]} className="text-xs">{d.status}</Badge>
                        <div className="flex gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDownload(d)} title="Baixar"><Download className="h-3 w-3" /></Button>
                          {d.status !== "aprovado" && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReview(d, "aprovado")} title="Aprovar"><CheckCircle2 className="h-3 w-3 text-green-600" /></Button>
                          )}
                          {d.status !== "reprovado" && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReview(d, "reprovado")} title="Reprovar"><XCircle className="h-3 w-3 text-destructive" /></Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-6 w-6" title="Remover"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                                <AlertDialogDescription>O arquivo será excluído permanentemente.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(d)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
