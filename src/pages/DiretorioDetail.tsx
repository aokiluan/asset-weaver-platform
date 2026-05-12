import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTabs } from "@/components/PageTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  FileText,
  FileImage,
  FileCheck2,
  Filter,
  FolderOpen,
  Folder,
  Gavel,
  LayoutGrid,
  LayoutList,
  Loader2,
  Paperclip,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeRenovacao,
  renovacaoLabel,
  type RenovacaoInfo,
} from "@/lib/cadastro-renovacao";
import { downloadAtaById } from "@/lib/comite-ata-pdf";
import { buildDocumentoFileName, getExt } from "@/lib/documento-filename";

interface Cedente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  stage: string;
  cadastro_revisado_em: string | null;
  minuta_assinada_em: string | null;
}

interface Categoria {
  id: string;
  nome: string;
  requer_conciliacao: boolean;
  ordem: number;
}

interface Documento {
  id: string;
  cedente_id: string;
  categoria_id: string | null;
  nome_arquivo: string;
  nome_arquivo_original: string | null;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  status: "pendente" | "aprovado" | "reprovado";
  created_at: string;
  uploaded_by: string;
}

interface HistoryRow {
  id: string;
  user_id: string | null;
  evento: string;
  detalhes: any;
  created_at: string;
}

interface AtaRow {
  id: string;
  numero_comite: number;
  realizado_em: string;
  decisao: string;
  alcada_nome: string | null;
  pleito: any;
}

interface VersionRow {
  id: string;
  versao: number;
  created_at: string;
  created_by: string;
}

type TipoArquivo = "documento" | "renovacao" | "ata" | "parecer";

interface Arquivo {
  id: string;
  tipo: TipoArquivo;
  nome: string;
  nomeOriginal?: string | null;
  categoria?: string | null;
  categoriaId?: string | null;
  data: string;
  autorId?: string | null;
  tamanhoBytes?: number | null;
  storagePath?: string | null;
  mimeType?: string | null;
  origem: "cadastro" | "anexo-livre" | "comite" | "credito" | "visita";
  status?: "aprovado" | "pendente" | "reprovado";
  // referência ao registro original
  raw: any;
}

const TIPO_LABEL: Record<TipoArquivo, string> = {
  documento: "Documento",
  renovacao: "Renovação",
  ata: "Ata",
  parecer: "Parecer",
};

const TIPO_BADGE: Record<TipoArquivo, string> = {
  documento: "border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10",
  renovacao: "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
  ata: "border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-500/10",
  parecer: "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
};

const TIPO_ICON: Record<TipoArquivo, typeof FileText> = {
  documento: FileText,
  renovacao: RotateCcw,
  ata: Gavel,
  parecer: FileCheck2,
};

