import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTabs } from "@/components/PageTabs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Paperclip,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeRenovacao,
  renovacaoLabel,
  type RenovacaoInfo,
} from "@/lib/cadastro-renovacao";
import { downloadAtaById } from "@/lib/comite-ata-pdf";

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

const fmtBytes = (b: number | null) => {
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

  useEffect(() => {
    document.title = "Dossiê | Diretório";
  }, []);

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
          .select("id,cedente_id,categoria_id,nome_arquivo,storage_path,mime_type,tamanho_bytes,status,created_at,uploaded_by")
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

    // Carrega nomes dos usuários referenciados
    const userIds = new Set<string>();
    (hist ?? []).forEach((h: any) => h.user_id && userIds.add(h.user_id));
    (docs ?? []).forEach((d: any) => d.uploaded_by && userIds.add(d.uploaded_by));
    (crv ?? []).forEach((v: any) => v.created_by && userIds.add(v.created_by));
    (vrv ?? []).forEach((v: any) => v.created_by && userIds.add(v.created_by));
    if (userIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,nome")
        .in("id", Array.from(userIds));
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
    () =>
      cedente
        ? computeRenovacao(cedente.cadastro_revisado_em, cedente.minuta_assinada_em)
        : null,
    [cedente],
  );

  const catLivreId = useMemo(
    () => categorias.find((c) => c.requer_conciliacao === false)?.id ?? null,
    [categorias],
  );
  const catsById = useMemo(() => {
    const m: Record<string, Categoria> = {};
    categorias.forEach((c) => (m[c.id] = c));
    return m;
  }, [categorias]);

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("cedente-docs")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      toast.error("Erro ao gerar link", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (loading && !cedente) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando dossiê…
      </div>
    );
  }

  if (!cedente) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Cedente não encontrado.
      </div>
    );
  }

  return (
    <>
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
            <div className="text-[11px] text-muted-foreground font-mono">
              {fmtCNPJ(cedente.cnpj)}
            </div>
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

        <Tabs defaultValue="documentos" className="space-y-3">
          <TabsList className="h-8">
            <TabsTrigger value="documentos" className="text-[12px]">
              Documentos · {documentos.length}
            </TabsTrigger>
            <TabsTrigger value="renovacoes" className="text-[12px]">
              Renovações · {historico.length}
            </TabsTrigger>
            <TabsTrigger value="atas" className="text-[12px]">
              Atas · {atas.length}
            </TabsTrigger>
            <TabsTrigger value="pareceres" className="text-[12px]">
              Pareceres · {creditVersions.length + visitVersions.length}
            </TabsTrigger>
          </TabsList>

          {/* === DOCUMENTOS === */}
          <TabsContent value="documentos" className="space-y-3">
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                disabled={!catLivreId}
              >
                <Paperclip className="h-3.5 w-3.5 mr-1" /> Adicionar anexo livre
              </Button>
            </div>

            {documentos.length === 0 ? (
              <div className="rounded-md border bg-card p-6 text-center text-[12px] text-muted-foreground">
                Sem documentos anexados.
              </div>
            ) : (
              <div className="rounded-md border bg-card overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Arquivo</th>
                      <th className="text-left px-3 py-2 font-medium">Categoria</th>
                      <th className="text-left px-3 py-2 font-medium">Origem</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Tamanho</th>
                      <th className="text-left px-3 py-2 font-medium">Data</th>
                      <th className="text-left px-3 py-2 font-medium">Por</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((d) => {
                      const cat = d.categoria_id ? catsById[d.categoria_id] : null;
                      const isLivre = cat?.requer_conciliacao === false;
                      return (
                        <tr key={d.id} className="border-t hover:bg-muted/30 leading-tight">
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[280px]">{d.nome_arquivo}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {cat?.nome ?? "Sem categoria"}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                isLivre
                                  ? "border-blue-500/30 text-blue-700 dark:text-blue-400 bg-blue-500/10"
                                  : "",
                              )}
                            >
                              {isLivre ? "Anexo livre" : "Cadastro"}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                d.status === "aprovado" &&
                                  "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
                                d.status === "reprovado" &&
                                  "border-destructive/30 text-destructive bg-destructive/10",
                                d.status === "pendente" &&
                                  "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10",
                              )}
                            >
                              {d.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground tabular-nums">
                            {fmtBytes(d.tamanho_bytes)}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {fmtDate(d.created_at)}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {profilesById[d.uploaded_by] ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleDownload(d.storage_path)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* === RENOVAÇÕES === */}
          <TabsContent value="renovacoes" className="space-y-3">
            {renovInfo && (
              <div className="rounded-md border bg-card p-2.5 flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Estado atual:</span>
                <Badge variant="outline" className={cn("text-[10px] border", renovBadgeClass(renovInfo))}>
                  {renovacaoLabel(renovInfo)}
                </Badge>
                {renovInfo.proximaEm && (
                  <span className="text-[11px] text-muted-foreground ml-2">
                    Próxima revisão: {fmtDate(renovInfo.proximaEm.toISOString())}
                  </span>
                )}
              </div>
            )}

            {historico.length === 0 ? (
              <div className="rounded-md border bg-card p-6 text-center text-[12px] text-muted-foreground">
                Sem revisões cadastrais registradas.
              </div>
            ) : (
              <div className="rounded-md border bg-card divide-y">
                {historico.map((h) => (
                  <div key={h.id} className="p-2.5 leading-tight">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        Revisão cadastral
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDateTime(h.created_at)}
                      </span>
                      <span className="text-[11px] text-muted-foreground ml-auto">
                        {h.user_id ? profilesById[h.user_id] ?? "—" : "Sistema"}
                      </span>
                    </div>
                    {h.detalhes?.observacao && (
                      <p className="text-[12px] text-foreground mt-1.5">{h.detalhes.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* === ATAS === */}
          <TabsContent value="atas" className="space-y-3">
            {atas.length === 0 ? (
              <div className="rounded-md border bg-card p-6 text-center text-[12px] text-muted-foreground">
                Sem atas de comitê para este cedente.
              </div>
            ) : (
              <div className="rounded-md border bg-card overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Comitê</th>
                      <th className="text-left px-3 py-2 font-medium">Data</th>
                      <th className="text-left px-3 py-2 font-medium">Decisão</th>
                      <th className="text-right px-3 py-2 font-medium">Valor</th>
                      <th className="text-left px-3 py-2 font-medium">Alçada</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atas.map((a) => {
                      const valor = a.pleito?.valor_solicitado ?? null;
                      const isAprovado = a.decisao === "aprovado";
                      return (
                        <tr key={a.id} className="border-t hover:bg-muted/30 leading-tight">
                          <td className="px-3 py-1.5 font-mono">#{a.numero_comite}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {fmtDate(a.realizado_em)}
                          </td>
                          <td className="px-3 py-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] capitalize",
                                isAprovado
                                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                                  : "border-destructive/30 text-destructive bg-destructive/10",
                              )}
                            >
                              {a.decisao}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(valor)}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {a.alcada_nome ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px]"
                              onClick={() => downloadAtaById(a.id).catch((e) =>
                                toast.error("Erro ao gerar PDF", { description: e.message }),
                              )}
                            >
                              <Download className="h-3 w-3 mr-1" /> PDF
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* === PARECERES === */}
          <TabsContent value="pareceres" className="space-y-4">
            <section className="space-y-1.5">
              <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Relatórios de crédito ({creditVersions.length})
              </h3>
              {creditVersions.length === 0 ? (
                <div className="rounded-md border bg-card p-3 text-[12px] text-muted-foreground">
                  Nenhuma versão de relatório de crédito.
                </div>
              ) : (
                <div className="rounded-md border bg-card divide-y">
                  {creditVersions.map((v) => (
                    <div key={v.id} className="p-2 flex items-center gap-3 leading-tight">
                      <Badge variant="outline" className="text-[10px]">v{v.versao}</Badge>
                      <span className="text-[11px] text-muted-foreground">{fmtDateTime(v.created_at)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {profilesById[v.created_by] ?? "—"}
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] ml-auto"
                      >
                        <Link to={`/cedentes/${cedente.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-1.5">
              <h3 className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Pareceres comerciais — visitas ({visitVersions.length})
              </h3>
              {visitVersions.length === 0 ? (
                <div className="rounded-md border bg-card p-3 text-[12px] text-muted-foreground">
                  Nenhuma versão de relatório de visita.
                </div>
              ) : (
                <div className="rounded-md border bg-card divide-y">
                  {visitVersions.map((v) => (
                    <div key={v.id} className="p-2 flex items-center gap-3 leading-tight">
                      <Badge variant="outline" className="text-[10px]">v{v.versao}</Badge>
                      <span className="text-[11px] text-muted-foreground">{fmtDateTime(v.created_at)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {profilesById[v.created_by] ?? "—"}
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] ml-auto"
                      >
                        <Link to={`/cedentes/${cedente.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <UploadAnexoLivreDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        cedenteId={cedente.id}
        catLivreId={catLivreId}
        userId={user?.id ?? null}
        onUploaded={reload}
      />
    </>
  );
}

/* ============================================================== */
/*  Dialog: upload de anexo livre (categoria sem conciliação)     */
/* ============================================================== */

function UploadAnexoLivreDialog({
  open,
  onOpenChange,
  cedenteId,
  catLivreId,
  userId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cedenteId: string;
  catLivreId: string | null;
  userId: string | null;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setObs("");
    }
  }, [open]);

  const handleUpload = async () => {
    if (!file || !catLivreId || !userId) return;
    setBusy(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${cedenteId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safe}`;

      const { error: upErr } = await supabase.storage
        .from("cedente-docs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("documentos").insert({
        cedente_id: cedenteId,
        categoria_id: catLivreId,
        nome_arquivo: file.name,
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
        throw insErr;
      }
      toast.success("Anexo adicionado ao dossiê");
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
            Arquivos enviados aqui ficam no dossiê do cedente e <b>não entram</b> na fila de
            conciliação do Cadastro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] text-muted-foreground">Arquivo</label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-7 text-[12px]"
            />
            {file && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
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
          <Button size="sm" onClick={handleUpload} disabled={!file || busy || !catLivreId}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
