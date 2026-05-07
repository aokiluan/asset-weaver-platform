import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, FileText, ArrowRight, ThumbsUp, AlertTriangle, Loader2, Briefcase, Sparkles,
} from "lucide-react";

interface Props {
  cedenteId: string;
  proposalId: string;
}

interface Cedente {
  razao_social: string;
  cnpj: string;
  setor: string | null;
  faturamento_medio: number | null;
}

interface Proposal {
  valor_solicitado: number;
  prazo_dias: number | null;
  taxa_sugerida: number | null;
}

interface Visit {
  recomendacao: string | null;
  parecer_comercial: string | null;
  pontos_atencao: string | null;
  limite_global_solicitado: number | null;
  created_by: string | null;
}

interface Report {
  recomendacao: string | null;
  parecer_analista: string | null;
  pontos_positivos: string | null;
  pontos_atencao: string | null;
  conclusao: string | null;
  updated_by: string | null;
}

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const splitBullets = (txt: string | null | undefined): string[] => {
  if (!txt) return [];
  return txt
    .split(/\r?\n|•|–|- /)
    .map((s) => s.trim().replace(/^[-•*\s]+/, ""))
    .filter((s) => s.length > 2)
    .slice(0, 4);
};

const RECO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  aprovar: "default",
  aprovar_com_ressalvas: "secondary",
  rejeitar: "destructive",
  pendente: "outline",
};

const RECO_LABEL: Record<string, string> = {
  aprovar: "Aprovar",
  aprovar_com_ressalvas: "Aprovar com ressalvas",
  rejeitar: "Não aprovar",
  pendente: "Pendente",
};

const labelReco = (v: string | null | undefined) => {
  if (!v) return "Sem recomendação";
  return RECO_LABEL[v] ?? v;
};

const variantReco = (v: string | null | undefined) => RECO_VARIANT[v ?? ""] ?? "outline";

export function VoteBriefing({ cedenteId, proposalId }: Props) {
  const [loading, setLoading] = useState(true);
  const [cedente, setCedente] = useState<Cedente | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [c, p, v, r] = await Promise.all([
        supabase.from("cedentes").select("razao_social,cnpj,setor,faturamento_medio").eq("id", cedenteId).maybeSingle(),
        supabase.from("credit_proposals").select("valor_solicitado,prazo_dias,taxa_sugerida").eq("id", proposalId).maybeSingle(),
        supabase.from("cedente_visit_reports")
          .select("recomendacao,parecer_comercial,pontos_atencao,limite_global_solicitado,created_by")
          .eq("cedente_id", cedenteId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("credit_reports")
          .select("recomendacao,parecer_analista,pontos_positivos,pontos_atencao,conclusao,updated_by")
          .eq("cedente_id", cedenteId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!active) return;
      setCedente((c.data as any) ?? null);
      setProposal((p.data as any) ?? null);
      setVisit((v.data as any) ?? null);
      setReport((r.data as any) ?? null);

      const ids = [v.data?.created_by, r.data?.updated_by].filter(Boolean) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,nome").in("id", ids);
        if (active && profs) setAuthors(Object.fromEntries(profs.map((p: any) => [p.id, p.nome])));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [cedenteId, proposalId]);

  if (loading) {
    return (
      <Card className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando briefing…
      </Card>
    );
  }

  const positivos = splitBullets(report?.pontos_positivos);
  const atencao = splitBullets(report?.pontos_atencao ?? visit?.pontos_atencao);
  const conclusao = report?.conclusao ?? report?.parecer_analista ?? "";
  const conclusaoCurta = conclusao.length > 280 && !expanded ? conclusao.slice(0, 280).trimEnd() + "…" : conclusao;

  const valor = proposal?.valor_solicitado ?? visit?.limite_global_solicitado ?? null;

  return (
    <Card className="p-5 space-y-4 border-primary/20">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="uppercase tracking-wide font-medium">Briefing de votação</span>
          </div>
          <h3 className="text-base font-semibold flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            {cedente?.razao_social ?? "—"}
          </h3>
          <p className="text-[11px] text-muted-foreground font-mono">
            CNPJ {cedente?.cnpj} {cedente?.setor && <>· {cedente.setor}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline" className="font-normal">Pleito {fmtBRL(valor)}</Badge>
          {proposal?.prazo_dias && <Badge variant="outline" className="font-normal">{proposal.prazo_dias}d</Badge>}
          {proposal?.taxa_sugerida && <Badge variant="outline" className="font-normal">Taxa {proposal.taxa_sugerida}%</Badge>}
        </div>
      </div>

      {/* Recomendações */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" /> Comercial
          </div>
          <Badge variant={variantReco(visit?.recomendacao)} className="text-xs">
            {labelReco(visit?.recomendacao)}
          </Badge>
          <p className="text-[11px] text-muted-foreground truncate">
            {visit?.created_by ? `por ${authors[visit.created_by] ?? "comercial"}` : "—"}
          </p>
        </div>
        <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Crédito
          </div>
          <Badge variant={variantReco(report?.recomendacao)} className="text-xs">
            {labelReco(report?.recomendacao)}
          </Badge>
          <p className="text-[11px] text-muted-foreground truncate">
            {report?.updated_by ? `por ${authors[report.updated_by] ?? "analista"}` : "—"}
          </p>
        </div>
      </div>

      {/* Pontos */}
      {(positivos.length > 0 || atencao.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <ThumbsUp className="h-3.5 w-3.5" /> Pontos positivos
              {positivos.length > 0 && <span className="text-muted-foreground font-normal">({positivos.length})</span>}
            </div>
            {positivos.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Não destacados.</p>
            ) : (
              <ul className="text-xs space-y-1">
                {positivos.map((b, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">•</span><span className="flex-1">{b}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Pontos de atenção
              {atencao.length > 0 && <span className="text-muted-foreground font-normal">({atencao.length})</span>}
            </div>
            {atencao.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum levantado.</p>
            ) : (
              <ul className="text-xs space-y-1">
                {atencao.map((b, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">•</span><span className="flex-1">{b}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Conclusão */}
      {conclusao && (
        <div className="space-y-1 pt-1 border-t">
          <div className="text-xs text-muted-foreground">Conclusão do analista</div>
          <p className="text-sm leading-snug whitespace-pre-wrap">{conclusaoCurta}</p>
          {conclusao.length > 280 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </div>
      )}

      {/* Atalhos para os pareceres completos */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button asChild size="sm" variant="outline">
          <Link to={`/cedentes/${cedenteId}?tab=visita`}>
            Relatório comercial completo <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={`/cedentes/${cedenteId}?tab=credito`}>
            Análise de crédito completa <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