const fmtCNPJ = (s: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtDateTime = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtBytes = (b: number | null | undefined) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const renovBadgeClass = (info: RenovacaoInfo) => {
  switch (info.status) {
    case "vencida":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "atencao":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "em_dia":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

function dateToSlug(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function slugify(s: string, max = 22) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function abrevCedente(razao: string) {
  return slugify(razao.split(/\s+/).slice(0, 2).join(" "), 18);
}

type SortKey = "nome" | "tipo" | "categoria" | "origem" | "status" | "tamanho" | "data" | "por";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";
type GroupBy = "nenhum" | "tipo" | "categoria";

interface ColVis {
  tipo: boolean;
  categoria: boolean;
  origem: boolean;
  status: boolean;
  tamanho: boolean;
  data: boolean;
  por: boolean;
}
const COL_DEFAULT: ColVis = {
  tipo: true,
  categoria: true,
  origem: true,
  status: true,
  tamanho: true,
  data: true,
  por: true,
};
const COL_KEY = "diretorio.colunas.v2";

function loadColPrefs(): ColVis {
  try {
    const raw = localStorage.getItem(COL_KEY);
    if (!raw) return COL_DEFAULT;
    return { ...COL_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return COL_DEFAULT;
  }
}

function fileIcon(a: Arquivo) {
  if (a.tipo !== "documento") return TIPO_ICON[a.tipo];
  const ext = getExt(a.nome);
  if ((a.mimeType ?? "").startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return FileImage;
  }
  return FileText;
}

export default function DiretorioDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [cedente, setCedente] = useState<Cedente | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [historico, setHistorico] = useState<HistoryRow[]>([]);
  const [atas, setAtas] = useState<AtaRow[]>([]);
  const [creditVersions, setCreditVersions] = useState<VersionRow[]>([]);
  const [visitVersions, setVisitVersions] = useState<VersionRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadInitialFiles, setUploadInitialFiles] = useState<File[] | null>(null);

  // ===== Filtros / UI =====
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [colVis, setColVis] = useState<ColVis>(loadColPrefs);
  const [filterTipos, setFilterTipos] = useState<Set<TipoArquivo>>(new Set());
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set());
  const [filterOrigem, setFilterOrigem] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());
  const [previewArq, setPreviewArq] = useState<Arquivo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    document.title = "Dossiê | Diretório";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COL_KEY, JSON.stringify(colVis));
    } catch {
      /* ignore */
    }
  }, [colVis]);

  const reload = async () => {
    if (!id) return;
    setLoading(true);

    const [{ data: ced }, { data: cats }, { data: docs }, { data: hist }, { data: ats }, { data: crv }, { data: vrv }] =
      await Promise.all([
        supabase
          .from("cedentes")
          .select("id,razao_social,nome_fantasia,cnpj,stage,cadastro_revisado_em,minuta_assinada_em")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("documento_categorias")
          .select("id,nome,requer_conciliacao,ordem")
          .eq("ativo", true)
          .order("ordem"),
        supabase
          .from("documentos")
          .select(
            "id,cedente_id,categoria_id,nome_arquivo,nome_arquivo_original,storage_path,mime_type,tamanho_bytes,status,created_at,uploaded_by",
          )
          .eq("cedente_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("cedente_history")
          .select("id,user_id,evento,detalhes,created_at")
          .eq("cedente_id", id)
          .eq("evento", "cadastro_revisado")
          .order("created_at", { ascending: false }),
        supabase
          .from("committee_minutes")
          .select("id,numero_comite,realizado_em,decisao,alcada_nome,pleito")
          .eq("cedente_id", id)
          .order("realizado_em", { ascending: false }),
        supabase
          .from("credit_report_versions")
          .select("id,versao,created_at,created_by")
          .eq("cedente_id", id)
          .order("versao", { ascending: false }),
        supabase
          .from("cedente_visit_report_versions")
          .select("id,versao,created_at,created_by")
          .eq("cedente_id", id)
          .order("versao", { ascending: false }),
      ]);

    setCedente((ced as Cedente) ?? null);
    setCategorias((cats as Categoria[]) ?? []);
    setDocumentos((docs as Documento[]) ?? []);
    setHistorico((hist as HistoryRow[]) ?? []);
    setAtas((ats as AtaRow[]) ?? []);
    setCreditVersions((crv as VersionRow[]) ?? []);
    setVisitVersions((vrv as VersionRow[]) ?? []);

    const userIds = new Set<string>();
    (hist ?? []).forEach((h: any) => h.user_id && userIds.add(h.user_id));
    (docs ?? []).forEach((d: any) => d.uploaded_by && userIds.add(d.uploaded_by));
    (crv ?? []).forEach((v: any) => v.created_by && userIds.add(v.created_by));
    (vrv ?? []).forEach((v: any) => v.created_by && userIds.add(v.created_by));
    if (userIds.size > 0) {
      const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", Array.from(userIds));
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p.nome));
      setProfilesById(map);
    }

    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const renovInfo = useMemo(
    () => (cedente ? computeRenovacao(cedente.cadastro_revisado_em, cedente.minuta_assinada_em) : null),
    [cedente],
  );

  const catLivre = useMemo(() => categorias.find((c) => c.requer_conciliacao === false) ?? null, [categorias]);
  const catsById = useMemo(() => {
    const m: Record<string, Categoria> = {};
    categorias.forEach((c) => (m[c.id] = c));
    return m;
  }, [categorias]);

  // ===== Mescla unificada =====
  const arquivos = useMemo<Arquivo[]>(() => {
    if (!cedente) return [];
    const abrev = abrevCedente(cedente.razao_social);
    const out: Arquivo[] = [];

    documentos.forEach((d) => {
      const cat = d.categoria_id ? catsById[d.categoria_id] : null;
      const isLivre = cat?.requer_conciliacao === false;
      out.push({
        id: `doc-${d.id}`,
        tipo: "documento",
        nome: d.nome_arquivo,
        nomeOriginal: d.nome_arquivo_original,
        categoria: cat?.nome ?? null,
        categoriaId: d.categoria_id,
        data: d.created_at,
        autorId: d.uploaded_by,
        tamanhoBytes: d.tamanho_bytes,
        storagePath: d.storage_path,
        mimeType: d.mime_type,
        origem: isLivre ? "anexo-livre" : "cadastro",
        status: d.status,
        raw: d,
      });
    });

    historico.forEach((h) => {
      out.push({
        id: `ren-${h.id}`,
        tipo: "renovacao",
        nome: `${dateToSlug(h.created_at)}_renovacao-cadastral_${abrev}`,
        data: h.created_at,
        autorId: h.user_id,
        origem: "cadastro",
        raw: h,
      });
    });

    atas.forEach((a) => {
      out.push({
        id: `ata-${a.id}`,
        tipo: "ata",
        nome: `${dateToSlug(a.realizado_em)}_ata-comite-${String(a.numero_comite).padStart(2, "0")}_${abrev}`,
        data: a.realizado_em,
        origem: "comite",
        status: a.decisao === "aprovado" ? "aprovado" : "reprovado",
        raw: a,
      });
    });

    creditVersions.forEach((v) => {
      out.push({
        id: `crv-${v.id}`,
        tipo: "parecer",
        nome: `${dateToSlug(v.created_at)}_parecer-credito_${abrev}_v${String(v.versao).padStart(2, "0")}`,
        categoria: "Crédito",
        data: v.created_at,
        autorId: v.created_by,
        origem: "credito",
        raw: v,
      });
    });

    visitVersions.forEach((v) => {
      out.push({
        id: `vrv-${v.id}`,
        tipo: "parecer",
        nome: `${dateToSlug(v.created_at)}_parecer-comercial-visita_${abrev}_v${String(v.versao).padStart(2, "0")}`,
        categoria: "Comercial",
        data: v.created_at,
        autorId: v.created_by,
        origem: "visita",
        raw: v,
      });
    });

    return out;
  }, [documentos, historico, atas, creditVersions, visitVersions, catsById, cedente]);

  const totalsByTipo = useMemo(() => {
    const t: Record<TipoArquivo, number> = { documento: 0, renovacao: 0, ata: 0, parecer: 0 };
    arquivos.forEach((a) => (t[a.tipo] += 1));
    return t;
  }, [arquivos]);

  // ===== Filtragem + ordenação =====
  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = arquivos.filter((a) => {
      if (q && !a.nome.toLowerCase().includes(q) && !(a.nomeOriginal ?? "").toLowerCase().includes(q)) return false;
      if (filterTipos.size > 0 && !filterTipos.has(a.tipo)) return false;
      if (filterCats.size > 0) {
        if (!a.categoriaId || !filterCats.has(a.categoriaId)) return false;
      }
      if (filterOrigem.size > 0 && !filterOrigem.has(a.origem)) return false;
      if (filterStatus.size > 0 && (!a.status || !filterStatus.has(a.status))) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: Arquivo, b: Arquivo) => {
      switch (sortKey) {
        case "nome":
          return a.nome.localeCompare(b.nome) * dir;
        case "tipo":
          return TIPO_LABEL[a.tipo].localeCompare(TIPO_LABEL[b.tipo]) * dir;
        case "categoria":
          return (a.categoria ?? "").localeCompare(b.categoria ?? "") * dir;
        case "origem":
          return a.origem.localeCompare(b.origem) * dir;
        case "status":
          return (a.status ?? "").localeCompare(b.status ?? "") * dir;
        case "tamanho":
          return ((a.tamanhoBytes ?? 0) - (b.tamanhoBytes ?? 0)) * dir;
        case "por": {
          const pa = a.autorId ? profilesById[a.autorId] ?? "" : "";
          const pb = b.autorId ? profilesById[b.autorId] ?? "" : "";
          return pa.localeCompare(pb) * dir;
        }
        case "data":
        default:
          return (new Date(a.data).getTime() - new Date(b.data).getTime()) * dir;
      }
    };
    return list.sort(cmp);
  }, [arquivos, search, filterTipos, filterCats, filterOrigem, filterStatus, sortKey, sortDir, profilesById]);

  const activeFilterCount = filterTipos.size + filterCats.size + filterOrigem.size + filterStatus.size;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "data" || key === "tamanho" ? "desc" : "asc");
    }
  };

  const handleDownload = async (a: Arquivo) => {
    if (a.tipo === "documento" && a.storagePath) {
      const { data, error } = await supabase.storage.from("cedente-docs").createSignedUrl(a.storagePath, 60);
      if (error || !data) {
        toast.error("Erro ao gerar link", { description: error?.message });
        return;
      }
      window.open(data.signedUrl, "_blank");
    } else if (a.tipo === "ata") {
      try {
        await downloadAtaById(a.raw.id);
      } catch (e: any) {
        toast.error("Erro ao gerar PDF", { description: e.message });
      }
    } else {
      toast.info("Abra no cedente para visualizar/baixar.");
    }
  };

  const openPreview = async (a: Arquivo) => {
    setPreviewArq(a);
    setPreviewUrl(null);
    if (a.tipo === "documento" && a.storagePath) {
      const { data, error } = await supabase.storage.from("cedente-docs").createSignedUrl(a.storagePath, 300);
      if (error || !data) {
        toast.error("Erro ao gerar preview", { description: error?.message });
        return;
      }
      setPreviewUrl(data.signedUrl);
    }
  };

  // Drag & drop
  const handleDocsDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setDragActive(true);
    }
  };
  const handleDocsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) {
      setUploadInitialFiles(files);
      setUploadOpen(true);
    }
  };

  if (loading && !cedente) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando dossiê…
      </div>
    );
  }

  if (!cedente) {
    return <div className="text-center py-20 text-muted-foreground">Cedente não encontrado.</div>;
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3 inline ml-0.5" />
      ) : (
        <ChevronDown className="h-3 w-3 inline ml-0.5" />
      )
    ) : null;

  const toggleTipoFilter = (t: TipoArquivo) => {
    setFilterTipos((s) => {
      const ns = new Set(s);
      if (ns.has(t)) ns.delete(t);
      else ns.add(t);
      return ns;
    });
  };

  return (
    <TooltipProvider>
      <PageTabs
        title="Dossiê"
        description={cedente.razao_social}
        tabs={[]}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/diretorio">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Link>
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto space-y-3">
        {/* Cabeçalho do cedente */}
        <div className="rounded-md border bg-card p-2.5 flex flex-wrap items-center gap-3">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <div className="leading-tight">
            <div className="text-[13px] font-medium text-foreground">{cedente.razao_social}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{fmtCNPJ(cedente.cnpj)}</div>
          </div>
          <Badge variant="outline" className="text-[10px] capitalize">
            {cedente.stage}
          </Badge>
          {renovInfo && (
            <Badge variant="outline" className={cn("text-[10px] border", renovBadgeClass(renovInfo))}>
              <RotateCcw className="h-2.5 w-2.5 mr-1" />
              {renovacaoLabel(renovInfo)}
            </Badge>
          )}
          <div className="ml-auto">
            <Button asChild variant="outline" size="sm">
              <Link to={`/cedentes/${cedente.id}`}>Ver cedente</Link>
            </Button>
          </div>
        </div>

        {/* Chips por tipo (clicáveis = filtro) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(TIPO_LABEL) as TipoArquivo[]).map((t) => {
            const Icon = TIPO_ICON[t];
            const active = filterTipos.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleTipoFilter(t)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 h-6 text-[11px] transition-colors",
                  active ? TIPO_BADGE[t] : "bg-card hover:bg-muted/40 text-foreground border-border",
                )}
              >
                <Icon className="h-3 w-3" />
                {TIPO_LABEL[t]}
                <span className={cn("ml-1 tabular-nums", active ? "" : "text-muted-foreground")}>
                  {totalsByTipo[t]}
                </span>
              </button>
            );
          })}
          {filterTipos.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={() => setFilterTipos(new Set())}
            >
              <X className="h-3 w-3 mr-0.5" /> limpar
            </Button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar arquivo…"
              className="pl-8 h-7 text-[12px]"
            />
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[11px]">
                <ArrowUpDown className="h-3 w-3 mr-1" /> Ordenar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-[12px]">
              <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSortKey("data"); setSortDir("desc"); }}>
                Data (mais recente)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("data"); setSortDir("asc"); }}>
                Data (mais antigo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("nome"); setSortDir("asc"); }}>
                Nome (A→Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("nome"); setSortDir("desc"); }}>
                Nome (Z→A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("tipo"); setSortDir("asc"); }}>
                Tipo (A→Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("tamanho"); setSortDir("desc"); }}>
                Tamanho (maior)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey("categoria"); setSortDir("asc"); }}>
                Categoria (A→Z)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>



          <div className="ml-auto flex items-center gap-2">
            {/* Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px] relative">
                  <Filter className="h-3 w-3 mr-1" /> Filtrar
                  {activeFilterCount > 0 && (
                    <Badge className="ml-1.5 h-4 px-1 text-[9px] bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 text-[12px] space-y-3">
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipo</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(Object.keys(TIPO_LABEL) as TipoArquivo[]).map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={filterTipos.has(t)}
                          onCheckedChange={(v) => {
                            setFilterTipos((s) => {
                              const ns = new Set(s);
                              if (v) ns.add(t); else ns.delete(t);
                              return ns;
                            });
                          }}
                        />
                        {TIPO_LABEL[t]}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Categoria</Label>
                  <div className="mt-1 max-h-40 overflow-y-auto space-y-1 pr-1">
                    {categorias.map((c) => {
                      const checked = filterCats.has(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setFilterCats((s) => {
                                const ns = new Set(s);
                                if (v) ns.add(c.id); else ns.delete(c.id);
                                return ns;
                              });
                            }}
                          />
                          <span className="truncate">{c.nome}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Origem</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(["cadastro", "anexo-livre", "comite", "credito", "visita"] as const).map((o) => (
                      <label key={o} className="flex items-center gap-1.5 cursor-pointer capitalize">
                        <Checkbox
                          checked={filterOrigem.has(o)}
                          onCheckedChange={(v) => {
                            setFilterOrigem((s) => {
                              const ns = new Set(s);
                              if (v) ns.add(o); else ns.delete(o);
                              return ns;
                            });
                          }}
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</Label>
                  <div className="mt-1 flex gap-3">
                    {(["aprovado", "pendente", "reprovado"] as const).map((s) => (
                      <label key={s} className="flex items-center gap-1.5 cursor-pointer capitalize">
                        <Checkbox
                          checked={filterStatus.has(s)}
                          onCheckedChange={(v) => {
                            setFilterStatus((cur) => {
                              const ns = new Set(cur);
                              if (v) ns.add(s); else ns.delete(s);
                              return ns;
                            });
                          }}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] w-full"
                    onClick={() => {
                      setFilterTipos(new Set());
                      setFilterCats(new Set());
                      setFilterOrigem(new Set());
                      setFilterStatus(new Set());
                    }}
                  >
                    <X className="h-3 w-3 mr-1" /> Limpar filtros
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Colunas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-[11px]">
                  <Columns3 className="h-3 w-3 mr-1" /> Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-[12px]">
                <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(COL_DEFAULT) as (keyof ColVis)[]).map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={colVis[k]}
                    onCheckedChange={(v) => setColVis((c) => ({ ...c, [k]: !!v }))}
                    className="capitalize"
                  >
                    {k}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                setUploadInitialFiles(null);
                setUploadOpen(true);
              }}
              disabled={!catLivre}
            >
              <Paperclip className="h-3 w-3 mr-1" /> Adicionar anexo livre
            </Button>
          </div>
        </div>

        {/* Drop zone wrapper */}
        <div
          onDragOver={handleDocsDragOver}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDocsDrop}
          className={cn(
            "relative rounded-md transition-colors",
            dragActive && "ring-2 ring-primary ring-offset-2 bg-primary/5",
          )}
        >
          {dragActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-md border-2 border-dashed border-primary bg-primary/10">
              <div className="text-[13px] font-medium text-primary flex items-center gap-2">
                <Upload className="h-4 w-4" /> Solte para adicionar ao dossiê
              </div>
            </div>
          )}

          {filteredSorted.length === 0 ? (
            <div className="rounded-md border bg-card p-6 text-center text-[12px] text-muted-foreground">
              {arquivos.length === 0
                ? "Sem arquivos no dossiê. Arraste arquivos aqui."
                : "Nenhum arquivo corresponde aos filtros."}
            </div>
          ) : viewMode === "grid" ? (
            <ArquivosGrid
              flat={filteredSorted}
              profilesById={profilesById}
              onOpen={openPreview}
              onDownload={handleDownload}
            />
          ) : (
            <ArquivosTable
              flat={filteredSorted}
              profilesById={profilesById}
              colVis={colVis}
              sortKey={sortKey}
              sortIcon={sortIcon}
              onSort={handleSort}
              onOpen={openPreview}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>

      {/* Preview Sheet */}
      <Sheet open={!!previewArq} onOpenChange={(v) => { if (!v) { setPreviewArq(null); setPreviewUrl(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-[14px] truncate">{previewArq?.nome}</SheetTitle>
            <SheetDescription className="text-[11px]">
              {previewArq && (
                <>
                  <Badge variant="outline" className={cn("text-[10px] border mr-1.5", TIPO_BADGE[previewArq.tipo])}>
                    {TIPO_LABEL[previewArq.tipo]}
                  </Badge>
                  {previewArq.nomeOriginal && previewArq.nomeOriginal !== previewArq.nome && (
                    <>Original: {previewArq.nomeOriginal} · </>
                  )}
                  {previewArq.tamanhoBytes ? <>{fmtBytes(previewArq.tamanhoBytes)} · </> : null}
                  {fmtDateTime(previewArq.data)}
                </>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 mt-3 min-h-0 overflow-auto">
            {previewArq?.tipo === "documento" ? (
              !previewUrl ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-[12px]">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
                </div>
              ) : (previewArq?.mimeType ?? "").startsWith("image/") ? (
                <img src={previewUrl} alt={previewArq?.nome} className="max-w-full max-h-full object-contain mx-auto" />
              ) : (previewArq?.mimeType === "application/pdf" || getExt(previewArq?.nome ?? "") === "pdf") ? (
                <iframe src={previewUrl} className="w-full h-full border rounded-md" title="preview" />
              ) : (
                <div className="text-center py-10 space-y-3">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-[12px] text-muted-foreground">Preview não disponível para este tipo de arquivo.</p>
                  <Button size="sm" onClick={() => previewArq && handleDownload(previewArq)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                  </Button>
                </div>
              )
            ) : previewArq?.tipo === "renovacao" ? (
              <div className="space-y-2 text-[12px]">
                <div className="rounded-md border bg-card p-2.5 leading-tight space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Revisão cadastral</div>
                  <div>{fmtDateTime(previewArq.data)}</div>
                  <div className="text-muted-foreground">
                    Por: {previewArq.autorId ? profilesById[previewArq.autorId] ?? "—" : "Sistema"}
                  </div>
                  {previewArq.raw?.detalhes?.observacao && (
                    <p className="pt-1.5 border-t mt-1.5">{previewArq.raw.detalhes.observacao}</p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/cedentes/${cedente.id}`}>Ver no histórico do cedente</Link>
                </Button>
              </div>
            ) : previewArq?.tipo === "ata" ? (
              <div className="space-y-2 text-[12px]">
                <div className="rounded-md border bg-card p-2.5 leading-tight space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Ata #{previewArq.raw.numero_comite}
                  </div>
                  <div>{fmtDate(previewArq.raw.realizado_em)}</div>
                  <div>
                    Decisão:{" "}
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {previewArq.raw.decisao}
                    </Badge>
                  </div>
                  {previewArq.raw.alcada_nome && (
                    <div className="text-muted-foreground">Alçada: {previewArq.raw.alcada_nome}</div>
                  )}
                  {previewArq.raw.pleito?.valor_solicitado != null && (
                    <div className="text-muted-foreground">Valor: {fmtBRL(previewArq.raw.pleito.valor_solicitado)}</div>
                  )}
                </div>
                <Button size="sm" onClick={() => previewArq && handleDownload(previewArq)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar PDF
                </Button>
              </div>
            ) : previewArq?.tipo === "parecer" ? (
              <div className="space-y-2 text-[12px]">
                <div className="rounded-md border bg-card p-2.5 leading-tight space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {previewArq.origem === "credito" ? "Parecer de crédito" : "Parecer comercial (visita)"} v{previewArq.raw.versao}
                  </div>
                  <div>{fmtDateTime(previewArq.data)}</div>
                  <div className="text-muted-foreground">
                    Por: {previewArq.autorId ? profilesById[previewArq.autorId] ?? "—" : "—"}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/cedentes/${cedente.id}`}>Abrir no cedente</Link>
                </Button>
              </div>
            ) : null}
          </div>
          {previewArq?.tipo === "documento" && previewUrl && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => previewArq && handleDownload(previewArq)}>
                <Download className="h-3.5 w-3.5 mr-1" /> Baixar
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <UploadAnexoLivreDialog
        open={uploadOpen}
        onOpenChange={(v) => {
          setUploadOpen(v);
          if (!v) setUploadInitialFiles(null);
        }}
        cedente={cedente}
        catLivre={catLivre}
        userId={user?.id ?? null}
        onUploaded={reload}
        initialFiles={uploadInitialFiles}
      />
    </TooltipProvider>
  );
}

/* ============================================================== */
/*  Tabela unificada                                              */
/* ============================================================== */

interface TableProps {
  flat: Arquivo[];
  profilesById: Record<string, string>;
  colVis: ColVis;
  sortKey: SortKey;
  sortIcon: (k: SortKey) => React.ReactNode;
  onSort: (k: SortKey) => void;
  onOpen: (a: Arquivo) => void;
  onDownload: (a: Arquivo) => void;
}

function ArquivosTable(p: TableProps) {
  const renderRow = (a: Arquivo) => {
    const Icon = fileIcon(a);
    return (
      <tr
        key={a.id}
        className="border-t hover:bg-muted/30 leading-tight cursor-pointer"
        onClick={() => p.onOpen(a)}
      >
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            {a.nomeOriginal && a.nomeOriginal !== a.nome ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate max-w-[280px]">{a.nome}</span>
                </TooltipTrigger>
                <TooltipContent className="text-[11px]">Original: {a.nomeOriginal}</TooltipContent>
              </Tooltip>
            ) : (
              <span className="truncate max-w-[280px]">{a.nome}</span>
            )}
          </div>
        </td>
        {p.colVis.tipo && (
          <td className="px-3 py-1.5">
            <Badge variant="outline" className={cn("text-[10px] border", TIPO_BADGE[a.tipo])}>
              {TIPO_LABEL[a.tipo]}
            </Badge>
          </td>
        )}
        {p.colVis.categoria && (
          <td className="px-3 py-1.5 text-muted-foreground">{a.categoria ?? "—"}</td>
        )}
        {p.colVis.origem && (
          <td className="px-3 py-1.5 text-muted-foreground capitalize">{a.origem.replace("-", " ")}</td>
        )}
        {p.colVis.status && (
          <td className="px-3 py-1.5">
            {a.status ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  a.status === "aprovado" &&
                    "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
                  a.status === "reprovado" && "border-destructive/30 text-destructive bg-destructive/10",
                  a.status === "pendente" &&
                    "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
                )}
              >
                {a.status}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
        )}
        {p.colVis.tamanho && (
          <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{fmtBytes(a.tamanhoBytes)}</td>
        )}
        {p.colVis.data && (
          <td className="px-3 py-1.5 text-muted-foreground">{fmtDate(a.data)}</td>
        )}
        {p.colVis.por && (
          <td className="px-3 py-1.5 text-muted-foreground">
            {a.autorId ? p.profilesById[a.autorId] ?? "—" : a.tipo === "renovacao" ? "Sistema" : "—"}
          </td>
        )}
        <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
          {(a.tipo === "documento" || a.tipo === "ata") && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => p.onDownload(a)}>
              <Download className="h-3 w-3" />
            </Button>
          )}
        </td>
      </tr>
    );
  };

  const colSpan =
    1 +
    Number(p.colVis.tipo) +
    Number(p.colVis.categoria) +
    Number(p.colVis.origem) +
    Number(p.colVis.status) +
    Number(p.colVis.tamanho) +
    Number(p.colVis.data) +
    Number(p.colVis.por) +
    1;

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <table className="w-full text-[12px]">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th
              className="text-left px-3 py-2 font-medium cursor-pointer select-none"
              onClick={() => p.onSort("nome")}
            >
              Arquivo {p.sortIcon("nome")}
            </th>
            {p.colVis.tipo && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("tipo")}
              >
                Tipo {p.sortIcon("tipo")}
              </th>
            )}
            {p.colVis.categoria && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("categoria")}
              >
                Categoria {p.sortIcon("categoria")}
              </th>
            )}
            {p.colVis.origem && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("origem")}
              >
                Origem {p.sortIcon("origem")}
              </th>
            )}
            {p.colVis.status && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("status")}
              >
                Status {p.sortIcon("status")}
              </th>
            )}
            {p.colVis.tamanho && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("tamanho")}
              >
                Tamanho {p.sortIcon("tamanho")}
              </th>
            )}
            {p.colVis.data && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("data")}
              >
                Data {p.sortIcon("data")}
              </th>
            )}
            {p.colVis.por && (
              <th
                className="text-left px-3 py-2 font-medium cursor-pointer select-none"
                onClick={() => p.onSort("por")}
              >
                Por {p.sortIcon("por")}
              </th>
            )}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {p.flat.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}

