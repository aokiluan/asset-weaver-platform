import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, FileText, ThumbsUp, AlertTriangle, Loader2, Briefcase, Sparkles, CheckSquare, Square, BookOpen, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { generateVisitReportPdf } from "@/lib/visit-report-pdf";
import { generateCreditReportPdf } from "@/lib/credit-report-pdf";
import { PdfReadingDialog, type ReadingItemKey } from "./PdfReadingDialog";
import { toast } from "sonner";

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

interface ModalidadeFull {
  ativo?: boolean;
  limite?: string | number | null;
  prazo_medio?: string | number | null;
  taxa?: string | number | null;
  observacao?: string | null;
}

interface Modalidades {
  desconto_convencional?: ModalidadeFull;
  comissaria?: ModalidadeFull;
  comissaria_escrow?: ModalidadeFull;
  nota_comercial?: ModalidadeFull;
}

interface Visit {
  recomendacao: string | null;
  parecer_comercial: string | null;
  pontos_atencao: string | null;
  limite_global_solicitado: number | null;
  modalidades: Modalidades | null;
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cedente, setCedente] = useState<Cedente | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  // Estado do leitor de PDF
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerTitle, setReaderTitle] = useState("");
  const [readerKey, setReaderKey] = useState<ReadingItemKey>("lido_relatorio_comercial");
  const [readDone, setReadDone] = useState<Record<ReadingItemKey, boolean>>({
    lido_relatorio_comercial: false,
    lido_analise_credito: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [c, p, v, r] = await Promise.all([
        supabase.from("cedentes").select("razao_social,cnpj,setor,faturamento_medio").eq("id", cedenteId).maybeSingle(),
        supabase.from("credit_proposals").select("valor_solicitado,prazo_dias,taxa_sugerida").eq("id", proposalId).maybeSingle(),
        supabase.from("cedente_visit_reports")
          .select("recomendacao,parecer_comercial,pontos_atencao,limite_global_solicitado,modalidades,created_by")
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

      // Carrega itens já lidos pelo usuário corrente
      if (user && proposalId) {
        const { data: chk } = await supabase
          .from("committee_vote_checklist")
          .select("item_key")
          .eq("proposal_id", proposalId)
          .eq("voter_id", user.id)
          .in("item_key", ["lido_relatorio_comercial", "lido_analise_credito"]);
        if (active && chk) {
          const map = { lido_relatorio_comercial: false, lido_analise_credito: false } as Record<ReadingItemKey, boolean>;
          chk.forEach((row: any) => { map[row.item_key as ReadingItemKey] = true; });
          setReadDone(map);
        }
      }

      setLoading(false);
    })();
    return () => { active = false; };
  }, [cedenteId, proposalId, user]);

  // Cleanup do object URL ao trocar / desmontar
  useEffect(() => {
    return () => {
      if (readerUrl) URL.revokeObjectURL(readerUrl);
    };
  }, [readerUrl]);

  const openVisitPdf = async () => {
    setReaderTitle(`Relatório comercial — ${cedente?.razao_social ?? ""}`);
    setReaderKey("lido_relatorio_comercial");
    setReaderLoading(true);
    setReaderOpen(true);
    if (readerUrl) { URL.revokeObjectURL(readerUrl); setReaderUrl(null); }
    try {
      const { data } = await supabase
        .from("cedente_visit_reports")
        .select("*")
        .eq("cedente_id", cedenteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) { toast.error("Relatório comercial não encontrado"); setReaderOpen(false); return; }
      const res = await generateVisitReportPdf(data as any, cedenteId, undefined, "blob");
      if (res) setReaderUrl(res.url);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e?.message });
      setReaderOpen(false);
    } finally {
      setReaderLoading(false);
    }
  };

  const openCreditPdf = async () => {
    setReaderTitle(`Análise de crédito — ${cedente?.razao_social ?? ""}`);
    setReaderKey("lido_analise_credito");
    setReaderLoading(true);
    setReaderOpen(true);
    if (readerUrl) { URL.revokeObjectURL(readerUrl); setReaderUrl(null); }
    try {
      const { data } = await supabase
        .from("credit_reports")
        .select("*")
        .eq("cedente_id", cedenteId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) { toast.error("Análise de crédito não encontrada"); setReaderOpen(false); return; }
      const res = await generateCreditReportPdf(data as any, cedente?.razao_social, "blob");
      if (res) setReaderUrl(res.url);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e?.message });
      setReaderOpen(false);
    } finally {
      setReaderLoading(false);
    }
  };

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
    <Card className="p-5 space-y-3 border-primary/20">
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
          {proposal?.prazo_dias && <Badge variant="outline" className="font-normal">{proposal.prazo_dias}d</Badge>}
          {proposal?.taxa_sugerida && <Badge variant="outline" className="font-normal">Taxa {proposal.taxa_sugerida}%</Badge>}
        </div>
      </div>

      {/* Pleito de crédito */}
      <PleitoCard
        limiteGlobal={visit?.limite_global_solicitado ?? proposal?.valor_solicitado ?? null}
        modalidades={visit?.modalidades ?? null}
      />

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

      {/* Atalhos para os pareceres completos (leitura obrigatória) */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button
          size="sm"
          variant={readDone.lido_relatorio_comercial ? "secondary" : "outline"}
          onClick={openVisitPdf}
        >
          {readDone.lido_relatorio_comercial
            ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
            : <BookOpen className="h-3.5 w-3.5 mr-1" />}
          Relatório comercial {readDone.lido_relatorio_comercial ? "(lido)" : "completo"}
        </Button>
        <Button
          size="sm"
          variant={readDone.lido_analise_credito ? "secondary" : "outline"}
          onClick={openCreditPdf}
        >
          {readDone.lido_analise_credito
            ? <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
            : <BookOpen className="h-3.5 w-3.5 mr-1" />}
          Análise de crédito {readDone.lido_analise_credito ? "(lida)" : "completa"}
        </Button>
      </div>

      <PdfReadingDialog
        open={readerOpen}
        onOpenChange={(v) => {
          setReaderOpen(v);
          if (!v && readerUrl) { URL.revokeObjectURL(readerUrl); setReaderUrl(null); }
        }}
        title={readerTitle}
        pdfUrl={readerUrl}
        loading={readerLoading}
        proposalId={proposalId}
        itemKey={readerKey}
        alreadyConfirmed={readDone[readerKey]}
        onConfirmed={() => setReadDone((m) => ({ ...m, [readerKey]: true }))}
      />
    </Card>
  );
}

