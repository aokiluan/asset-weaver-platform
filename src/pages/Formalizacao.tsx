import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  History,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { downloadMinutaPDF } from "@/lib/minuta-pdf";

interface CedenteRow {
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
  stage: string;
  minuta_assinada: boolean;
  minuta_assinada_em: string | null;
  updated_at: string;
}

interface PropostaAprovada {
  cedente_id: string;
  codigo: string;
  valor_aprovado: number | null;
  prazo_dias: number | null;
  taxa_sugerida: number | null;
  finalidade: string | null;
  garantias: string | null;
  decided_at: string | null;
}

const fmtBRL = (v: number | null) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const daysSince = (s: string) =>
  Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);

export default function Formalizacao() {
  const { user, hasRole } = useAuth();
  const [cedentes, setCedentes] = useState<CedenteRow[]>([]);
  const [historico, setHistorico] = useState<CedenteRow[]>([]);
  const [propostas, setPropostas] = useState<Record<string, PropostaAprovada>>({});
  const [contratos, setContratos] = useState<Record<string, { storage_path: string; nome_arquivo: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState("ativos");
  const [search, setSearch] = useState("");

  const canSign =
    hasRole("admin") || hasRole("formalizacao") || hasRole("gestor_geral");
  const canGenerate = hasRole("admin") || hasRole("formalizacao");

  useEffect(() => {
    document.title = "Formalização | Securitizadora";
  }, []);

  const load = async () => {
    setLoading(true);
    const SELECT =
      "id,razao_social,nome_fantasia,cnpj,email,telefone,endereco,cidade,estado,cep,setor,faturamento_medio,stage,minuta_assinada,minuta_assinada_em,updated_at";

    const [{ data: ativos, error: e1 }, { data: assinados, error: e2 }] = await Promise.all([
      supabase.from("cedentes").select(SELECT).eq("stage", "formalizacao").order("updated_at", { ascending: true }),
      supabase
        .from("cedentes")
        .select(SELECT)
        .eq("minuta_assinada", true)
        .order("minuta_assinada_em", { ascending: false })
        .limit(200),
    ]);

    if (e1 || e2) {
      setLoading(false);
      toast.error("Erro ao carregar", { description: (e1 || e2)?.message });
      return;
    }

    const list = (ativos as CedenteRow[]) ?? [];
    const hist = (assinados as CedenteRow[]) ?? [];
    setCedentes(list);
    setHistorico(hist);

    const idsSet = new Set<string>([...list.map((c) => c.id), ...hist.map((c) => c.id)]);
    const ids = Array.from(idsSet);

    if (ids.length > 0) {
      const { data: props } = await supabase
        .from("credit_proposals")
        .select(
          "cedente_id,codigo,valor_aprovado,prazo_dias,taxa_sugerida,finalidade,garantias,decided_at",
        )
        .in("cedente_id", ids)
        .eq("stage", "aprovado")
        .order("decided_at", { ascending: false });

      const map: Record<string, PropostaAprovada> = {};
      for (const p of (props as PropostaAprovada[]) ?? []) {
        if (!map[p.cedente_id]) map[p.cedente_id] = p;
      }
      setPropostas(map);
    } else {
      setPropostas({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGerarPDF = (c: CedenteRow) => {
    const proposta = propostas[c.id] ?? null;
    downloadMinutaPDF({ cedente: c, representantes: [], fiadores: [], proposta });
    toast.success("Minuta gerada", {
      description: "Suba o PDF na ferramenta de assinatura (CRDC).",
    });
  };

  const handleMarcarAssinada = async (c: CedenteRow) => {
    if (!user) return;
    setBusyId(c.id);
    const { error } = await supabase
      .from("cedentes")
      .update({
        minuta_assinada: true,
        minuta_assinada_em: new Date().toISOString(),
        minuta_assinada_por: user.id,
      })
      .eq("id", c.id);
    setBusyId(null);
    if (error) {
      toast.error("Erro", { description: error.message });
      return;
    }
    toast.success("Minuta marcada como assinada");
    load();
  };

  const handleAtivar = async (c: CedenteRow) => {
    setBusyId(c.id);
    const { error } = await supabase
      .from("cedentes")
      .update({ stage: "ativo" })
      .eq("id", c.id);
    setBusyId(null);
    if (error) {
      toast.error("Erro ao ativar", { description: error.message });
      return;
    }
    toast.success("Cedente ativado");
    load();
  };

  const filteredHistorico = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historico;
    return historico.filter((c) => {
      const prop = propostas[c.id];
      return (
        c.razao_social?.toLowerCase().includes(q) ||
        c.cnpj?.includes(q) ||
        prop?.codigo?.toLowerCase().includes(q)
      );
    });
  }, [historico, propostas, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando formalização...
      </div>
    );
  }

  const aguardandoAssinatura = cedentes.filter((c) => !c.minuta_assinada).length;
  const prontos = cedentes.filter((c) => c.minuta_assinada).length;

  const statusBadge = (stage: string) => {
    if (stage === "ativo")
      return <Badge variant="default" className="gap-1 text-[10px] h-5"><CheckCircle2 className="h-3 w-3" /> Ativo</Badge>;
    if (stage === "inativo")
      return <Badge variant="secondary" className="gap-1 text-[10px] h-5">Inativo</Badge>;
    if (stage === "formalizacao")
      return <Badge variant="outline" className="gap-1 text-[10px] h-5 border-amber-500/40 text-amber-700 dark:text-amber-400">Em formalização</Badge>;
    return <Badge variant="outline" className="text-[10px] h-5">{stage}</Badge>;
  };

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-[18px] font-medium tracking-tight flex items-center gap-2">
          <FileSignature className="h-5 w-5" /> Formalização
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Geração da minuta padrão e controle de assinatura na ferramenta CRDC.
        </p>
      </header>

      <div className="grid gap-2 md:grid-cols-3">
        <StatCard label="Em formalização" value={cedentes.length} icon={<FileSignature className="h-3.5 w-3.5" />} />
        <StatCard label="Aguardando assinatura" value={aguardandoAssinatura} icon={<Clock className="h-3.5 w-3.5" />} highlight={aguardandoAssinatura > 0} />
        <StatCard label="Prontos para ativar" value={prontos} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="ativos" className="text-[11px] h-7">Em formalização ({cedentes.length})</TabsTrigger>
          <TabsTrigger value="historico" className="text-[11px] h-7">Contratos assinados ({historico.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos" className="mt-3">
          {cedentes.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <FileSignature className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">Nenhum cedente em formalização no momento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cedentes.map((c) => {
                const proposta = propostas[c.id];
                const dias = daysSince(c.updated_at);
                return (
                  <div key={c.id} className="rounded-lg border bg-card p-2.5 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-semibold tracking-tight flex items-center gap-2 leading-tight">
                          <Building2 className="h-3.5 w-3.5" /> {c.razao_social}
                        </h3>
                        <p className="text-[11px] text-muted-foreground font-mono leading-tight">CNPJ: {c.cnpj}</p>
                        {proposta && (
                          <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                            Proposta <span className="font-mono">{proposta.codigo}</span> • Aprovado {fmtBRL(proposta.valor_aprovado)}
                            {proposta.prazo_dias ? ` • ${proposta.prazo_dias}d` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.minuta_assinada ? (
                          <Badge variant="default" className="gap-1 text-[10px] h-5">
                            <CheckCircle2 className="h-3 w-3" /> Assinada
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">há {dias === 0 ? "<1d" : `${dias}d`}</span>
                      </div>
                    </div>

                    {!proposta && (
                      <div className="text-[11px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1.5 border border-amber-500/30">
                        Nenhuma proposta aprovada encontrada — a minuta sairá sem condições financeiras preenchidas.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {canGenerate && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => handleGerarPDF(c)}>
                          <Download className="h-3.5 w-3.5 mr-1.5" /> Gerar minuta (PDF)
                        </Button>
                      )}

                      {canSign && !c.minuta_assinada && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[11px]"
                          onClick={() => handleMarcarAssinada(c)}
                          disabled={busyId === c.id}
                        >
                          {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                          Marcar como assinada
                        </Button>
                      )}

                      {canSign && c.minuta_assinada && (
                        <Button size="sm" className="h-7 text-[11px]" onClick={() => handleAtivar(c)} disabled={busyId === c.id}>
                          {busyId === c.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
                          Ativar cedente
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" asChild>
                        <Link to={`/cedentes/${c.id}`}>Abrir cadastro</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por cedente, CNPJ ou código de proposta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-[12px]"
            />
          </div>

          {filteredHistorico.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-[12px] text-muted-foreground">
                {search ? "Nenhum contrato corresponde à busca." : "Nenhum contrato assinado ainda."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-2.5 py-1.5 font-medium">Cedente</th>
                    <th className="px-2.5 py-1.5 font-medium">CNPJ</th>
                    <th className="px-2.5 py-1.5 font-medium">Proposta</th>
                    <th className="px-2.5 py-1.5 font-medium text-right">Valor aprovado</th>
                    <th className="px-2.5 py-1.5 font-medium">Assinado em</th>
                    <th className="px-2.5 py-1.5 font-medium">Status</th>
                    <th className="px-2.5 py-1.5 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistorico.map((c) => {
                    const prop = propostas[c.id];
                    const dias = c.minuta_assinada_em ? daysSince(c.minuta_assinada_em) : null;
                    return (
                      <tr key={c.id} className="border-t hover:bg-muted/20">
                        <td className="px-2.5 py-1.5">
                          <Link to={`/cedentes/${c.id}?tab=formalizacao`} className="font-medium hover:underline">
                            {c.razao_social}
                          </Link>
                        </td>
                        <td className="px-2.5 py-1.5 font-mono text-muted-foreground">{c.cnpj}</td>
                        <td className="px-2.5 py-1.5 font-mono">{prop?.codigo ?? "—"}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{fmtBRL(prop?.valor_aprovado ?? null)}</td>
                        <td className="px-2.5 py-1.5">
                          <span>{fmtDate(c.minuta_assinada_em)}</span>
                          {dias !== null && (
                            <span className="text-muted-foreground ml-1">(há {dias === 0 ? "<1d" : `${dias}d`})</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5">{statusBadge(c.stage)}</td>
                        <td className="px-2.5 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canGenerate && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => handleGerarPDF(c)}>
                                <Download className="h-3.5 w-3.5 mr-1" /> Minuta
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" asChild>
                              <Link to={`/cedentes/${c.id}?tab=formalizacao`}>Abrir</Link>
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

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border bg-card p-2.5 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[16px] font-medium tracking-tight mt-1 tabular-nums leading-none">{value}</div>
    </div>
  );
}