function FragmentGroup({
  g,
  collapsed,
  toggle,
  colSpan,
  renderRow,
}: {
  g: { key: string; label: string; items: Arquivo[] };
  collapsed: boolean;
  toggle: () => void;
  colSpan: number;
  renderRow: (a: Arquivo) => React.ReactNode;
}) {
  return (
    <>
      <tr className="bg-muted/20 cursor-pointer hover:bg-muted/40" onClick={toggle}>
        <td colSpan={colSpan} className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {collapsed ? <ChevronDown className="h-3 w-3 -rotate-90" /> : <ChevronDown className="h-3 w-3" />}
            <Folder className="h-3 w-3" />
            {g.label}
            <span className="text-muted-foreground/70">({g.items.length})</span>
          </div>
        </td>
      </tr>
      {!collapsed && g.items.map(renderRow)}
    </>
  );
}

/* ============================================================== */
/*  Grid unificado                                                */
/* ============================================================== */

function ArquivosGrid({
  groups,
  flat,
  profilesById: _profilesById,
  collapsed,
  toggleCollapse,
  onOpen,
  onDownload,
}: {
  groups: { key: string; label: string; items: Arquivo[] }[] | null;
  flat: Arquivo[];
  profilesById: Record<string, string>;
  collapsed: Set<string>;
  toggleCollapse: (k: string) => void;
  onOpen: (a: Arquivo) => void;
  onDownload: (a: Arquivo) => void;
}) {
  const renderCard = (a: Arquivo) => {
    const Icon = fileIcon(a);
    const downloadable = a.tipo === "documento" || a.tipo === "ata";
    return (
      <div
        key={a.id}
        className="group rounded-md border bg-card hover:border-primary/40 hover:shadow-sm transition cursor-pointer p-2.5 flex flex-col gap-1.5"
        onClick={() => onOpen(a)}
      >
        <div className="flex items-start justify-between">
          <Icon className="h-7 w-7 text-muted-foreground" />
          {downloadable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(a);
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="text-[11px] leading-tight line-clamp-2 break-all">{a.nome}</div>
        <div className="flex items-center gap-1 mt-auto flex-wrap">
          <Badge variant="outline" className={cn("text-[9px]", TIPO_BADGE[a.tipo])}>
            {TIPO_LABEL[a.tipo]}
          </Badge>
          {a.categoria && (
            <Badge variant="outline" className="text-[9px] truncate max-w-full">
              {a.categoria}
            </Badge>
          )}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          <span>{fmtDate(a.data)}</span>
          <span>{fmtBytes(a.tamanhoBytes)}</span>
        </div>
      </div>
    );
  };

  if (groups) {
    return (
      <div className="space-y-3">
        {groups.map((g) => {
          const isCollapsed = collapsed.has(g.key);
          return (
            <div key={g.key} className="rounded-md border bg-card">
              <button
                onClick={() => toggleCollapse(g.key)}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/40"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <Folder className="h-3 w-3" />
                {g.label}
                <span className="text-muted-foreground/70">({g.items.length})</span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-2.5 pt-0">
                  {g.items.map(renderCard)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {flat.map(renderCard)}
    </div>
  );
}

/* ============================================================== */
/*  Dialog: upload de anexo livre                                 */
/* ============================================================== */

function UploadAnexoLivreDialog({
  open,
  onOpenChange,
  cedente,
  catLivre,
  userId,
  onUploaded,
  initialFiles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedente: Cedente;
  catLivre: Categoria | null;
  userId: string | null;
  onUploaded: () => void;
  initialFiles: File[] | null;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
    } else if (!open) {
      setFiles([]);
      setObs("");
    }
  }, [open, initialFiles]);

  const handleUpload = async () => {
    if (files.length === 0 || !catLivre || !userId) return;
    setBusy(true);
    try {
      const { count: baseCount } = await supabase
        .from("documentos")
        .select("id", { count: "exact", head: true })
        .eq("cedente_id", cedente.id)
        .eq("categoria_id", catLivre.id);
      let next = (baseCount ?? 0) + 1;

      let okCount = 0;
      for (const file of files) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${cedente.id}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safe}`;

        const { error: upErr } = await supabase.storage
          .from("cedente-docs")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast.error(`Erro em ${file.name}`, { description: upErr.message });
          continue;
        }

        const novoNome = buildDocumentoFileName({
          originalName: file.name,
          categoria: catLivre.nome,
          cedente: cedente.razao_social,
          versao: next,
        });

        const { error: insErr } = await supabase.from("documentos").insert({
          cedente_id: cedente.id,
          categoria_id: catLivre.id,
          nome_arquivo: novoNome,
          nome_arquivo_original: file.name,
          storage_path: path,
          tamanho_bytes: file.size,
          mime_type: file.type || null,
          uploaded_by: userId,
          status: "aprovado",
          classificacao_status: "sugerido",
          observacoes: obs.trim() || null,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        });
        if (insErr) {
          await supabase.storage.from("cedente-docs").remove([path]);
          toast.error(`Erro em ${file.name}`, { description: insErr.message });
          continue;
        }
        next++;
        okCount++;
      }

      if (okCount > 0) toast.success(`${okCount} anexo(s) adicionado(s) ao dossiê`);
      onOpenChange(false);
      onUploaded();
    } catch (err: any) {
      toast.error("Erro ao enviar", { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[14px]">Adicionar anexo livre</DialogTitle>
          <DialogDescription className="text-[12px]">
            Arquivos enviados aqui ficam no dossiê e <b>não entram</b> na fila de conciliação do Cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] text-muted-foreground">Arquivo(s)</label>
            <Input
              ref={fileRef}
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="h-7 text-[12px]"
            />
            {files.length > 0 && (
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                {files.map((f, i) => (
                  <li key={i}>
                    {f.name} · {(f.size / 1024).toFixed(1)} KB
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Observação (opcional)</label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Ex.: anexo enviado pelo cedente em 11/05"
              rows={3}
              className="text-[12px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={files.length === 0 || busy || !catLivre}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