const MOD_LABELS: Array<{ key: keyof Modalidades; label: string }> = [
  { key: "desconto_convencional", label: "Desconto convencional" },
  { key: "comissaria", label: "Comissária" },
  { key: "comissaria_escrow", label: "Comissária com conta escrow" },
  { key: "nota_comercial", label: "Nota comercial" },
];

function PleitoCard({
  limiteGlobal,
  modalidades,
}: {
  limiteGlobal: number | null;
  modalidades: Modalidades | null;
}) {
  const items = MOD_LABELS.map((m) => ({ ...m, mod: modalidades?.[m.key] }));
  const ativas = items.filter((i) => i.mod?.ativo);
  const inativas = items.filter((i) => !i.mod?.ativo);

  if (limiteGlobal == null && ativas.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/10 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
          Pleito de crédito
        </div>
        {limiteGlobal != null && (
          <div className="text-[12px] leading-tight">
            <span className="text-muted-foreground">Limite global solicitado: </span>
            <span className="font-semibold tabular-nums">{fmtBRL(limiteGlobal)}</span>
          </div>
        )}
      </div>

      {ativas.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {ativas.map(({ key, label, mod }) => (
            <div key={key} className="rounded-md border bg-background p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[12px] font-medium leading-tight">
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                {label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Limite (R$)" value={mod?.limite != null && mod?.limite !== "" ? Number(mod.limite).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"} />
                <Field label="Prazo (dias)" value={mod?.prazo_medio != null && mod?.prazo_medio !== "" ? `${mod.prazo_medio}` : "—"} />
                <Field label="Taxa (% a.m.)" value={mod?.taxa != null && mod?.taxa !== "" ? `${mod.taxa}` : "—"} />
              </div>
              {mod?.observacao && (
                <div>
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Observação</div>
                  <div className="text-[12px] leading-tight whitespace-pre-wrap">{mod.observacao}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inativas.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t">
          {inativas.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Square className="h-3 w-3" />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</div>
      <div className="text-[12px] leading-tight tabular-nums">{value}</div>
    </div>
  );
}

