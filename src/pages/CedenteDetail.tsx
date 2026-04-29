import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CedenteFormDialog, CedenteFormValues } from "@/components/cedentes/CedenteFormDialog";

import { CedenteVisitReportForm } from "@/components/cedentes/CedenteVisitReportForm";
import { CedenteRepresentantesTab } from "@/components/cedentes/CedenteRepresentantesTab";
import { DocumentosUploadKanban } from "@/components/cedentes/DocumentosUploadKanban";
import { CedenteStage, STAGE_LABEL } from "@/lib/cedente-stages";

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
  representantes_sincronizado_em: string | null;
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
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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
    if ((ced as Cedente)?.owner_id) {
      const { data: prof } = await supabase.from("profiles").select("nome").eq("id", (ced as Cedente).owner_id!).maybeSingle();
      setOwnerName(prof?.nome ?? null);
    } else {
      setOwnerName(null);
    }
  };

  useEffect(() => { load(); }, [id]);

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
          <TabsTrigger value="representantes">Representantes legais</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="visita">Relatório comercial</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <div className="rounded-lg border bg-card p-6 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identificação</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><div className="text-xs text-muted-foreground">Razão social</div><div>{cedente.razao_social}</div></div>
                <div><div className="text-xs text-muted-foreground">Nome fantasia</div><div>{cedente.nome_fantasia ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">CNPJ</div><div className="font-mono">{cedente.cnpj}</div></div>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contato</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><div className="text-xs text-muted-foreground">E-mail</div><div>{cedente.email ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Telefone</div><div>{cedente.telefone ?? "—"}</div></div>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Endereço</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Endereço</div><div>{cedente.endereco ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Cidade</div><div>{cedente.cidade ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">UF</div><div>{cedente.estado ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">CEP</div><div>{cedente.cep ?? "—"}</div></div>
              </div>
            </section>

            <section className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comercial</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-xs text-muted-foreground">Setor</div><div>{cedente.setor ?? "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Faturamento médio</div><div>{fmtBRL(cedente.faturamento_medio)}</div></div>
                <div><div className="text-xs text-muted-foreground">Status</div><div className="capitalize">{cedente.status.replace("_", " ")}</div></div>
                <div><div className="text-xs text-muted-foreground">Limite aprovado</div><div className="font-semibold">{fmtBRL(cedente.limite_aprovado)}</div></div>
                <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Responsável comercial</div><div>{ownerName ?? "—"}</div></div>
              </div>
            </section>

            {cedente.observacoes && (
              <section className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{cedente.observacoes}</p>
              </section>
            )}
          </div>
        </TabsContent>

        <TabsContent value="representantes" className="mt-4">
          <CedenteRepresentantesTab
            cedenteId={cedente.id}
            jaSincronizado={!!cedente.representantes_sincronizado_em}
            onSynced={load}
          />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Documentos</h2>
            </div>
            <DocumentosUploadKanban
              cedenteId={cedente.id}
              categorias={categorias}
              documentos={documentos as any}
              onChanged={load}
            />
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
