import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, XCircle, Download, Trash2, Upload, Loader2, FileText,
  Sparkles, ChevronDown, ChevronRight, FolderInput, ChevronLeft, Image as ImageIcon,
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

const STATUS_DOT: Record<Documento["status"], string> = {
  pendente: "bg-amber-500",
  aprovado: "bg-green-600",
  reprovado: "bg-destructive",
};

type Filter = "todos" | "pendentes" | "aprovados" | "reprovados" | "sem_categoria";

const SEM_CAT = "__sem_categoria__";

export function DocumentosUploadKanban({ cedenteId, categorias, documentos, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("todos");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [obs, setObs] = useState("");
  const obsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Polling enquanto houver docs em "analisando"
  useEffect(() => {
    const analisando = documentos.some((d) => d.classificacao_status === "analisando");
    if (!analisando) return;
    const t = setInterval(onChanged, 2500);
    return () => clearInterval(t);
  }, [documentos, onChanged]);

  // Doc selecionado (do estado mais recente)
  const selectedDoc = useMemo(
    () => documentos.find((d) => d.id === selectedId) ?? null,
    [documentos, selectedId],
  );

  // Carrega preview ao trocar seleção
  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!selectedDoc) {
      setObs("");
      return;
    }
    setObs(selectedDoc.observacoes ?? "");
    setPreviewLoading(true);
    supabase.storage.from("cedente-docs")
      .createSignedUrl(selectedDoc.storage_path, 300)
      .then(({ data, error }) => {
        if (cancelled) return;
        setPreviewLoading(false);
        if (!error && data) setPreviewUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [selectedDoc?.id, selectedDoc?.storage_path]);

  // Filtragem
  const passesFilter = (d: Documento) => {
    if (filter === "todos") return true;
    if (filter === "pendentes") return d.status === "pendente";
    if (filter === "aprovados") return d.status === "aprovado";
    if (filter === "reprovados") return d.status === "reprovado";
    if (filter === "sem_categoria") return !d.categoria_id;
    return true;
  };

  // Agrupamento: sem_categoria + cada categoria
  const grupos = useMemo(() => {
    const out: { key: string; label: string; obrigatorio: boolean; docs: Documento[] }[] = [];
    const semCat = documentos.filter((d) => !d.categoria_id && passesFilter(d));
    out.push({ key: SEM_CAT, label: "Sem categoria", obrigatorio: false, docs: semCat });
    for (const c of categorias) {
      const docs = documentos.filter((d) => d.categoria_id === c.id && passesFilter(d));
      out.push({ key: c.id, label: c.nome, obrigatorio: c.obrigatorio, docs });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentos, categorias, filter]);

  const visibleDocs = useMemo(() => grupos.flatMap((g) => g.docs), [grupos]);

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!visibleDocs.length) return;
      const idx = visibleDocs.findIndex((d) => d.id === selectedId);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = visibleDocs[Math.min(visibleDocs.length - 1, idx + 1)] ?? visibleDocs[0];
        setSelectedId(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = visibleDocs[Math.max(0, idx - 1)] ?? visibleDocs[0];
        setSelectedId(prev.id);
      } else if (selectedDoc) {
        if (e.key === "a" || e.key === "A") { e.preventDefault(); handleReview(selectedDoc, "aprovado"); }
        else if (e.key === "r" || e.key === "R") { e.preventDefault(); handleReview(selectedDoc, "reprovado"); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleDocs, selectedId]);

  // Salvar observação debounced
  const saveObs = (value: string) => {
    setObs(value);
    if (!selectedDoc) return;
    if (obsTimer.current) clearTimeout(obsTimer.current);
    obsTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("documentos")
        .update({ observacoes: value || null }).eq("id", selectedDoc.id);
      if (!error) onChanged();
    }, 600);
  };

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
    if (dt?.files?.length) uploadFiles(Array.from(dt.files));
  };

  const moveTo = async (documentoId: string, categoriaId: string | null) => {
    const { error } = await supabase.from("documentos").update({
      categoria_id: categoriaId,
      categoria_sugerida_id: null,
    }).eq("id", documentoId);
    if (error) { toast.error("Erro ao mover", { description: error.message }); return; }
    onChanged();
  };

  const moveSelectedTo = async (categoriaId: string | null) => {
    if (checked.size === 0) return;
    const ids = Array.from(checked);
    const { error } = await supabase.from("documentos").update({
      categoria_id: categoriaId,
      categoria_sugerida_id: null,
    }).in("id", ids);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success(`${ids.length} movido(s)`);
    setChecked(new Set());
    onChanged();
  };

  const reviewSelected = async (status: "aprovado" | "reprovado") => {
    if (checked.size === 0) return;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("documentos").update({
      status, reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).in("id", Array.from(checked));
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success(`${checked.size} ${status}(s)`);
    setChecked(new Set());
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
    if (selectedId === doc.id) setSelectedId(null);
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
    if (id) moveTo(id, catId === SEM_CAT ? null : catId);
  };

  const toggleCheck = (id: string) => {
    setChecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleCollapsed = (key: string) => {
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const goAdjacent = (delta: number) => {
    if (!selectedDoc) return;
    const idx = visibleDocs.findIndex((d) => d.id === selectedDoc.id);
    const next = visibleDocs[idx + delta];
    if (next) setSelectedId(next.id);
  };

  const sugeridaDoSelecionado = selectedDoc
    ? categorias.find((c) => c.id === selectedDoc.categoria_sugerida_id)
    : null;

  const isPdf = selectedDoc?.mime_type?.includes("pdf");
  const isImg = selectedDoc?.mime_type?.startsWith("image/");

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pendentes", label: "Pendentes" },
    { key: "aprovados", label: "Aprovados" },
    { key: "reprovados", label: "Reprovados" },
    { key: "sem_categoria", label: "Sem categoria" },
  ];

  return (
    <div className="space-y-3">
      {/* Dropzone fina */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-md border-2 border-dashed px-4 py-3 cursor-pointer transition-all flex items-center gap-3",
          dragActive
            ? "border-primary bg-primary/10 py-6"
            : "border-muted-foreground/30 hover:border-primary/50 bg-muted/20",
        )}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleSelect} accept=".pdf,.jpg,.jpeg,.png,.webp" />
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {uploading ? "Enviando..." : "Arraste arquivos aqui ou clique para selecionar"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          PDF/JPG/PNG • IA sugere a categoria
        </span>
      </div>

      {/* Toolbar de filtros + ações em massa */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          {filterButtons.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-1 text-xs rounded transition-colors",
                filter === f.key ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {checked.size > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">{checked.size} selecionado(s)</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reviewSelected("aprovado")}>
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reviewSelected("reprovado")}>
              <XCircle className="h-3 w-3 mr-1 text-destructive" /> Reprovar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <FolderInput className="h-3 w-3 mr-1" /> Mover
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                <DropdownMenuItem onClick={() => moveSelectedTo(null)}>Sem categoria</DropdownMenuItem>
                {categorias.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => moveSelectedTo(c.id)}>
                    {c.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setChecked(new Set())}>
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Split view */}
      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        {/* LISTA */}
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col max-h-[640px]">
          <div className="overflow-y-auto flex-1">
            {grupos.map((g) => {
              const isOpen = !collapsed.has(g.key);
              const aprovado = g.docs.some((d) => d.status === "aprovado");
              return (
                <div
                  key={g.key}
                  onDragOver={(e) => onCategoryDragOver(e, g.key)}
                  onDragLeave={() => setDragOverCat(null)}
                  onDrop={(e) => onCategoryDrop(e, g.key)}
                  className={cn(
                    "border-b last:border-b-0",
                    dragOverCat === g.key && "bg-primary/5",
                  )}
                >
                  <button
                    onClick={() => toggleCollapsed(g.key)}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="flex-1 text-left truncate">{g.label}</span>
                    {g.obrigatorio && <span className="text-destructive">*</span>}
                    {g.docs.length > 0 ? (
                      aprovado
                        ? <Badge variant="default" className="h-4 text-[10px] px-1.5">OK</Badge>
                        : <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{g.docs.length}</Badge>
                    ) : g.obrigatorio ? (
                      <Badge variant="outline" className="h-4 text-[10px] px-1.5">faltando</Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">vazio</span>
                    )}
                  </button>

                  {isOpen && g.docs.length > 0 && (
                    <ul>
                      {g.docs.map((d) => {
                        const isSel = selectedId === d.id;
                        const isChk = checked.has(d.id);
                        const sug = categorias.find((c) => c.id === d.categoria_sugerida_id);
                        return (
                          <li
                            key={d.id}
                            draggable
                            onDragStart={(e) => onCardDragStart(e, d.id)}
                            onClick={() => setSelectedId(d.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-xs border-l-2 transition-colors",
                              isSel
                                ? "bg-primary/10 border-l-primary"
                                : "border-l-transparent hover:bg-muted/40",
                            )}
                          >
                            <Checkbox
                              checked={isChk}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={() => toggleCheck(d.id)}
                              className="h-3.5 w-3.5"
                            />
                            <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", STATUS_DOT[d.status])} />
                            {d.mime_type?.startsWith("image/")
                              ? <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              : <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            <span className="flex-1 truncate" title={d.nome_arquivo}>{d.nome_arquivo}</span>
                            {d.classificacao_status === "analisando" && (
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
                            )}
                            {sug && !d.categoria_id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); moveTo(d.id, sug.id); }}
                                className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] flex-shrink-0"
                                title={`Aceitar sugestão: ${sug.nome}`}
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                <span className="max-w-[60px] truncate">{sug.nome}</span>
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* VIEWER */}
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col min-h-[400px] max-h-[640px]">
          {!selectedDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">Selecione um documento para visualizar</p>
              <p className="text-xs">Use ↑/↓ para navegar, A para aprovar, R para reprovar</p>
            </div>
          ) : (
            <>
              {/* Toolbar do viewer */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goAdjacent(-1)} title="Anterior">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goAdjacent(1)} title="Próximo">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" title={selectedDoc.nome_arquivo}>
                    {selectedDoc.nome_arquivo}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtBytes(selectedDoc.tamanho_bytes)} • {selectedDoc.status}
                  </p>
                </div>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleReview(selectedDoc, "aprovado")}
                  disabled={selectedDoc.status === "aprovado"}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Aprovar
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleReview(selectedDoc, "reprovado")}
                  disabled={selectedDoc.status === "reprovado"}
                >
                  <XCircle className="h-3 w-3 mr-1 text-destructive" /> Reprovar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <FolderInput className="h-3 w-3 mr-1" /> Mover
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                    <DropdownMenuItem onClick={() => moveTo(selectedDoc.id, null)}>Sem categoria</DropdownMenuItem>
                    {categorias.map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => moveTo(selectedDoc.id, c.id)}>
                        {c.nome}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(selectedDoc)} title="Baixar">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                      <AlertDialogDescription>O arquivo será excluído permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(selectedDoc)}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {sugeridaDoSelecionado && !selectedDoc.categoria_id && (
                <div className="px-3 py-2 border-b bg-primary/5 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs">
                    Sugestão da IA: <span className="font-medium">{sugeridaDoSelecionado.nome}</span>
                  </span>
                  <Button
                    size="sm" className="h-6 text-xs ml-auto"
                    onClick={() => moveTo(selectedDoc.id, sugeridaDoSelecionado.id)}
                  >
                    Aceitar
                  </Button>
                </div>
              )}

              {/* Preview */}
              <div className="flex-1 bg-muted/40 relative">
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {previewUrl && isPdf && (
                  <iframe src={previewUrl} title="preview" className="w-full h-full border-0" />
                )}
                {previewUrl && isImg && (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                    <img src={previewUrl} alt={selectedDoc.nome_arquivo} className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                {previewUrl && !isPdf && !isImg && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 p-8 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p className="text-sm">Pré-visualização indisponível</p>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(selectedDoc)}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar para abrir
                    </Button>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="border-t p-2">
                <Textarea
                  value={obs}
                  onChange={(e) => saveObs(e.target.value)}
                  placeholder="Observações do analista (salvas automaticamente)..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
