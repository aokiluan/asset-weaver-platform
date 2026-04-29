import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Download, Trash2, CheckCircle2, XCircle, Pencil, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CedenteFormDialog, CedenteFormValues } from "@/components/cedentes/CedenteFormDialog";

import { CedenteVisitReportForm } from "@/components/cedentes/CedenteVisitReportForm";
import { CedenteStage, STAGE_LABEL } from "@/lib/cedente-stages";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Cedente {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  setor: string | null;
  faturamento_medio: number | null;
  status: "prospect" | "em_analise" | "aprovado" | "reprovado" | "inativo";
  stage: CedenteStage;
  limite_aprovado: number | null;
  observacoes: string | null;
  owner_id: string | null;
  lead_id: string | null;
}

interface Categoria { id: string; nome: string; obrigatorio: boolean; ordem: number }

interface Documento {
  id: string;
  cedente_id: string;
  categoria_id: string | null;
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

interface HistoryRow {
  id: string;
  evento: string;
  stage_anterior: CedenteStage | null;
  stage_novo: CedenteStage | null;
  created_at: string;
  user_id: string | null;
}

const DOC_VARIANT: Record<Documento["status"], "default" | "secondary" | "destructive"> = {
  pendente: "secondary", aprovado: "default", reprovado: "destructive",
};

const fmtBytes = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const fmtBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CedenteDetail() {
  const { id } = useParams<{ id: string }>();
  const [cedente, setCedente] = useState<Cedente | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [hasVisitReport, setHasVisitReport] = useState(false);
  
  const [hasParecer, setHasParecer] = useState(false);
  const [comiteDecidido, setComiteDecidido] = useState(false);
  const [minutaAssinada, setMinutaAssinada] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  
  const [categoriaUpload, setCategoriaUpload] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: ced, error: e1 }, { data: cats }, { data: docs }, { data: visit }, { data: props }, { data: hist }] =
      await Promise.all([
        supabase.from("cedentes").select("*").eq("id", id).maybeSingle(),
        supabase.from("documento_categorias").select("id,nome,obrigatorio,ordem").eq("ativo", true).order("ordem"),
        supabase.from("documentos").select("*").eq("cedente_id", id).order("created_at", { ascending: false }),
        supabase.from("cedente_visit_reports").select("id").eq("cedente_id", id).maybeSingle(),
        supabase.from("credit_proposals").select("id,stage").eq("cedente_id", id),
        supabase.from("cedente_history").select("*").eq("cedente_id", id).order("created_at", { ascending: false }),
      ]);
    setLoading(false);
    if (e1) { toast.error("Erro ao carregar", { description: e1.message }); return; }
    setCedente(ced as Cedente);
    setCategorias(cats ?? []);
    setDocumentos((docs as Documento[]) ?? []);
    setHasVisitReport(!!visit);
    const propsList = (props ?? []) as { id: string; stage: string }[];
    
    setHasParecer(propsList.some((p) => ["parecer", "comite", "aprovado"].includes(p.stage)));
    setComiteDecidido(propsList.some((p) => p.stage === "aprovado"));
    setMinutaAssinada(!!(ced as any)?.minuta_assinada);
    setHistory((hist as HistoryRow[]) ?? []);
  };

  useEffect(() => { load(); }, [id]);

  const handleUploadClick = () => {
    if (!categoriaUpload) { toast.error("Selecione a categoria do documento antes de enviar."); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cedente) return;
    e.target.value = "";
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Não autenticado");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${cedente.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("cedente-docs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("documentos").insert({
        cedente_id: cedente.id, categoria_id: categoriaUpload || null, nome_arquivo: file.name,
        storage_path: path, tamanho_bytes: file.size, mime_type: file.type || null, uploaded_by: auth.user.id,
      });
      if (insErr) { await supabase.storage.from("cedente-docs").remove([path]); throw insErr; }
      toast.success("Documento enviado");
      setCategoriaUpload(""); load();
    } catch (err: any) {
      toast.error("Erro no upload", { description: err.message });
    } finally { setUploading(false); }
  };

  const handleDownload = async (doc: Documento) => {
    const { data, error } = await supabase.storage.from("cedente-docs").createSignedUrl(doc.storage_path, 60);
    if (error || !data) { toast.error("Erro ao gerar link", { description: error?.message }); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Documento) => {
    const { error: e1 } = await supabase.storage.from("cedente-docs").remove([doc.storage_path]);
    if (e1) { toast.error("Erro ao remover arquivo", { description: e1.message }); return; }
    const { error: e2 } = await supabase.from("documentos").delete().eq("id", doc.id);
    if (e2) { toast.error("Erro ao remover registro", { description: e2.message }); return; }
    toast.success("Documento removido"); load();
  };

  const handleReview = async (doc: Documento, status: "aprovado" | "reprovado") => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("documentos").update({
      status, reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", doc.id);
    if (error) { toast.error("Erro ao revisar", { description: error.message }); return; }
    toast.success(status === "aprovado" ? "Documento aprovado" : "Documento reprovado");
    load();
  };


  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...</div>;
  }
  if (!cedente) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost"><Link to="/cedentes"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
        <p className="text-muted-foreground">Cedente não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm"><Link to="/cedentes"><ArrowLeft className="h-4 w-4 mr-2" /> Cedentes</Link></Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" /> Editar dados</Button>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{cedente.razao_social}</h1>
            {cedente.nome_fantasia && <p className="text-sm text-muted-foreground">{cedente.nome_fantasia}</p>}
            <p className="text-sm text-muted-foreground font-mono mt-1">CNPJ: {cedente.cnpj}</p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1">{STAGE_LABEL[cedente.stage]}</Badge>
        </div>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="visita">Relatório comercial</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-muted-foreground">E-mail</div><div>{cedente.email ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Telefone</div><div>{cedente.telefone ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Setor</div><div>{cedente.setor ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Cidade/UF</div><div>{[cedente.cidade, cedente.estado].filter(Boolean).join(" / ") || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Faturamento médio</div><div>{fmtBRL(cedente.faturamento_medio)}</div></div>
              <div><div className="text-xs text-muted-foreground">Limite aprovado</div><div className="font-semibold">{fmtBRL(cedente.limite_aprovado)}</div></div>
            </div>
            {cedente.observacoes && (
              <div className="text-sm pt-4 mt-4 border-t">
                <div className="text-xs text-muted-foreground mb-1">Observações</div>
                <p className="whitespace-pre-wrap">{cedente.observacoes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Documentos</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 p-4 rounded-md border bg-muted/30">
              <div className="flex-1 min-w-[240px]">
                <Select value={categoriaUpload} onValueChange={setCategoriaUpload}>
                  <SelectTrigger><SelectValue placeholder="Categoria do documento..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}{c.obrigatorio && <span className="text-destructive ml-1">*</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <Button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Enviar arquivo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {categorias.filter(c => c.obrigatorio).map(c => {
                const docs = documentos.filter(d => d.categoria_id === c.id);
                const aprovado = docs.some(d => d.status === "aprovado");
                const tem = docs.length > 0;
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm rounded-md border px-3 py-2">
                    <span>{c.nome}</span>
                    {aprovado ? <Badge variant="default">OK</Badge>
                      : tem ? <Badge variant="secondary">Pendente</Badge>
                      : <Badge variant="outline">Faltando</Badge>}
                  </div>
                );
              })}
            </div>

            <Table>
              <TableHeader><TableRow>
                <TableHead>Arquivo</TableHead><TableHead>Categoria</TableHead>
                <TableHead>Tamanho</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {documentos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum documento enviado.</TableCell></TableRow>
                )}
                {documentos.map(d => {
                  const cat = categorias.find(c => c.id === d.categoria_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.nome_arquivo}</TableCell>
                      <TableCell>{cat?.nome ?? "—"}</TableCell>
                      <TableCell>{fmtBytes(d.tamanho_bytes)}</TableCell>
                      <TableCell><Badge variant={DOC_VARIANT[d.status]}>{d.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleDownload(d)} title="Baixar"><Download className="h-4 w-4" /></Button>
                          {d.status !== "aprovado" && (
                            <Button size="icon" variant="ghost" onClick={() => handleReview(d, "aprovado")} title="Aprovar"><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                          )}
                          {d.status !== "reprovado" && (
                            <Button size="icon" variant="ghost" onClick={() => handleReview(d, "reprovado")} title="Reprovar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Remover"><Trash2 className="h-4 w-4" /></Button>
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="visita" className="mt-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Relatório comercial</h2>
              <p className="text-sm text-muted-foreground">Inclui dados da visita, do negócio e o pleito de crédito.</p>
            </div>
            <CedenteVisitReportForm cedenteId={cedente.id} onSaved={load} />
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Histórico de estágios</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {history.map(h => (
                  <li key={h.id} className="flex gap-3 border-l-2 border-primary pl-3">
                    <div>
                      <div className="font-medium">
                        {h.evento === "criado"
                          ? <>Criado em <span className="text-primary">{STAGE_LABEL[h.stage_novo!]}</span></>
                          : <>{STAGE_LABEL[h.stage_anterior!]} → <span className="text-primary">{STAGE_LABEL[h.stage_novo!]}</span></>}
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CedenteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={cedente as unknown as CedenteFormValues}
        onSaved={load}
      />
    </div>
  );
}
