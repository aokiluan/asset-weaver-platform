import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { History, Eye, Loader2, FileDown } from "lucide-react";
import { generateCreditReportPdf } from "@/lib/credit-report-pdf";
import { toast } from "sonner";
import { SECTION_ORDER, SECTION_LABEL, SECTION_FIELDS, RECOMENDACAO_OPTIONS } from "@/lib/credit-report";

interface Props {
  reportId: string | null;
  cedenteNome?: string;
  refreshKey?: number;
}

interface VersionRow {
  id: string;
  versao: number;
  is_current: boolean;
  motivo_alteracao: string | null;
  created_at: string;
  created_by: string;
  identificacao: any;
  empresa: any;
  rede_societaria: any;
  carteira: any;
  restritivos: any;
  financeiro: any;
  due_diligence: any;
  pleito: any;
  attachments_top: any;
  parecer_analista: string | null;
  pontos_positivos: string | null;
  pontos_atencao: string | null;
  conclusao: string | null;
  recomendacao: string | null;
}

export function CreditReportVersionsPanel({ reportId, cedenteNome, refreshKey }: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!reportId) { setVersions([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("credit_report_versions" as any)
        .select("*")
        .eq("report_id", reportId)
        .order("versao", { ascending: false });
      const list = (data as any as VersionRow[]) || [];
      setVersions(list);
      const ids = Array.from(new Set(list.map((v) => v.created_by).filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.nome; });
        setAuthors(map);
      }
      setLoading(false);
    })();
  }, [reportId, refreshKey]);

  const opened = versions.find((v) => v.id === openId) || null;

  const handleGerarPdf = async () => {
    if (!opened) return;
    setGenerating(true);
    try {
      await generateCreditReportPdf(opened, `${cedenteNome ?? ""} (v${opened.versao})`);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e?.message });
    } finally {
      setGenerating(false);
    }
  };

  if (!reportId) return null;
  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" /> Carregando histórico...</div>;
  }
  if (!versions.length) return null;

  return (
    <>
      <Accordion type="single" collapsible className="space-y-0.5">
        <AccordionItem value="versoes" className="border rounded-lg bg-card px-3">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-3 w-3" />
              Histórico de versões
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[18px]">{versions.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-md px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[13px] font-medium">v{v.versao}</span>
                      {v.is_current && <Badge className="text-[10px] px-1.5 py-0 h-[18px]">atual</Badge>}
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString("pt-BR")}
                      </span>
                      {authors[v.created_by] && (
                        <span className="text-[11px] text-muted-foreground">· {authors[v.created_by]}</span>
                      )}
                      {v.motivo_alteracao && (
                        <span className="text-[11px] text-muted-foreground truncate min-w-0" title={v.motivo_alteracao}>
                          · Motivo: {v.motivo_alteracao}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setOpenId(v.id)}>
                    <Eye className="h-3 w-3 mr-1" /> Ver
                  </Button>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={!!opened} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-8">
              <span>
                Versão {opened?.versao} {opened?.is_current && <Badge className="ml-2 text-[10px]">atual</Badge>}
              </span>
              <Button size="sm" variant="outline" onClick={handleGerarPdf} disabled={generating || !opened}>
                {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1" />}
                Gerar PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {opened && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {new Date(opened.created_at).toLocaleString("pt-BR")}
                {authors[opened.created_by] && ` · ${authors[opened.created_by]}`}
              </div>
              {opened.motivo_alteracao && (
                <div className="border rounded-md p-3 bg-muted/30">
                  <p className="text-xs font-medium mb-1">Motivo da alteração</p>
                  <p className="text-sm whitespace-pre-wrap">{opened.motivo_alteracao}</p>
                </div>
              )}
              {SECTION_ORDER.map((key) => {
                const data = (opened as any)[key] || {};
                const fields = SECTION_FIELDS[key];
                const filled = fields.filter((f) => data[f.key] !== undefined && data[f.key] !== "" && data[f.key] !== null);
                if (!filled.length) return null;
                return (
                  <div key={key} className="border rounded-md p-3">
                    <p className="text-xs font-semibold mb-2">{SECTION_LABEL[key]}</p>
                    <div className="space-y-1.5">
                      {filled.map((f) => (
                        <div key={f.key}>
                          <p className="text-[11px] font-medium text-muted-foreground">{f.label}</p>
                          <p className="text-sm whitespace-pre-wrap">{String(data[f.key])}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-semibold">Pareceres e conclusão</p>
                {opened.parecer_analista && <Field label="Parecer analista" value={opened.parecer_analista} />}
                {opened.pontos_positivos && <Field label="Pontos positivos" value={opened.pontos_positivos} />}
                {opened.pontos_atencao && <Field label="Pontos de atenção" value={opened.pontos_atencao} />}
                {opened.conclusao && <Field label="Conclusão" value={opened.conclusao} />}
                {opened.recomendacao && (
                  <Field label="Recomendação" value={RECOMENDACAO_OPTIONS.find((o) => o.value === opened.recomendacao)?.label ?? opened.recomendacao} />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
