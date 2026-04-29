import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, History, Building2, FileText, Vote } from "lucide-react";
import { toast } from "sonner";
import { CreditReportForm } from "@/components/credito/CreditReportForm";
import { ComiteGameSession } from "@/components/credito/ComiteGameSession";

type Stage = "rascunho" | "analise" | "parecer" | "comite" | "aprovado" | "reprovado" | "cancelado";
type ApproverKind = "analista_credito" | "gestor_risco" | "comite";

interface Proposal {
  id: string; codigo: string; cedente_id: string;
  valor_solicitado: number; prazo_dias: number | null; taxa_sugerida: number | null;
  finalidade: string | null; garantias: string | null; observacoes: string | null;
  stage: Stage; valor_aprovado: number | null; decisao_observacao: string | null;
  decided_at: string | null; decided_by: string | null; created_at: string;
  approval_level_id: string | null;
  cedentes: { razao_social: string; cnpj: string } | null;
  approval_levels: { nome: string; approver: ApproverKind; votos_minimos: number; valor_min: number; valor_max: number | null } | null;
}

interface HistoryItem {
  id: string; user_id: string | null; evento: string;
  stage_anterior: Stage | null; stage_novo: Stage | null;
  detalhes: any; created_at: string;
}

const STAGE_LABEL: Record<Stage, string> = {
  rascunho: "Rascunho", analise: "Análise", parecer: "Parecer", comite: "Comitê",
  aprovado: "Aprovado", reprovado: "Reprovado", cancelado: "Cancelado",
};
const STAGE_VARIANT: Record<Stage, "default" | "secondary" | "destructive" | "outline"> = {
  rascunho: "outline", analise: "secondary", parecer: "secondary", comite: "secondary",
  aprovado: "default", reprovado: "destructive", cancelado: "outline",
};
const STAGES_ORDER: Stage[] = ["analise", "parecer", "comite", "aprovado"];

