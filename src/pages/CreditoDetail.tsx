import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Send, FileSignature, Vote, History, Building2 } from "lucide-react";
import { toast } from "sonner";

type Stage = "rascunho" | "analise" | "parecer" | "comite" | "aprovado" | "reprovado" | "cancelado";
type Recommendation = "favoravel" | "favoravel_com_ressalva" | "desfavoravel";
type VoteDecision = "favoravel" | "desfavoravel" | "abstencao";
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

interface Opinion {
  id: string; author_id: string; author_role: string;
  recomendacao: Recommendation; score: number | null;
  pontos_fortes: string | null; pontos_atencao: string | null; parecer: string;
  created_at: string;
}

interface Vote {
  id: string; voter_id: string; decisao: VoteDecision; justificativa: string | null; created_at: string;
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
const REC_LABEL: Record<Recommendation, string> = {
  favoravel: "Favorável", favoravel_com_ressalva: "Favorável c/ ressalva", desfavoravel: "Desfavorável",
};
const VOTE_LABEL: Record<VoteDecision, string> = {
  favoravel: "Favorável", desfavoravel: "Desfavorável", abstencao: "Abstenção",
};
const STAGES_ORDER: Stage[] = ["analise", "parecer", "comite", "aprovado"];

const fmtBRL = (v: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function CreditoDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, hasRole } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDecision, setSavingDecision] = useState(false);
  const [valorAprovado, setValorAprovado] = useState<string>("");
  const [decisaoObs, setDecisaoObs] = useState<string>("");

  // form parecer
  const [opRec, setOpRec] = useState<Recommendation>("favoravel");
  const [opScore, setOpScore] = useState<string>("");
  const [opFortes, setOpFortes] = useState<string>("");
  const [opAtencao, setOpAtencao] = useState<string>("");
  const [opTexto, setOpTexto] = useState<string>("");
  const [savingOp, setSavingOp] = useState(false);

  // form voto
  const [voteDec, setVoteDec] = useState<VoteDecision>("favoravel");
  const [voteJust, setVoteJust] = useState<string>("");
  const [savingVote, setSavingVote] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: p, error }, { data: ops }, { data: vs }, { data: hist }] = await Promise.all([
      supabase.from("credit_proposals")
        .select("*,cedentes(razao_social,cnpj),approval_levels(nome,approver,votos_minimos,valor_min,valor_max)")
        .eq("id", id).maybeSingle(),
      supabase.from("credit_opinions").select("*").eq("proposal_id", id).order("created_at"),
      supabase.from("committee_votes").select("*").eq("proposal_id", id).order("created_at"),
      supabase.from("proposal_history").select("*").eq("proposal_id", id).order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    setProposal(p as Proposal);
    setOpinions((ops as Opinion[]) ?? []);
    setVotes((vs as Vote[]) ?? []);
    setHistory((hist as HistoryItem[]) ?? []);
    if (p?.valor_aprovado) setValorAprovado(String(p.valor_aprovado));
  };

  useEffect(() => { load(); }, [id]);

  // Carrega o próprio parecer no formulário se já existir
  useEffect(() => {
    if (!user) return;
    const own = opinions.find(o => o.author_id === user.id);
    if (own) {
      setOpRec(own.recomendacao); setOpScore(own.score?.toString() ?? "");
      setOpFortes(own.pontos_fortes ?? ""); setOpAtencao(own.pontos_atencao ?? "");
      setOpTexto(own.parecer);
    }
    const ownVote = votes.find(v => v.voter_id === user.id);
    if (ownVote) { setVoteDec(ownVote.decisao); setVoteJust(ownVote.justificativa ?? ""); }
  }, [opinions, votes, user]);

  const canEditProposal = hasRole("admin") || hasRole("gestor_comercial");
  const canWriteOpinion = hasRole("analista_credito") || hasRole("gestor_risco") || hasRole("admin");
  const canVote = hasRole("comite") || hasRole("admin");
  const canDecide = hasRole("admin") || hasRole("analista_credito") || hasRole("gestor_risco") || hasRole("comite");

  const votosFavoraveis = useMemo(() => votes.filter(v => v.decisao === "favoravel").length, [votes]);
  const votosMinimos = proposal?.approval_levels?.votos_minimos ?? 1;
  const isComite = proposal?.approval_levels?.approver === "comite";
  const comiteAtingiuMinimo = isComite && votosFavoraveis >= votosMinimos;

  const advance = async (toStage: Stage) => {
    if (!proposal) return;
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

  const salvarParecer = async () => {
    if (!proposal || !user) return;
    if (!opTexto.trim()) { toast.error("Escreva o parecer"); return; }
    setSavingOp(true);
    // descobrir o role usado
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roleList = (roles ?? []).map(r => r.role);
    const author_role = roleList.includes("analista_credito") ? "analista_credito"
      : roleList.includes("gestor_risco") ? "gestor_risco" : "admin";

    const payload = {
      proposal_id: proposal.id, author_id: user.id, author_role: author_role as any,
      recomendacao: opRec, score: opScore ? Number(opScore) : null,
      pontos_fortes: opFortes || null, pontos_atencao: opAtencao || null, parecer: opTexto,
    };
    const { error } = await supabase.from("credit_opinions").upsert(payload, { onConflict: "proposal_id,author_id" });
    setSavingOp(false);
    if (error) { toast.error("Erro ao salvar parecer", { description: error.message }); return; }
    toast.success("Parecer salvo");
    load();
  };

  const salvarVoto = async () => {
    if (!proposal || !user) return;
    setSavingVote(true);
    const { error } = await supabase.from("committee_votes").upsert(
      { proposal_id: proposal.id, voter_id: user.id, decisao: voteDec, justificativa: voteJust || null },
      { onConflict: "proposal_id,voter_id" }
    );
    setSavingVote(false);
    if (error) { toast.error("Erro ao votar", { description: error.message }); return; }
    toast.success("Voto registrado");
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
          <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Finalidade</div><div>{proposal.finalidade ?? "—"}</div></div>
          <div className="md:col-span-2"><div className="text-xs text-muted-foreground">Garantias</div><div>{proposal.garantias ?? "—"}</div></div>
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

      {/* Esteira */}
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
              <Button size="sm" onClick={() => advance("comite")} disabled={savingDecision}>
                <Send className="h-4 w-4 mr-2" /> Enviar para Comitê
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
          {isComite && (
            <p className="text-sm text-muted-foreground">
              Votos favoráveis: <strong>{votosFavoraveis}</strong> de <strong>{votosMinimos}</strong> mínimos.{" "}
              {comiteAtingiuMinimo ? <span className="text-green-600">Quórum atingido.</span> : <span>Quórum não atingido.</span>}
            </p>
          )}
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
            <Button onClick={() => decidir("aprovado")} disabled={savingDecision || (isComite && !comiteAtingiuMinimo)}>
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

      {/* Pareceres */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><FileSignature className="h-5 w-5" /> Pareceres ({opinions.length})</h2>
        {opinions.length === 0 && <p className="text-sm text-muted-foreground">Nenhum parecer registrado.</p>}
        <div className="space-y-3">
          {opinions.map((o) => (
            <div key={o.id} className="rounded-md border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">{o.author_role}</Badge>
                  <Badge variant={o.recomendacao === "favoravel" ? "default" : o.recomendacao === "desfavoravel" ? "destructive" : "secondary"}>
                    {REC_LABEL[o.recomendacao]}
                  </Badge>
                  {o.score != null && <span className="ml-2 text-xs text-muted-foreground">Score: {o.score}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{o.parecer}</p>
              {(o.pontos_fortes || o.pontos_atencao) && (
                <div className="grid md:grid-cols-2 gap-3 text-xs pt-2 border-t">
                  {o.pontos_fortes && <div><div className="text-muted-foreground">Pontos fortes</div><p className="whitespace-pre-wrap">{o.pontos_fortes}</p></div>}
                  {o.pontos_atencao && <div><div className="text-muted-foreground">Pontos de atenção</div><p className="whitespace-pre-wrap">{o.pontos_atencao}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>

        {canWriteOpinion && !finalStage && (
          <div className="rounded-md bg-muted/30 border p-4 space-y-3">
            <p className="text-sm font-medium">{opinions.find(o => o.author_id === user?.id) ? "Atualizar meu parecer" : "Registrar meu parecer"}</p>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Recomendação</Label>
                <Select value={opRec} onValueChange={(v) => setOpRec(v as Recommendation)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="favoravel">Favorável</SelectItem>
                    <SelectItem value="favoravel_com_ressalva">Favorável c/ ressalva</SelectItem>
                    <SelectItem value="desfavoravel">Desfavorável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Score (0-1000)</Label>
                <Input type="number" value={opScore} onChange={(e) => setOpScore(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parecer *</Label>
              <Textarea rows={3} value={opTexto} onChange={(e) => setOpTexto(e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Pontos fortes</Label><Textarea rows={2} value={opFortes} onChange={(e) => setOpFortes(e.target.value)} /></div>
              <div className="space-y-2"><Label>Pontos de atenção</Label><Textarea rows={2} value={opAtencao} onChange={(e) => setOpAtencao(e.target.value)} /></div>
            </div>
            <Button onClick={salvarParecer} disabled={savingOp}>
              {savingOp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar parecer
            </Button>
          </div>
        )}
      </div>

      {/* Comitê */}
      {isComite && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Vote className="h-5 w-5" /> Comitê — Votos ({votes.length})</h2>
          <p className="text-xs text-muted-foreground">Mínimo de {votosMinimos} voto(s) favoráveis para aprovar.</p>
          {votes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum voto registrado.</p>}
          <div className="space-y-2">
            {votes.map((v) => (
              <div key={v.id} className="rounded-md border p-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Badge variant={v.decisao === "favoravel" ? "default" : v.decisao === "desfavoravel" ? "destructive" : "secondary"}>
                    {VOTE_LABEL[v.decisao]}
                  </Badge>
                  {v.justificativa && <p className="text-sm whitespace-pre-wrap">{v.justificativa}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{fmtDate(v.created_at)}</span>
              </div>
            ))}
          </div>

          {canVote && proposal.stage === "comite" && (
            <div className="rounded-md bg-muted/30 border p-4 space-y-3">
              <p className="text-sm font-medium">{votes.find(v => v.voter_id === user?.id) ? "Atualizar meu voto" : "Registrar meu voto"}</p>
              <div className="space-y-2">
                <Label>Decisão</Label>
                <Select value={voteDec} onValueChange={(v) => setVoteDec(v as VoteDecision)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="favoravel">Favorável</SelectItem>
                    <SelectItem value="desfavoravel">Desfavorável</SelectItem>
                    <SelectItem value="abstencao">Abstenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Justificativa</Label>
                <Textarea rows={2} value={voteJust} onChange={(e) => setVoteJust(e.target.value)} />
              </div>
              <Button onClick={salvarVoto} disabled={savingVote}>
                {savingVote && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar voto
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><History className="h-5 w-5" /> Histórico</h2>
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
        </div>
      </div>
    </div>
  );
}
