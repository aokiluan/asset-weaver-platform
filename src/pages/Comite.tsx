import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight, Building2, CheckCircle2, Clock, FileDown, Loader2, Search,
  ThumbsDown, ThumbsUp, Trophy, Users, Vote,
} from "lucide-react";
import { toast } from "sonner";
import { downloadAtaById } from "@/lib/comite-ata-pdf";

type VoteDecision = "favoravel" | "desfavoravel" | "abstencao";

interface Voto { id: string; proposal_id: string; voter_id: string; decisao: VoteDecision; }

interface Proposal {
  id: string; codigo: string; cedente_id: string;
  valor_solicitado: number; prazo_dias: number | null; taxa_sugerida: number | null;
  stage: string; created_at: string;
  cedentes: { razao_social: string; cnpj: string } | null;
}

interface Minute {
  id: string; numero_comite: number; realizado_em: string;
  cedente_id: string; decisao: "aprovado" | "reprovado";
  cedentes: { razao_social: string; cnpj: string } | null;
  totais: any;
}

const fmtBRL = (v: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const daysSince = (s: string) =>
  Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);

export default function Comite() {
  const { user, hasRole } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votes, setVotes] = useState<Voto[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pauta");
  const [search, setSearch] = useState("");

  const canVote = hasRole("comite") || hasRole("admin");

  useEffect(() => { document.title = "Comitê | Securitizadora"; }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: props }, { data: elig }, { data: mins }] = await Promise.all([
      supabase.from("credit_proposals")
        .select("id,codigo,cedente_id,valor_solicitado,prazo_dias,taxa_sugerida,stage,created_at,cedentes(razao_social,cnpj)")
        .eq("stage", "comite").order("created_at", { ascending: true }),
      supabase.rpc("committee_eligible_voter_ids" as any),
      supabase.from("committee_minutes")
        .select("id,numero_comite,realizado_em,cedente_id,decisao,totais,cedentes(razao_social,cnpj)")
        .order("realizado_em", { ascending: false }).limit(200),
    ]);

    const list = ((props as any[]) ?? []) as Proposal[];
    setProposals(list);
    setEligibleCount(Array.isArray(elig) ? (elig as string[]).length : 0);
    setMinutes(((mins as any[]) ?? []) as Minute[]);

    if (list.length) {
      const ids = list.map((p) => p.id);
      const { data: vs } = await supabase
        .from("committee_votes").select("id,proposal_id,voter_id,decisao").in("proposal_id", ids);
      setVotes((vs as Voto[]) ?? []);
    } else setVotes([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const minhas = user
      ? new Set(votes.filter((v) => v.voter_id === user.id).map((v) => v.proposal_id))
      : new Set<string>();
    const aguardando = proposals.filter((p) => !minhas.has(p.id)).length;
    const jaVotei = proposals.filter((p) => minhas.has(p.id)).length;
    return { aguardando, jaVotei, total: proposals.length };
  }, [proposals, votes, user]);

  const filteredMinutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return minutes;
    return minutes.filter((m) =>
      m.cedentes?.razao_social?.toLowerCase().includes(q) ||
      m.cedentes?.cnpj?.includes(q) ||
      String(m.numero_comite).includes(q)
    );
  }, [minutes, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando comitê...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-[18px] font-medium tracking-tight flex items-center gap-2">
          <Vote className="h-5 w-5" /> Comitê de Crédito
        </h1>
        <p className="text-[11px] text-muted-foreground">
          {canVote
            ? "Vote em todos os cedentes em pauta sem precisar abrir cada um. Sessão fecha sozinha quando todos os membros votarem."
            : "Você está em modo somente leitura."}
        </p>
      </header>

      {canVote && (
        <div className="grid gap-2 md:grid-cols-4">
          <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Aguardando seu voto" value={stats.aguardando} highlight={stats.aguardando > 0} />
          <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Você já votou" value={stats.jaVotei} />
          <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Membros do comitê" value={eligibleCount} />
          <StatCard icon={<Vote className="h-3.5 w-3.5" />} label="Em pauta" value={stats.total} />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="pauta" className="text-[11px] h-7">Em pauta ({proposals.length})</TabsTrigger>
          <TabsTrigger value="atas" className="text-[11px] h-7">Atas ({minutes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pauta" className="mt-3">
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
                const meuVoto = user ? propVotes.find((v) => v.voter_id === user.id) : null;
                const faltam = Math.max(0, eligibleCount - propVotes.length);
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
                      <Cell label="Valor" value={fmtBRL(p.valor_solicitado)} />
                      <Cell label="Prazo" value={p.prazo_dias ? `${p.prazo_dias}d` : "—"} />
                      <Cell label="Em pauta há" value={dias === 0 ? "hoje" : `${dias}d`} />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground leading-none">
                        <strong className="text-foreground">{propVotes.length}</strong>/{eligibleCount} membros votaram
                        {faltam > 0 && <span className="text-amber-600"> · faltam {faltam}</span>}
                      </span>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-green-600" /> {fav}</span>
                        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-destructive" /> {desfav}</span>
                      </div>
                    </div>

                    <Button asChild size="sm" className="w-full h-7 text-[11px]" variant={meuVoto ? "outline" : "default"}>
                      <Link to={`/cedentes/${p.cedente_id}?tab=comite`}>
                        {meuVoto ? "Rever voto" : canVote ? "Votar agora" : "Abrir cedente"}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="atas" className="mt-3 space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cedente, CNPJ ou número do comitê…"
              className="h-7 pl-7 text-[11px]"
            />
          </div>

          {filteredMinutes.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Nenhuma ata registrada.</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-2.5 py-1.5 font-medium">Nº</th>
                    <th className="text-left px-2.5 py-1.5 font-medium">Data</th>
                    <th className="text-left px-2.5 py-1.5 font-medium">Cedente</th>
                    <th className="text-left px-2.5 py-1.5 font-medium">Decisão</th>
                    <th className="text-left px-2.5 py-1.5 font-medium">Votos</th>
                    <th className="text-right px-2.5 py-1.5 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMinutes.map((m) => {
                    const t = m.totais ?? {};
                    return (
                      <tr key={m.id} className="border-t hover:bg-muted/20">
                        <td className="px-2.5 py-1.5 font-mono">{m.numero_comite}º</td>
                        <td className="px-2.5 py-1.5">{fmtDate(m.realizado_em)}</td>
                        <td className="px-2.5 py-1.5">
                          <div className="font-medium leading-tight">{m.cedentes?.razao_social ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono leading-none">{m.cedentes?.cnpj}</div>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Badge className={`text-[10px] h-5 px-1.5 ${m.decisao === "aprovado" ? "bg-green-600" : "bg-destructive"} text-white`}>
                            {m.decisao === "aprovado" ? "Aprovado" : "Reprovado"}
                          </Badge>
                        </td>
                        <td className="px-2.5 py-1.5 text-muted-foreground">
                          <span className="text-green-600">{t.favoraveis ?? 0}</span> × <span className="text-destructive">{t.desfavoraveis ?? 0}</span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <div className="inline-flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-1.5"
                              onClick={() => downloadAtaById(m.id).catch((e) => toast.error(e?.message ?? "Falha"))}>
                              <FileDown className="h-3 w-3" /> Ata
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-1.5">
                              <Link to={`/cedentes/${m.cedente_id}?tab=comite`}>Abrir</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground leading-none">{label}</div>
      <div className="font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean; }) {
  return (
    <div className={`rounded-lg border bg-card p-2.5 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground leading-none">{icon}<span>{label}</span></div>
      <div className="text-[16px] font-medium tracking-tight mt-1 tabular-nums leading-none">{value}</div>
    </div>
  );
}
