import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSignature,
  Loader2,
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

const daysSince = (s: string) =>
  Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);

export default function Formalizacao() {
  const { user, hasRole } = useAuth();
  const [cedentes, setCedentes] = useState<CedenteRow[]>([]);
  const [propostas, setPropostas] = useState<Record<string, PropostaAprovada>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canSign =
    hasRole("admin") || hasRole("formalizacao") || hasRole("gestor_geral");

  useEffect(() => {
    document.title = "Formalização | Securitizadora";
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cedentes")
      .select(
        "id,razao_social,nome_fantasia,cnpj,email,telefone,endereco,cidade,estado,cep,setor,faturamento_medio,stage,minuta_assinada,minuta_assinada_em,updated_at",
      )
      .eq("stage", "formalizacao")
      .order("updated_at", { ascending: true });

    if (error) {
      setLoading(false);
      toast.error("Erro ao carregar", { description: error.message });
      return;
    }

    const list = (data as CedenteRow[]) ?? [];
    setCedentes(list);

    if (list.length > 0) {
      const ids = list.map((c) => c.id);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando formalização...
      </div>
    );
  }

  const aguardandoAssinatura = cedentes.filter((c) => !c.minuta_assinada).length;
  const prontos = cedentes.filter((c) => c.minuta_assinada).length;

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-[20px] font-medium tracking-tight flex items-center gap-2">
          <FileSignature className="h-6 w-6" /> Formalização
        </h1>
        <p className="text-sm text-muted-foreground">
          Geração da minuta padrão e controle de assinatura na ferramenta CRDC.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Em formalização" value={cedentes.length} icon={<FileSignature className="h-4 w-4" />} />
        <StatCard label="Aguardando assinatura" value={aguardandoAssinatura} icon={<Clock className="h-4 w-4" />} highlight={aguardandoAssinatura > 0} />
        <StatCard label="Prontos para ativar" value={prontos} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {cedentes.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileSignature className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum cedente em formalização no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cedentes.map((c) => {
            const proposta = propostas[c.id];
            const dias = daysSince(c.updated_at);
            return (
              <div key={c.id} className="rounded-lg border bg-card p-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> {c.razao_social}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">CNPJ: {c.cnpj}</p>
                    {proposta && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Proposta <span className="font-mono">{proposta.codigo}</span> • Aprovado {fmtBRL(proposta.valor_aprovado)}
                        {proposta.prazo_dias ? ` • ${proposta.prazo_dias}d` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.minuta_assinada ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Assinada
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" /> Pendente assinatura
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">há {dias === 0 ? "<1d" : `${dias}d`}</span>
                  </div>
                </div>

                {!proposta && (
                  <div className="text-xs rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-2 border border-amber-500/30">
                    Nenhuma proposta aprovada encontrada para este cedente — a minuta sairá sem condições financeiras preenchidas.
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleGerarPDF(c)}>
                    <Download className="h-4 w-4 mr-2" /> Gerar minuta (PDF)
                  </Button>

                  {canSign && !c.minuta_assinada && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleMarcarAssinada(c)}
                      disabled={busyId === c.id}
                    >
                      {busyId === c.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Marcar como assinada
                    </Button>
                  )}

                  {canSign && c.minuta_assinada && (
                    <Button size="sm" onClick={() => handleAtivar(c)} disabled={busyId === c.id}>
                      {busyId === c.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                      Ativar cedente
                    </Button>
                  )}

                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/cedentes/${c.id}`}>Abrir cadastro</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
    <div className={`rounded-lg border bg-card p-3 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-[20px] font-medium tracking-tight mt-1 tabular-nums">{value}</div>
    </div>
  );
}
