import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Vote, ThumbsUp, ThumbsDown, MinusCircle, EyeOff, Eye,
  Trophy, Loader2, Lock, Sparkles, Clock, AlertTriangle, Users, FileDown, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { VoteBriefing } from "./VoteBriefing";
import { ReadingChecklist, ChecklistItem } from "./ReadingChecklist";
import { downloadAtaById } from "@/lib/comite-ata-pdf";
import { ReapresentarComiteDialog } from "./ReapresentarComiteDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type VoteDecision = "favoravel" | "desfavoravel" | "abstencao";

interface CommitteeSession {
  id: string;
  proposal_id: string;
  voto_secreto: boolean;
  status: "aberta" | "revelada" | "encerrada";
  deadline: string | null;
  abertura: string;
  revelada_em: string | null;
}

interface VoteRow {
  id: string;
  voter_id: string;
  decisao: VoteDecision;
  justificativa: string | null;
  created_at: string;
  checklist_completo?: boolean;
  itens_revisados?: number;
}

interface Profile { id: string; nome: string; }

interface Props {
  proposalId: string;
  votosMinimos: number;
  proposalStage: string;
  cedenteId?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: "pleito_comercial", label: "Revisei o pleito comercial", hint: "Valor, prazo e modalidades solicitados", tab: "visita" },
  { key: "parecer_comercial", label: "Li o parecer e a recomendação comercial", hint: "Percepção do comercial sobre o cedente", tab: "visita" },
  { key: "analise_credito", label: "Conferi a análise e o parecer do crédito", hint: "Recomendação, conclusão e justificativa do analista", tab: "credito" },
  { key: "pontos_atencao", label: "Olhei os pontos de atenção e restritivos", hint: "Riscos levantados em ambos os relatórios", tab: "credito" },
];

const VOTE_LABEL: Record<VoteDecision, string> = {
  favoravel: "Favorável", desfavoravel: "Desfavorável", abstencao: "Abstenção",
};
const VOTE_COLOR: Record<VoteDecision, string> = {
  favoravel: "bg-green-500", desfavoravel: "bg-destructive", abstencao: "bg-muted-foreground",
};
const VOTE_ICON: Record<VoteDecision, JSX.Element> = {
  favoravel: <ThumbsUp className="h-4 w-4" />,
  desfavoravel: <ThumbsDown className="h-4 w-4" />,
  abstencao: <MinusCircle className="h-4 w-4" />,
};

