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
  Trophy, Loader2, Lock, Sparkles, Clock, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { VoteBriefing } from "./VoteBriefing";
import { ReadingChecklist, ChecklistItem } from "./ReadingChecklist";
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [voteDec, setVoteDec] = useState<VoteDecision>("favoravel");
  const [voteJust, setVoteJust] = useState("");
  const [checklistInfo, setChecklistInfo] = useState<{ completed: number; total: number; allDone: boolean }>({ completed: 0, total: 0, allDone: false });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canVote = hasRole("comite") || hasRole("admin");
  const canManage = hasRole("admin") || hasRole("credito") || hasRole("comite");

  // Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase
        .from("committee_sessions")
        .select("*")
        .eq("proposal_id", proposalId)
        .maybeSingle();
      const { data: vs } = await supabase
        .from("committee_votes")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at");
      if (!active) return;
      setSession(sess as any);
      setVotes((vs as any) ?? []);
      const own = (vs as VoteRow[] | null)?.find(v => v.voter_id === user?.id);
      if (own) { setVoteDec(own.decisao); setVoteJust(own.justificativa ?? ""); }

      // Carrega nomes dos votantes (para placar)
      const ids = Array.from(new Set([...(vs ?? []).map((v: any) => v.voter_id)]));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", ids);
        if (active && profs) setProfiles(Object.fromEntries(profs.map(p => [p.id, p as Profile])));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [proposalId, user?.id]);

  // Realtime
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
        (payload) => setSession(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [proposalId, profiles]);

  // Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const ownVote = useMemo(() => votes.find(v => v.voter_id === user?.id), [votes, user?.id]);
  const favoraveis = useMemo(() => votes.filter(v => v.decisao === "favoravel").length, [votes]);
  const contrarios = useMemo(() => votes.filter(v => v.decisao === "desfavoravel").length, [votes]);
  const abstencoes = useMemo(() => votes.filter(v => v.decisao === "abstencao").length, [votes]);
  const revealed = session?.status === "revelada" || session?.status === "encerrada" || !session?.voto_secreto;
  const quorumOk = favoraveis >= votosMinimos;

  const deadlineMs = session?.deadline ? new Date(session.deadline).getTime() - now : null;
  const deadlineStr = deadlineMs == null ? null
    : deadlineMs <= 0 ? "Expirado"
    : `${Math.floor(deadlineMs / 60000)}m ${Math.floor((deadlineMs % 60000) / 1000)}s`;

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

  const revelar = async () => {
    if (!session || !user) return;
    setBusy(true);
    const { error } = await supabase.from("committee_sessions")
      .update({ status: "revelada", revelada_em: new Date().toISOString(), revelada_por: user.id })
      .eq("id", session.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Votos revelados! 🎉");
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

  const handleVoteClick = () => {
    if (!checklistInfo.allDone && checklistInfo.total > 0) {
      setConfirmOpen(true);
    } else {
      votar();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando comitê…</div>;

  // Sessão não aberta
  if (!session) {
    return (
      <Card className="p-4 text-center space-y-3">
        <Vote className="h-10 w-10 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold">Comitê ainda não iniciado</h3>
        <p className="text-sm text-muted-foreground">
          Abra a sessão para que o comitê registre os votos. Quórum mínimo: <strong>{votosMinimos}</strong>.
        </p>
        {canManage && proposalStage === "comite" && (
          <Button onClick={abrirSessao} disabled={busy}>
            <Sparkles className="h-4 w-4 mr-2" /> Abrir sessão de comitê
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Briefing sintetizado dos pareceres */}
      {cedenteId && <VoteBriefing cedenteId={cedenteId} proposalId={proposalId} />}

      {/* Header da sessão */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Badge variant={session.status === "encerrada" ? "outline" : "default"} className="uppercase tracking-wide">
              {session.status}
            </Badge>
            {session.voto_secreto && !revealed && (
              <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Voto secreto</Badge>
            )}
            {revealed && <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" /> Revelado</Badge>}
            {deadlineStr && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {deadlineStr}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{votes.length} voto{votes.length === 1 ? "" : "s"} registrado{votes.length === 1 ? "" : "s"}</span>
            {canManage && session.status === "aberta" && votes.length > 0 && (
              <Button onClick={revelar} disabled={busy} size="sm" variant="default">
                <Eye className="h-4 w-4 mr-2" /> Revelar votos
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Placar / contagem */}
      <div className="grid grid-cols-3 gap-2">
        <ScoreCard label="Favoráveis" count={favoraveis} icon={<ThumbsUp className="h-3.5 w-3.5" />} color="text-green-600" hidden={!revealed} mask={votes.length} />
        <ScoreCard label="Contrários" count={contrarios} icon={<ThumbsDown className="h-3.5 w-3.5" />} color="text-destructive" hidden={!revealed} mask={votes.length} />
        <ScoreCard label="Abstenções" count={abstencoes} icon={<MinusCircle className="h-3.5 w-3.5" />} color="text-muted-foreground" hidden={!revealed} mask={votes.length} />
      </div>

      {/* Quórum */}
      <Card className={`p-4 ${revealed && quorumOk ? "border-green-500 bg-green-500/5" : ""}`}>
        <div className="flex items-center gap-3">
          <Trophy className={`h-6 w-6 ${revealed && quorumOk ? "text-green-600" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {revealed
                ? (quorumOk ? "Quórum atingido — pronto para decisão final ✅" : "Quórum não atingido")
                : "Aguardando revelação dos votos"}
            </div>
            <div className="text-xs text-muted-foreground">
              {revealed ? `${favoraveis} de ${votosMinimos} votos favoráveis necessários` : `Mínimo: ${votosMinimos} favorável(is)`}
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de votos / votantes */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Vote className="h-4 w-4" /> Votantes</h4>
        {votes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum voto registrado ainda.</p>}
        <div className="space-y-2">
          {votes.map((v) => {
            const isOwn = v.voter_id === user?.id;
            const showDecision = revealed || isOwn;
            return (
              <div key={v.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-medium text-sm ${showDecision ? VOTE_COLOR[v.decisao] + " text-white" : "bg-muted"}`}>
                  {showDecision ? VOTE_ICON[v.decisao] : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {profiles[v.voter_id]?.nome ?? "Membro do comitê"} {isOwn && <span className="text-xs text-muted-foreground font-normal">(você)</span>}
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
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">{VOTE_LABEL[v.decisao]}</span>
                      {v.justificativa && <> — {v.justificativa}</>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">Voto oculto até revelação</div>
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

          <Card className="p-4 space-y-3 border-primary/30">
            <h4 className="text-sm font-semibold">{ownVote ? "Atualizar meu voto" : "Registrar meu voto"}</h4>
            <div className="grid grid-cols-3 gap-2">
              {(["favoravel", "desfavoravel", "abstencao"] as VoteDecision[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setVoteDec(d)}
                  className={`rounded-md border p-3 flex flex-col items-center gap-1 transition ${voteDec === d ? `${VOTE_COLOR[d]} text-white border-transparent` : "hover:bg-muted"}`}
                  type="button"
                >
                  {VOTE_ICON[d]}
                  <span className="text-xs font-medium">{VOTE_LABEL[d]}</span>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Justificativa (opcional)</Label>
              <Textarea rows={2} value={voteJust} onChange={(e) => setVoteJust(e.target.value)} />
            </div>
            {!checklistInfo.allDone && checklistInfo.total > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Você revisou {checklistInfo.completed} de {checklistInfo.total} itens. Recomendamos completar antes de votar.
                </span>
              </div>
            )}
            <Button onClick={handleVoteClick} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Vote className="h-4 w-4 mr-2" />}
              {ownVote ? "Atualizar voto" : "Confirmar voto"}
            </Button>
            {session.voto_secreto && !revealed && (
              <p className="text-xs text-muted-foreground text-center"><Lock className="inline h-3 w-3 mr-1" /> Seu voto fica oculto até a revelação.</p>
            )}
          </Card>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Votar sem revisar tudo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você marcou apenas {checklistInfo.completed} de {checklistInfo.total} itens do checklist de leitura.
              Seu voto será registrado com essa informação para fins de auditoria. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar e revisar</AlertDialogCancel>
            <AlertDialogAction onClick={votar}>Votar mesmo assim</AlertDialogAction>
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
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <span className={color}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-[18px] font-semibold tabular-nums">
        {hidden ? <span className="text-muted-foreground">?</span> : count}
      </div>
    </Card>
  );
}