const fmtBRL = (v: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function CreditoDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reportCompletude, setReportCompletude] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [savingDecision, setSavingDecision] = useState(false);
  const [valorAprovado, setValorAprovado] = useState<string>("");
  const [decisaoObs, setDecisaoObs] = useState<string>("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p, error }, { data: hist }, { data: rep }] = await Promise.all([
      supabase.from("credit_proposals")
        .select("*,cedentes(razao_social,cnpj),approval_levels(nome,approver,votos_minimos,valor_min,valor_max)")
        .eq("id", id).maybeSingle(),
      supabase.from("proposal_history").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
      supabase.from("credit_reports").select("completude").eq("proposal_id", id).maybeSingle(),
    ]);
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setProposal(p as Proposal);
    setHistory((hist as HistoryItem[]) ?? []);
    setReportCompletude(rep?.completude ?? 0);
    if (p?.valor_aprovado) setValorAprovado(String(p.valor_aprovado));
  };

  useEffect(() => { load(); }, [id]);

  // Realtime: ao salvar relatório, atualiza completude
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`report-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "credit_reports", filter: `proposal_id=eq.${id}` },
        (payload: any) => setReportCompletude(payload.new?.completude ?? 0))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const canDecide = hasRole("admin") || hasRole("analista_credito") || hasRole("gestor_risco") || hasRole("comite") || hasRole("gestor_credito");

  const isComite = proposal?.approval_levels?.approver === "comite";
  const votosMinimos = proposal?.approval_levels?.votos_minimos ?? 1;

  const advance = async (toStage: Stage) => {
    if (!proposal) return;
    if (toStage === "comite" && reportCompletude < 8) {
      toast.error("Complete as 8 seções do relatório antes de enviar ao comitê");
      return;
    }
    setSavingDecision(true);
    const { error } = await supabase.from("credit_proposals").update({ stage: toStage }).eq("id", proposal.id);
    setSavingDecision(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success(`Movido para ${STAGE_LABEL[toStage]}`);
    load();
  };

  const decidir = async (status: "aprovado" | "reprovado") => {
    if (!proposal) return;
    if (status === "aprovado" && (!valorAprovado || Number(valorAprovado) <= 0)) {
      toast.error("Informe o valor aprovado"); return;
    }
    setSavingDecision(true);
    const { error } = await supabase.from("credit_proposals").update({
      stage: status,
      valor_aprovado: status === "aprovado" ? Number(valorAprovado) : null,
      decisao_observacao: decisaoObs || null,
      decided_at: new Date().toISOString(),
      decided_by: user?.id,
    }).eq("id", proposal.id);
    setSavingDecision(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success(status === "aprovado" ? "Proposta aprovada" : "Proposta reprovada");
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...</div>;
  if (!proposal) return (
    <div className="space-y-4">
      <Button asChild variant="ghost"><Link to="/credito"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
      <p className="text-muted-foreground">Proposta não encontrada.</p>
    </div>
  );

  const finalStage = ["aprovado", "reprovado", "cancelado"].includes(proposal.stage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm"><Link to="/credito"><ArrowLeft className="h-4 w-4 mr-2" /> Esteira de Crédito</Link></Button>
        <Badge variant={STAGE_VARIANT[proposal.stage]} className="text-sm px-3 py-1">{STAGE_LABEL[proposal.stage]}</Badge>
      </div>

      {/* Cabeçalho */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{proposal.codigo}</p>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5" /> {proposal.cedentes?.razao_social}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">CNPJ: {proposal.cedentes?.cnpj}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/cedentes/${proposal.cedente_id}`}>Abrir cedente</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t">
          <div><div className="text-xs text-muted-foreground">Solicitado</div><div className="font-semibold">{fmtBRL(proposal.valor_solicitado)}</div></div>
          <div><div className="text-xs text-muted-foreground">Prazo</div><div>{proposal.prazo_dias ? `${proposal.prazo_dias} dias` : "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Taxa sugerida</div><div>{proposal.taxa_sugerida != null ? `${proposal.taxa_sugerida}% a.m.` : "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Aprovado</div><div className="font-semibold">{fmtBRL(proposal.valor_aprovado)}</div></div>
        </div>

        {proposal.approval_levels && (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
            <div className="font-medium">Alçada: {proposal.approval_levels.nome}</div>
            <div className="text-xs text-muted-foreground">
              Faixa: {fmtBRL(proposal.approval_levels.valor_min)} a {proposal.approval_levels.valor_max ? fmtBRL(proposal.approval_levels.valor_max) : "ilimitado"} •
              Aprovador: <strong>{proposal.approval_levels.approver}</strong>
              {isComite && <> • Mínimo de <strong>{votosMinimos}</strong> voto(s) favoráveis</>}
            </div>
          </div>
        )}
      </div>

      {/* Esteira + ações de transição */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          {STAGES_ORDER.map((s, i) => {
            const idx = STAGES_ORDER.indexOf(proposal.stage as Stage);
            const reached = i <= idx || proposal.stage === "aprovado";
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`px-3 py-1.5 rounded-md text-xs font-medium ${reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}. {STAGE_LABEL[s]}
                </div>
                {i < STAGES_ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            );
          })}
        </div>

        {!finalStage && canDecide && (
          <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t">
            {proposal.stage === "analise" && (
              <Button size="sm" onClick={() => advance("parecer")} disabled={savingDecision}>
                <Send className="h-4 w-4 mr-2" /> Enviar para Parecer
              </Button>
            )}
            {proposal.stage === "parecer" && isComite && (
              <Button size="sm" onClick={() => advance("comite")} disabled={savingDecision || reportCompletude < 8}>
                <Send className="h-4 w-4 mr-2" /> Enviar para Comitê {reportCompletude < 8 && `(${reportCompletude}/8 seções)`}
              </Button>
            )}
            {proposal.stage === "parecer" && !isComite && (
              <p className="text-xs text-muted-foreground py-1">Esta alçada não exige comitê — decida abaixo.</p>
            )}
          </div>
        )}
      </div>

      {/* Decisão final */}
      {!finalStage && canDecide && (
        (proposal.stage === "parecer" && !isComite) ||
        (proposal.stage === "comite" && isComite)
      ) && (
        <div className="rounded-lg border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">Decisão final</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Valor aprovado (R$)</Label>
              <Input type="number" step="0.01" value={valorAprovado} onChange={(e) => setValorAprovado(e.target.value)} placeholder={String(proposal.valor_solicitado)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observação da decisão</Label>
              <Input value={decisaoObs} onChange={(e) => setDecisaoObs(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => decidir("aprovado")} disabled={savingDecision}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
            </Button>
            <Button variant="destructive" onClick={() => decidir("reprovado")} disabled={savingDecision}>
              <XCircle className="h-4 w-4 mr-2" /> Reprovar
            </Button>
          </div>
        </div>
      )}

      {finalStage && proposal.decisao_observacao && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="text-xs text-muted-foreground">Observação da decisão ({fmtDate(proposal.decided_at)})</div>
          <p className="whitespace-pre-wrap">{proposal.decisao_observacao}</p>
        </div>
      )}

      {/* Abas: Relatório / Comitê / Histórico */}
      <Tabs defaultValue="relatorio" className="w-full">
        <TabsList>
          <TabsTrigger value="relatorio"><FileText className="h-4 w-4 mr-2" /> Relatório de crédito</TabsTrigger>
          {isComite && <TabsTrigger value="comite"><Vote className="h-4 w-4 mr-2" /> Comitê</TabsTrigger>}
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="relatorio" className="mt-4">
          <CreditReportForm proposalId={proposal.id} cedenteId={proposal.cedente_id} />
        </TabsContent>

        {isComite && (
          <TabsContent value="comite" className="mt-4">
            <ComiteGameSession proposalId={proposal.id} votosMinimos={votosMinimos} proposalStage={proposal.stage} />
          </TabsContent>
        )}

        <TabsContent value="historico" className="mt-4">
          <div className="rounded-lg border bg-card p-6 space-y-3">
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="text-sm flex justify-between border-b pb-2 last:border-0">
                  <div>
                    <span className="font-medium">{h.evento}</span>
                    {h.stage_anterior && h.stage_novo && (
                      <span className="text-muted-foreground"> — {STAGE_LABEL[h.stage_anterior]} → {STAGE_LABEL[h.stage_novo]}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtDate(h.created_at)}</span>
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