export function ComiteGameSession({ proposalId, votosMinimos, proposalStage, cedenteId }: Props) {
  const { user, hasRole } = useAuth();
  const [session, setSession] = useState<CommitteeSession | null>(null);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [eligible, setEligible] = useState<Profile[]>([]);
  const [minuteId, setMinuteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [voteDec, setVoteDec] = useState<VoteDecision>("favoravel");
  const [voteJust, setVoteJust] = useState("");
  const [checklistInfo, setChecklistInfo] = useState<{ completed: number; total: number; allDone: boolean }>({ completed: 0, total: 0, allDone: false });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  const canVote = hasRole("comite") || hasRole("admin");
  const canManage = hasRole("admin");

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: sess }, { data: vs }, { data: elig }] = await Promise.all([
        supabase.from("committee_sessions").select("*").eq("proposal_id", proposalId).maybeSingle(),
        supabase.from("committee_votes").select("*").eq("proposal_id", proposalId).order("created_at"),
        supabase.from("user_roles").select("user_id, profiles!inner(id,nome,ativo)").eq("role", "comite"),
      ]);
      if (!active) return;
      setSession(sess as any);
      setVotes((vs as any) ?? []);
      const own = (vs as VoteRow[] | null)?.find(v => v.voter_id === user?.id);
      if (own) { setVoteDec(own.decisao); setVoteJust(own.justificativa ?? ""); }

      const eligibleProfiles = ((elig as any[]) ?? [])
        .map((r) => r.profiles)
        .filter((p: any) => p && p.ativo)
        .map((p: any) => ({ id: p.id, nome: p.nome })) as Profile[];
      setEligible(eligibleProfiles);

      const ids = Array.from(new Set([
        ...(vs ?? []).map((v: any) => v.voter_id),
        ...eligibleProfiles.map((p) => p.id),
      ]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", ids);
        if (active && profs) setProfiles(Object.fromEntries(profs.map(p => [p.id, p as Profile])));
      }

      if ((sess as any)?.status === "encerrada") {
        const { data: m } = await supabase.from("committee_minutes").select("id").eq("session_id", (sess as any).id).maybeSingle();
        if (active && m) setMinuteId((m as any).id);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [proposalId, user?.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`comite-${proposalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "committee_votes", filter: `proposal_id=eq.${proposalId}` },
        async () => {
          const { data } = await supabase.from("committee_votes").select("*").eq("proposal_id", proposalId).order("created_at");
          setVotes((data as any) ?? []);
          const ids = Array.from(new Set((data ?? []).map((v: any) => v.voter_id))) as string[];
          const missing = ids.filter(id => !profiles[id]);
          if (missing.length) {
            const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", missing);
            if (profs) setProfiles(p => ({ ...p, ...Object.fromEntries(profs.map(x => [x.id, x as Profile])) }));
          }
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "committee_sessions", filter: `proposal_id=eq.${proposalId}` },
        async (payload) => {
          const next = payload.new as any;
          setSession(next);
          if (next?.status === "encerrada") {
            const { data: m } = await supabase.from("committee_minutes").select("id").eq("session_id", next.id).maybeSingle();
            if (m) setMinuteId((m as any).id);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [proposalId, profiles]);

  const ownVote = useMemo(() => votes.find(v => v.voter_id === user?.id), [votes, user?.id]);
  const favoraveis = useMemo(() => votes.filter(v => v.decisao === "favoravel").length, [votes]);
  const contrarios = useMemo(() => votes.filter(v => v.decisao === "desfavoravel").length, [votes]);
  const eligibleVoters = useMemo(() => eligible, [eligible]);
  const eligibleIds = useMemo(() => new Set(eligibleVoters.map(p => p.id)), [eligibleVoters]);
  const votedEligibleIds = useMemo(() => new Set(votes.filter(v => eligibleIds.has(v.voter_id)).map(v => v.voter_id)), [votes, eligibleIds]);
  const pendentes = useMemo(() => eligibleVoters.filter(p => !votedEligibleIds.has(p.id)), [eligibleVoters, votedEligibleIds]);
  const allVoted = pendentes.length === 0 && eligibleVoters.length > 0;
  const revealed = session?.status === "revelada" || session?.status === "encerrada" || allVoted;
  const isClosed = session?.status === "encerrada";
  const decisaoFinal: "aprovado" | "reprovado" = favoraveis > contrarios ? "aprovado" : "reprovado";

  const abrirSessao = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("committee_sessions")
      .insert({ proposal_id: proposalId, voto_secreto: true, status: "aberta", created_by: user.id })
      .select().single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSession(data as any);
    toast.success("Sessão de comitê aberta");
  };

  const forcarEncerramento = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("committee_close_if_complete" as any, { _proposal_id: proposalId, _force: true });
    setBusy(false);
    setForceOpen(false);
    if (error) { toast.error(error.message); return; }
    if (data) setMinuteId(data as string);
    toast.success("Comitê encerrado por decisão administrativa");
  };

  const baixarAta = async () => {
    if (!minuteId) return;
    try { await downloadAtaById(minuteId); }
    catch (e: any) { toast.error(e?.message ?? "Falha ao gerar PDF"); }
  };

  const votar = async () => {
    if (!user || !session) return;
    setBusy(true);
    const { error } = await supabase.from("committee_votes").upsert(
      {
        proposal_id: proposalId,
        voter_id: user.id,
        decisao: voteDec,
        justificativa: voteJust || null,
        checklist_completo: checklistInfo.allDone,
        itens_revisados: checklistInfo.completed,
      } as any,
      { onConflict: "proposal_id,voter_id" }
    );
    setBusy(false);
    setConfirmOpen(false);
    if (error) { toast.error(error.message); return; }
    toast.success(checklistInfo.allDone ? "Voto registrado 🗳️" : "Voto registrado (sem checklist completo)");
  };

  const checklistBloqueia = checklistInfo.total > 0 && !checklistInfo.allDone;
  const handleVoteClick = () => {
    if (checklistBloqueia) {
      toast.error("Conclua a leitura do relatório comercial e da análise de crédito antes de votar.");
      return;
    }
    votar();
  };

  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground text-[12px]"><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Carregando comitê…</div>;

  // Sessão não aberta
  if (!session) {
    return (
      <Card className="p-2.5 text-center space-y-2">
        <Vote className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="text-[14px] font-semibold leading-tight">Comitê ainda não iniciado</h3>
        <p className="text-[11px] text-muted-foreground leading-tight">
          Abra a sessão para que o comitê registre os votos. Quórum mínimo: <strong>{votosMinimos}</strong>.
        </p>
        {canManage && proposalStage === "comite" && (
          <Button onClick={abrirSessao} disabled={busy} className="h-7 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Abrir sessão de comitê
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Briefing sintetizado dos pareceres */}
      {cedenteId && <VoteBriefing cedenteId={cedenteId} proposalId={proposalId} />}

      {/* Header da sessão */}
      <Card className="p-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={isClosed ? "outline" : "default"} className="uppercase tracking-wide text-[10px] h-5 px-1.5">
              {session.status}
            </Badge>
            {!revealed && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5"><Lock className="h-3 w-3 mr-1" /> Voto secreto</Badge>
            )}
            {revealed && <Badge variant="secondary" className="text-[10px] h-5 px-1.5"><Eye className="h-3 w-3 mr-1" /> Revelado</Badge>}
            {isClosed && (
              <Badge className={`text-[10px] h-5 px-1.5 ${decisaoFinal === "aprovado" ? "bg-green-600" : "bg-destructive"} text-white`}>
                <Trophy className="h-3 w-3 mr-1" /> {decisaoFinal === "aprovado" ? "Aprovado" : "Reprovado"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground leading-none">
              {votedEligibleIds.size}/{eligibleVoters.length} membro{eligibleVoters.length === 1 ? "" : "s"} votaram
            </span>
            {isClosed && minuteId && (
              <Button onClick={baixarAta} size="sm" variant="default" className="h-7 text-[11px]">
                <FileDown className="h-3.5 w-3.5 mr-1.5" /> Baixar ata (PDF)
              </Button>
            )}
            {isClosed && decisaoFinal === "reprovado" && cedenteId && (hasRole("admin") || hasRole("credito") || hasRole("comite")) && (
              <ReapresentarComiteDialog cedenteId={cedenteId} />
            )}
            {canManage && session.status === "aberta" && pendentes.length > 0 && (
              <Button onClick={() => setForceOpen(true)} disabled={busy} size="sm" variant="outline" className="h-7 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Forçar encerramento
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Placar */}
      <div className="grid grid-cols-2 gap-2">
        <ScoreCard label="Favoráveis" count={favoraveis} icon={<ThumbsUp className="h-3 w-3" />} color="text-green-600" hidden={!revealed} mask={votes.length} />
        <ScoreCard label="Contrários" count={contrarios} icon={<ThumbsDown className="h-3 w-3" />} color="text-destructive" hidden={!revealed} mask={votes.length} />
      </div>

      {/* Quórum por presença total */}
      <Card className={`p-2.5 ${isClosed ? (decisaoFinal === "aprovado" ? "border-green-500 bg-green-500/5" : "border-destructive/40 bg-destructive/5") : ""}`}>
        <div className="flex items-start gap-2.5">
          <Users className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium leading-tight">
              {isClosed
                ? `Sessão encerrada — decisão: ${decisaoFinal}`
                : pendentes.length === 0
                  ? "Todos os membros votaram — encerrando…"
                  : `Aguardando voto de ${pendentes.length} membro${pendentes.length === 1 ? "" : "s"}`}
            </div>
            {!isClosed && pendentes.length > 0 && (
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Pendentes: {pendentes.map(p => p.nome).join(", ")}
              </div>
            )}
            {isClosed && (
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {favoraveis} favorável(is) × {contrarios} contrário(s){votosMinimos ? ` • alçada original: mín. ${votosMinimos}` : ""}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Lista de votos / votantes */}
      <Card className="p-2.5 space-y-2">
        <h4 className="text-[12px] font-semibold flex items-center gap-1.5 leading-none"><Vote className="h-3.5 w-3.5" /> Votantes</h4>
        {votes.length === 0 && <p className="text-[11px] text-muted-foreground leading-tight">Nenhum voto registrado ainda.</p>}
        <div className="space-y-1.5">
          {votes.map((v) => {
            const isOwn = v.voter_id === user?.id;
            const showDecision = revealed || isOwn;
            return (
              <div key={v.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center font-medium text-[11px] shrink-0 ${showDecision ? VOTE_COLOR[v.decisao] + " text-white" : "bg-muted"}`}>
                  {showDecision ? VOTE_ICON[v.decisao] : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate flex items-center gap-1 leading-tight">
                    {profiles[v.voter_id]?.nome ?? "Membro do comitê"} {isOwn && <span className="text-[10px] text-muted-foreground font-normal">(você)</span>}
                    {v.checklist_completo ? (
                      <span title="Revisou todo o briefing antes de votar">
                        <Eye className="h-3 w-3 text-green-600" />
                      </span>
                    ) : (
                      <span title="Votou sem completar o checklist de leitura">
                        <EyeOff className="h-3 w-3 text-amber-600" />
                      </span>
                    )}
                  </div>
                  {showDecision ? (
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      <span className="font-medium">{VOTE_LABEL[v.decisao]}</span>
                      {v.justificativa && <> — {v.justificativa}</>}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic leading-tight">Voto oculto até revelação</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Checklist de leitura + Form de voto */}
      {canVote && session.status === "aberta" && proposalStage === "comite" && (
        <>
          {cedenteId && (
            <ReadingChecklist
              proposalId={proposalId}
              cedenteId={cedenteId}
              items={CHECKLIST_ITEMS}
              onProgress={setChecklistInfo}
            />
          )}

          <Card className="p-2.5 space-y-2 border-primary/30">
            <h4 className="text-[12px] font-semibold leading-none">{ownVote ? "Atualizar meu voto" : "Registrar meu voto"}</h4>
            <div className="grid grid-cols-2 gap-2">
              {(["favoravel", "desfavoravel"] as VoteDecision[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setVoteDec(d)}
                  className={`rounded-md border p-2 flex flex-col items-center gap-1 transition ${voteDec === d ? `${VOTE_COLOR[d]} text-white border-transparent` : "hover:bg-muted"}`}
                  type="button"
                >
                  {VOTE_ICON[d]}
                  <span className="text-[11px] font-medium leading-none">{VOTE_LABEL[d]}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] leading-none">Justificativa (opcional)</Label>
              <Textarea rows={2} value={voteJust} onChange={(e) => setVoteJust(e.target.value)} className="text-[11px]" />
            </div>
            {checklistBloqueia && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Conclua a leitura ({checklistInfo.completed}/{checklistInfo.total}) do relatório comercial e da análise de crédito para liberar o voto.
                </span>
              </div>
            )}
            <Button onClick={handleVoteClick} disabled={busy || checklistBloqueia} className="w-full h-7 text-[11px]">
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Vote className="h-3.5 w-3.5 mr-1.5" />}
              {ownVote ? "Atualizar voto" : "Confirmar voto"}
            </Button>
            {session.voto_secreto && !revealed && (
              <p className="text-[10px] text-muted-foreground text-center leading-none"><Lock className="inline h-3 w-3 mr-1" /> Seu voto fica oculto até a revelação.</p>
            )}
          </Card>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] leading-tight">Votar sem revisar tudo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-tight">
              Você marcou apenas {checklistInfo.completed} de {checklistInfo.total} itens do checklist de leitura.
              Seu voto será registrado com essa informação para fins de auditoria. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-[11px]">Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction onClick={votar} className="h-7 text-[11px]">Votar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={forceOpen} onOpenChange={setForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] leading-tight">Forçar encerramento do comitê?</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px] leading-tight">
              Ainda faltam {pendentes.length} membro(s) votar(em). A decisão será calculada com os votos já registrados
              ({favoraveis} favorável × {contrarios} contrário) e a ata será gerada automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-[11px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={forcarEncerramento} className="h-7 text-[11px]">Encerrar agora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScoreCard({ label, count, icon, color, hidden, mask }: {
  label: string; count: number; icon: JSX.Element; color: string; hidden?: boolean; mask: number;
}) {
  return (
    <Card className="p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 leading-none">
        <span className={color}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-[14px] font-semibold tabular-nums leading-none">
        {hidden ? <span className="text-muted-foreground">?</span> : count}
      </div>
    </Card>
  );
}
