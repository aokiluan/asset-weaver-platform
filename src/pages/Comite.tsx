import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Vote,
} from "lucide-react";
import { toast } from "sonner";

type VoteDecision = "favoravel" | "desfavoravel" | "abstencao";

interface Voto {
  id: string;
  proposal_id: string;
  voter_id: string;
  decisao: VoteDecision;
}

interface Proposal {
  id: string;
  codigo: string;
  cedente_id: string;
  valor_solicitado: number;
  prazo_dias: number | null;
  taxa_sugerida: number | null;
  stage: string;
  created_at: string;
  cedentes: { razao_social: string; cnpj: string } | null;
  approval_levels: {
    nome: string;
    approver: string;
    votos_minimos: number;
    valor_min: number;
    valor_max: number | null;
  } | null;
}

const fmtBRL = (v: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const daysSince = (s: string) =>
  Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);

export default function Comite() {
  const { user, hasRole } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<Voto[]>([]);
  const [loading, setLoading] = useState(true);

  const canVote = hasRole("comite") || hasRole("admin");

  useEffect(() => {
    document.title = "Comitê | Securitizadora";
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: props, error } = await supabase
      .from("credit_proposals")
      .select(
        "id,codigo,cedente_id,valor_solicitado,prazo_dias,taxa_sugerida,stage,created_at,cedentes(razao_social,cnpj),approval_levels(nome,approver,votos_minimos,valor_min,valor_max)",
      )
      .eq("stage", "comite")
      .order("created_at", { ascending: true });

    if (error) {
      setLoading(false);
      toast.error("Erro ao carregar propostas", { description: error.message });
      return;
    }

    const list = ((props as any[]) ?? []) as Proposal[];
    setProposals(list);

    if (list.length > 0) {
      const ids = list.map((p) => p.id);
      const { data: vs } = await supabase
        .from("committee_votes")
        .select("id,proposal_id,voter_id,decisao")
        .in("proposal_id", ids);
      setVotes((vs as Voto[]) ?? []);
    } else {
      setVotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const minhas = user
      ? new Set(votes.filter((v) => v.voter_id === user.id).map((v) => v.proposal_id))
      : new Set<string>();

    const aguardando = proposals.filter((p) => !minhas.has(p.id)).length;
    const jaVotei = proposals.filter((p) => minhas.has(p.id)).length;

    const quorumAtingido = proposals.filter((p) => {
      const min = p.approval_levels?.votos_minimos ?? 1;
      const fav = votes.filter((v) => v.proposal_id === p.id && v.decisao === "favoravel").length;
      return fav >= min;
    }).length;

    return { aguardando, jaVotei, quorumAtingido, total: proposals.length };
  }, [proposals, votes, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando comitê...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-medium tracking-tight flex items-center gap-2">
            <Vote className="h-5 w-5" /> Comitê de Crédito
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Propostas aguardando voto. {canVote ? "Seu voto é assíncrono — vote quando quiser." : "Você está em modo somente leitura."}
          </p>
        </div>
      </header>

      {/* Painel do membro */}
      {canVote && (
        <div className="grid gap-2 md:grid-cols-4">
          <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Aguardando seu voto" value={stats.aguardando} highlight={stats.aguardando > 0} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Você já votou" value={stats.jaVotei} />
          <StatCard icon={<Trophy className="h-3.5 w-3.5" />} label="Quórum atingido" value={stats.quorumAtingido} />
          <StatCard icon={<Vote className="h-3.5 w-3.5" />} label="Total em pauta" value={stats.total} />
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <Vote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">Nenhuma proposta em pauta no comitê.</p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {proposals.map((p) => {
            const propVotes = votes.filter((v) => v.proposal_id === p.id);
            const fav = propVotes.filter((v) => v.decisao === "favoravel").length;
            const desfav = propVotes.filter((v) => v.decisao === "desfavoravel").length;
            
            const min = p.approval_levels?.votos_minimos ?? 1;
            const meuVoto = user ? propVotes.find((v) => v.voter_id === user.id) : null;
            const quorum = fav >= min;
            const pct = Math.min(100, Math.round((fav / Math.max(1, min)) * 100));
            const dias = daysSince(p.created_at);

            return (
              <div key={p.id} className="rounded-lg border bg-card p-2.5 space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-muted-foreground leading-none">{p.codigo}</p>
                    <h3 className="text-[13px] font-semibold tracking-tight truncate flex items-center gap-1.5 leading-tight">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {p.cedentes?.razao_social ?? "—"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-mono truncate leading-none">CNPJ: {p.cedentes?.cnpj}</p>
                  </div>
                  {meuVoto ? (
                    <Badge variant="default" className="shrink-0 text-[10px] h-5 px-1.5">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Você votou
                    </Badge>
                  ) : canVote ? (
                    <Badge variant="secondary" className="shrink-0 animate-pulse text-[10px] h-5 px-1.5">
                      <Clock className="h-3 w-3 mr-1" /> Aguarda voto
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-md bg-muted/40 px-2 py-1">
                    <div className="text-[10px] text-muted-foreground leading-none">Valor</div>
                    <div className="font-semibold tabular-nums leading-tight">{fmtBRL(p.valor_solicitado)}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 px-2 py-1">
                    <div className="text-[10px] text-muted-foreground leading-none">Prazo</div>
                    <div className="font-semibold leading-tight">{p.prazo_dias ? `${p.prazo_dias}d` : "—"}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 px-2 py-1">
                    <div className="text-[10px] text-muted-foreground leading-none">Em pauta há</div>
                    <div className="font-semibold leading-tight">{dias === 0 ? "hoje" : `${dias}d`}</div>
                  </div>
                </div>

                {/* Progresso de quórum */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground leading-none">
                      Quórum: <strong className="text-foreground">{fav}</strong> de {min} favoráveis
                    </span>
                    {quorum && (
                      <span className="text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> atingido
                      </span>
                    )}
                  </div>
                  <Progress value={pct} className={quorum ? "[&>div]:bg-green-600" : ""} />
                  <div className="flex gap-2 text-[10px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-green-600" /> {fav}</span>
                    <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-destructive" /> {desfav}</span>
                    
                    {p.approval_levels && (
                      <span className="ml-auto truncate">Alçada: {p.approval_levels.nome}</span>
                    )}
                  </div>
                </div>

                <Button asChild size="sm" className="w-full h-7 text-[11px]" variant={meuVoto ? "outline" : "default"}>
                  <Link to={`/credito/${p.id}`}>
                    {meuVoto ? "Rever proposta" : canVote ? "Votar agora" : "Abrir proposta"}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[20px] font-medium tracking-tight mt-1 tabular-nums">{value}</div>
    </div>
  );
}
