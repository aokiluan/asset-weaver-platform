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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2, XCircle, Download, Trash2, Upload, Loader2, FileText,
  Sparkles, ChevronDown, ChevronRight, FolderInput, Image as ImageIcon,
  LayoutList, LayoutGrid, Inbox, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ConciliacaoDocumentosSheet } from "./ConciliacaoDocumentosSheet";

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
  reviewer_nome?: string | null;
}

interface Props {
  cedenteId: string;
  cedenteRazaoSocial: string;
  cedenteCnpj: string;
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

const fmtDate = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

type Filter = "todos" | "pendentes" | "aprovados" | "reprovados" | "sem_categoria";
type ViewMode = "lista" | "quadro";
const SEM_CAT = "__sem_categoria__";

function StatusSelo({ d }: { d: Documento }) {
  if (d.status === "aprovado") {
    const reviewer = d.reviewer_nome ? ` · ${d.reviewer_nome}` : "";
    const data = d.reviewed_at ? ` · ${fmtDate(d.reviewed_at)}` : "";
    return (
      <Badge className="h-5 text-[10px] px-1.5 bg-green-600 hover:bg-green-600 text-white gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" />
        <span>Verificado{reviewer}{data}</span>
      </Badge>
    );
  }
  if (d.status === "reprovado") {
    const inner = (
      <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-1">
        <XCircle className="h-2.5 w-2.5" /> Reprovado
      </Badge>
    );
    if (!d.observacoes) return inner;
    return (
      <Tooltip>
        <TooltipTrigger asChild><span>{inner}</span></TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{d.observacoes}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1 border-amber-500/60 text-amber-700 dark:text-amber-400">
      <Loader2 className="h-2.5 w-2.5" /> Aguardando análise
    </Badge>
  );
}

export function DocumentosUploadKanban({
  cedenteId, cedenteRazaoSocial, cedenteCnpj, categorias, documentos, onChanged,
}: Props) {
  const { hasRole } = useAuth();
  // Conciliação/validação: somente time de cadastro (admin = master)
  const canReview = hasRole("admin") || hasRole("analista_cadastro");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("todos");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [conciliarOpen, setConciliarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  const pendentesCount = useMemo(
    () => documentos.filter((d) => d.status === "pendente").length,
    [documentos],
  );

  // Progresso: categorias obrigatórias com ao menos 1 documento associado
  const obrigatoriasProgress = useMemo(() => {
    const obrigatorias = categorias.filter((c) => c.obrigatorio);
    const total = obrigatorias.length;
    const preenchidas = obrigatorias.filter((c) =>
      documentos.some((d) => d.categoria_id === c.id),
    ).length;
    return { total, preenchidas };
  }, [categorias, documentos]);

  // Polling enquanto houver docs em "analisando"
  useEffect(() => {
    const analisando = documentos.some((d) => d.classificacao_status === "analisando");
    if (!analisando) return;
    const t = setInterval(onChanged, 2500);
    return () => clearInterval(t);
  }, [documentos, onChanged]);

  const passesFilter = (d: Documento) => {
    if (filter === "todos") return true;
    if (filter === "pendentes") return d.status === "pendente";
    if (filter === "aprovados") return d.status === "aprovado";
    if (filter === "reprovados") return d.status === "reprovado";
    if (filter === "sem_categoria") return !d.categoria_id;
    return true;
  };

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

  const moveManyTo = async (ids: string[], categoriaId: string | null) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("documentos").update({
      categoria_id: categoriaId,
      categoria_sugerida_id: null,
    }).in("id", ids);
    if (error) { toast.error("Erro ao mover", { description: error.message }); return; }
    if (ids.length > 1) toast.success(`${ids.length} documento(s) movido(s)`);
    setChecked(new Set());
    onChanged();
  };

  const moveTo = (documentoId: string, categoriaId: string | null) =>
    moveManyTo([documentoId], categoriaId);

  const moveSelectedTo = (categoriaId: string | null) =>
    moveManyTo(Array.from(checked), categoriaId);

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
    toast.success("Documento removido");
    onChanged();
  };

  // Drag-and-drop com suporte a multi-seleção
  const onCardDragStart = (e: React.DragEvent, docId: string) => {
    const ids = checked.has(docId) && checked.size > 1
      ? Array.from(checked)
      : [docId];
    e.dataTransfer.setData("text/documento-ids", JSON.stringify(ids));
    e.dataTransfer.setData("text/documento-id", docId); // compat
    e.dataTransfer.effectAllowed = "move";
  };
  const onCategoryDragOver = (e: React.DragEvent, catId: string) => {
    if (
      e.dataTransfer.types.includes("text/documento-id") ||
      e.dataTransfer.types.includes("text/documento-ids")
    ) {
      e.preventDefault();
      setDragOverCat(catId);
    }
  };
  const onCategoryDrop = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    setDragOverCat(null);
    const target = catId === SEM_CAT ? null : catId;
    const idsRaw = e.dataTransfer.getData("text/documento-ids");
    if (idsRaw) {
      try {
        const ids = JSON.parse(idsRaw) as string[];
        if (Array.isArray(ids) && ids.length) { moveManyTo(ids, target); return; }
      } catch { /* ignore */ }
    }
    const single = e.dataTransfer.getData("text/documento-id");
    if (single) moveTo(single, target);
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

  const filterButtons: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "pendentes", label: "Pendentes" },
    { key: "aprovados", label: "Verificados" },
    { key: "reprovados", label: "Reprovados" },
    { key: "sem_categoria", label: "Sem categoria" },
  ];

  // Card compartilhado (lista e quadro usam variantes diferentes)
  const renderCard = (d: Documento, variant: "list" | "board") => {
    const isChk = checked.has(d.id);
    const sug = categorias.find((c) => c.id === d.categoria_sugerida_id);
    if (variant === "board") {
      return (
        <div
          key={d.id}
          draggable
          onDragStart={(e) => onCardDragStart(e, d.id)}
          className={cn(
            "rounded-md border bg-card p-2 text-xs cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors space-y-1.5",
            isChk && "ring-2 ring-primary border-primary",
          )}
        >
          <div className="flex items-start gap-1.5">
            <Checkbox
              checked={isChk}
              onCheckedChange={() => toggleCheck(d.id)}
              className="h-3.5 w-3.5 mt-0.5"
            />
            {d.mime_type?.startsWith("image/")
              ? <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              : <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
            <p className="flex-1 break-words leading-tight" title={d.nome_arquivo}>
              {d.nome_arquivo}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{fmtBytes(d.tamanho_bytes)}</span>
            {d.classificacao_status === "analisando" && (
              <Badge variant="outline" className="h-4 text-[9px] px-1 gap-1">
                <Loader2 className="h-2 w-2 animate-spin" /> IA
              </Badge>
            )}
            <StatusSelo d={d} />
          </div>
          {sug && !d.categoria_id && (
            <button
              onClick={() => moveTo(d.id, sug.id)}
              className="w-full flex items-center gap-1 px-1.5 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px]"
              title={`Aceitar sugestão: ${sug.nome}`}
            >
              <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate">IA: {sug.nome}</span>
            </button>
          )}
          <div className="flex items-center justify-end gap-0.5 pt-0.5">
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => handleDownload(d)} title="Baixar"
            >
              <Download className="h-3 w-3" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6" title="Remover">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O arquivo será excluído permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(d)}>Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      );
    }
    return (
      <li
        key={d.id}
        draggable
        onDragStart={(e) => onCardDragStart(e, d.id)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
      >
        <Checkbox
          checked={isChk}
          onCheckedChange={() => toggleCheck(d.id)}
          className="h-3.5 w-3.5"
        />
        {d.mime_type?.startsWith("image/")
          ? <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          : <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" title={d.nome_arquivo}>
            {d.nome_arquivo}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {fmtBytes(d.tamanho_bytes)}
          </p>
        </div>
        {d.classificacao_status === "analisando" && (
          <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1">
            <Loader2 className="h-2.5 w-2.5 animate-spin" /> IA
          </Badge>
        )}
        {sug && !d.categoria_id && (
          <button
            onClick={() => moveTo(d.id, sug.id)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] flex-shrink-0"
            title={`Aceitar sugestão: ${sug.nome}`}
          >
            <Sparkles className="h-2.5 w-2.5" />
            <span className="max-w-[80px] truncate">{sug.nome}</span>
          </button>
        )}
        <StatusSelo d={d} />
        <Button
          size="icon" variant="ghost" className="h-7 w-7"
          onClick={() => handleDownload(d)}
          title="Baixar"
        >
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
              <AlertDialogDescription>
                O arquivo será excluído permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(d)}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </li>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Top bar: upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "rounded-md border-2 border-dashed px-4 py-3 cursor-pointer transition-all flex items-center gap-3",
            dragActive
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/30 hover:border-primary/50 bg-muted/20",
          )}
        >
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleSelect} accept=".pdf,.jpg,.jpeg,.png,.webp" />
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {uploading ? "Enviando..." : "Arraste arquivos aqui ou clique para selecionar"}
          </span>
          <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
            PDF/JPG/PNG • IA sugere a categoria
          </span>
        </div>

        {/* Progresso de obrigatórias */}
        {obrigatoriasProgress.total > 0 && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <span className="font-medium text-foreground">
                {obrigatoriasProgress.preenchidas}/{obrigatoriasProgress.total}
              </span>{" "}
              categorias obrigatórias preenchidas
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  obrigatoriasProgress.preenchidas === obrigatoriasProgress.total
                    ? "bg-green-600"
                    : "bg-primary",
                )}
                style={{
                  width: `${(obrigatoriasProgress.preenchidas / obrigatoriasProgress.total) * 100}%`,
                }}
              />
            </div>
            {obrigatoriasProgress.preenchidas === obrigatoriasProgress.total && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white h-5 text-[10px]">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Pronto para conciliar
              </Badge>
            )}
          </div>
        )}

        {/* Filtros + conciliar + ações em massa */}
        <div className="flex flex-wrap items-center gap-2">
          {canReview ? (
            <div className="flex gap-1 rounded-md bg-muted p-0.5">
              <button
                onClick={() => setConciliarOpen(true)}
                className="px-2.5 py-1 text-xs rounded transition-colors text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                Conciliar documentos
                {pendentesCount > 0 && (
                  <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                    {pendentesCount}
                  </Badge>
                )}
              </button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="flex gap-1 rounded-md bg-muted p-0.5">
                  <button
                    disabled
                    className="px-2.5 py-1 text-xs rounded transition-colors text-muted-foreground/60 inline-flex items-center gap-1.5 cursor-not-allowed"
                  >
                    Conciliar documentos
                    {pendentesCount > 0 && (
                      <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] rounded-full">
                        {pendentesCount}
                      </Badge>
                    )}
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-xs">
                Apenas o time de cadastro pode conciliar documentos.
              </TooltipContent>
            </Tooltip>
          )}

          {/* Toggle de modo de visualização */}
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            <button
              onClick={() => setViewMode("lista")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors inline-flex items-center gap-1",
                viewMode === "lista" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
              title="Modo lista"
            >
              <LayoutList className="h-3 w-3" /> Lista
            </button>
            <button
              onClick={() => setViewMode("quadro")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors inline-flex items-center gap-1",
                viewMode === "quadro" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
              )}
              title="Modo quadro (drag-and-drop)"
            >
              <LayoutGrid className="h-3 w-3" /> Quadro
            </button>
          </div>

          <div className="flex gap-1 rounded-md bg-muted p-0.5 ml-auto">
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
              {canReview && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reviewSelected("aprovado")}>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> Verificar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => reviewSelected("reprovado")}>
                    <XCircle className="h-3 w-3 mr-1 text-destructive" /> Reprovar
                  </Button>
                </>
              )}
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

        {/* Conteúdo principal: Lista ou Quadro */}
        {viewMode === "lista" ? (
          <div className="rounded-lg border bg-card overflow-hidden">
            {grupos.map((g) => {
              const isOpen = !collapsed.has(g.key);
              const aprovadosNoGrupo = g.docs.filter((d) => d.status === "aprovado").length;
              const totalGrupo = g.docs.length;
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="flex-1 text-left truncate">{g.label}</span>
                    {g.obrigatorio && <span className="text-destructive text-xs">obrigatório</span>}
                    {totalGrupo > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {aprovadosNoGrupo}/{totalGrupo} verificados
                      </span>
                    ) : g.obrigatorio ? (
                      <Badge variant="outline" className="h-5 text-[10px] px-1.5 border-destructive/40 text-destructive">
                        faltando
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">vazio</span>
                    )}
                  </button>

                  {isOpen && g.docs.length > 0 && (
                    <ul className="divide-y">
                      {g.docs.map((d) => renderCard(d, "list"))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Modo Quadro: colunas kanban com drop-zone
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {grupos.map((g) => {
                const isSemCat = g.key === SEM_CAT;
                const aprovados = g.docs.filter((d) => d.status === "aprovado").length;
                const isHover = dragOverCat === g.key;
                const isEmpty = g.docs.length === 0;
                return (
                  <div
                    key={g.key}
                    onDragOver={(e) => onCategoryDragOver(e, g.key)}
                    onDragLeave={() => setDragOverCat(null)}
                    onDrop={(e) => onCategoryDrop(e, g.key)}
                    className={cn(
                      "w-[280px] flex-shrink-0 rounded-lg border bg-card flex flex-col",
                      isHover && "border-primary ring-2 ring-primary/30 bg-primary/5",
                      isSemCat && "border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10",
                      g.obrigatorio && isEmpty && !isHover && "border-destructive/40",
                    )}
                  >
                    <div className="px-3 py-2 border-b flex items-center gap-2">
                      <span className="text-xs font-medium flex-1 truncate" title={g.label}>
                        {g.label}
                      </span>
                      {g.obrigatorio && (
                        <span className="text-[10px] text-destructive">obrigatório</span>
                      )}
                      <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                        {g.docs.length}
                      </Badge>
                    </div>
                    {g.docs.length > 0 && (
                      <div className="px-3 pt-1 pb-0.5 text-[10px] text-muted-foreground">
                        {aprovados}/{g.docs.length} verificados
                      </div>
                    )}
                    <div className="p-2 space-y-2 flex-1 min-h-[120px]">
                      {isEmpty ? (
                        <div className={cn(
                          "h-full min-h-[100px] rounded-md border-2 border-dashed flex items-center justify-center text-[11px] text-muted-foreground text-center px-3",
                          isHover ? "border-primary text-primary" : "border-muted-foreground/20",
                        )}>
                          {isSemCat
                            ? "Documentos sem categoria aparecem aqui"
                            : `Arraste documentos de ${g.label} aqui`}
                        </div>
                      ) : (
                        g.docs.map((d) => renderCard(d, "board"))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ConciliacaoDocumentosSheet
          open={conciliarOpen}
          onOpenChange={setConciliarOpen}
          cedenteId={cedenteId}
          cedenteRazaoSocial={cedenteRazaoSocial}
          cedenteCnpj={cedenteCnpj}
          documentos={documentos}
          categorias={categorias}
          onChanged={onChanged}
        />
      </div>
    </TooltipProvider>
  );
}
