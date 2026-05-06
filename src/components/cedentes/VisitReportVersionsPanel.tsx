import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { History, Eye, Loader2 } from "lucide-react";

interface Props {
  reportId: string | null;
  refreshKey?: number;
}

interface VersionRow {
  id: string;
  versao: number;
  is_current: boolean;
  motivo_alteracao: string | null;
  created_at: string;
  created_by: string;
  data_visita: string | null;
  parecer_comercial: string | null;
  pontos_atencao: string | null;
  limite_global_solicitado: number | null;
  modalidades: any;
  empresas_ligadas: any;
  avalistas_solidarios: any;
  fotos: any;
  tipo_visita: string | null;
  visitante: string | null;
  entrevistado_nome: string | null;
}

export function VisitReportVersionsPanel({ reportId, refreshKey }: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) { setVersions([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("cedente_visit_report_versions" as any)
        .select("*")
        .eq("report_id", reportId)
        .order("versao", { ascending: false });
      const list = (data as any as VersionRow[]) || [];
      setVersions(list);
      const ids = Array.from(new Set(list.map((v) => v.created_by).filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.nome; });
        setAuthors(map);
      }
      setLoading(false);
    })();
  }, [reportId, refreshKey]);

  if (!reportId) return null;
  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" /> Carregando histórico...</div>;
  }
  if (!versions.length) return null;

  const opened = versions.find((v) => v.id === openId) || null;

  return (
    <>
      <div className="border rounded-md">
        <Accordion type="single" collapsible>
          <AccordionItem value="versoes" className="border-0 px-4">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de versões
                <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{v.versao}</span>
                        {v.is_current && <Badge className="text-[10px]">atual</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleString("pt-BR")}
                        </span>
                        {authors[v.created_by] && (
                          <span className="text-xs text-muted-foreground">· {authors[v.created_by]}</span>
                        )}
                      </div>
                      {v.motivo_alteracao && (
                        <p className="text-xs text-muted-foreground truncate" title={v.motivo_alteracao}>
                          Motivo: {v.motivo_alteracao}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setOpenId(v.id)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Dialog open={!!opened} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versão {opened?.versao} {opened?.is_current && <Badge className="ml-2 text-[10px]">atual</Badge>}
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
              <Field label="Data da visita" value={opened.data_visita} />
              <Field label="Tipo" value={opened.tipo_visita} />
              <Field label="Visitante" value={opened.visitante} />
              <Field label="Entrevistado" value={opened.entrevistado_nome} />
              <Field label="Limite solicitado" value={opened.limite_global_solicitado != null ? `R$ ${opened.limite_global_solicitado}` : null} />
              <Field label="Parecer comercial" value={opened.parecer_comercial} multiline />
              <Field label="Pontos de atenção" value={opened.pontos_atencao} multiline />
              {Array.isArray(opened.empresas_ligadas) && opened.empresas_ligadas.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Empresas ligadas</p>
                  <ul className="text-xs list-disc pl-4 space-y-0.5">
                    {opened.empresas_ligadas.map((e: any, i: number) => (
                      <li key={i}>{e.nome} — {e.cnpj} ({e.relacao})</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(opened.avalistas_solidarios) && opened.avalistas_solidarios.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Avalistas</p>
                  <ul className="text-xs list-disc pl-4 space-y-0.5">
                    {opened.avalistas_solidarios.map((a: any, i: number) => (
                      <li key={i}>{a.nome} — {a.cpf}</li>
                    ))}
                  </ul>
                </div>
              )}
              {opened.modalidades && (
                <div>
                  <p className="text-xs font-medium mb-1">Modalidades ativas</p>
                  <ul className="text-xs list-disc pl-4 space-y-0.5">
                    {Object.entries(opened.modalidades as Record<string, any>)
                      .filter(([, m]) => m?.ativo)
                      .map(([k, m]: any) => (
                        <li key={k}>
                          {k} — Limite: {m.limite || "-"} | Prazo: {m.prazo_medio || "-"}d | Taxa: {m.taxa || "-"}%
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, multiline }: { label: string; value: any; multiline?: boolean }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-sm ${multiline ? "whitespace-pre-wrap" : ""}`}>{String(value)}</p>
    </div>
  );
}
