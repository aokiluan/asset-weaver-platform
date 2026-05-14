import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTabs } from "@/components/PageTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ChevronRight, Trash2, FileText, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import {
  BOLETA_STATUS_LABEL, BOLETA_STATUS_VARIANT, BOLETA_STEPS, fmtBRL,
  isClosedStatus, type InvestorBoleta, type InvestorSeries,
} from "@/lib/investor-boletas";
import { type InvestorContact } from "@/lib/investor-contacts";
import { resolveInvestorName } from "@/lib/investor-name";
import { BoletaWizardSheet } from "./BoletaWizardSheet";
import { BoletaConcluidaSheet } from "./BoletaConcluidaSheet";

export default function InvestidoresBoletas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boletas, setBoletas] = useState<InvestorBoleta[]>([]);
  const [contacts, setContacts] = useState<InvestorContact[]>([]);
  const [extraContacts, setExtraContacts] = useState<InvestorContact[]>([]);
  const [series, setSeries] = useState<InvestorSeries[]>([]);
  const [search, setSearch] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContact, setWizardContact] = useState<InvestorContact | null>(null);
  const [wizardBoleta, setWizardBoleta] = useState<InvestorBoleta | null>(null);

  const [viewBoleta, setViewBoleta] = useState<InvestorBoleta | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Boletas | Relação com Investidores";
  }, []);

  async function load() {
    setLoading(true);
    const [b, c, s] = await Promise.all([
      supabase.from("investor_boletas").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("investor_contacts")
        .select("*")
        .eq("stage", "boleta_em_andamento")
        .order("name"),
      supabase.from("investor_series").select("*").eq("ativa", true).order("ordem"),
    ]);
    setBoletas((b.data ?? []) as unknown as InvestorBoleta[]);
    setContacts((c.data ?? []) as InvestorContact[]);
    setSeries((s.data ?? []) as InvestorSeries[]);

    // Carrega contatos referenciados em boletas concluídas (não estão no funil ativo)
    const closedIds = Array.from(
      new Set(((b.data ?? []) as any[])
        .filter((x) => x.status === "concluida" || x.status === "cancelada")
        .map((x) => x.contact_id)),
    );
    const inFunil = new Set(((c.data ?? []) as any[]).map((x) => x.id));
    const missing = closedIds.filter((id) => !inFunil.has(id));
    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from("investor_contacts").select("*").in("id", missing);
      setExtraContacts((extra ?? []) as InvestorContact[]);
    } else {
      setExtraContacts([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  const seriesById = useMemo(() => {
    const m = new Map<string, InvestorSeries>();
    series.forEach((s) => m.set(s.id, s));
    return m;
  }, [series]);

  // boleta aberta (não concluída/cancelada) mais recente por contato
  const activeBoletaByContact = useMemo(() => {
    const m = new Map<string, InvestorBoleta>();
    for (const b of boletas) {
      if (isClosedStatus(b.status)) continue;
      if (!m.has(b.contact_id)) m.set(b.contact_id, b);
    }
    return m;
  }, [boletas]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name?.toLowerCase().includes(q));
  }, [contacts, search]);

  type Row = { contact: InvestorContact; boleta: InvestorBoleta | null };
  const rows: Row[] = useMemo(
    () => filteredContacts.map((c) => ({ contact: c, boleta: activeBoletaByContact.get(c.id) ?? null })),
    [filteredContacts, activeBoletaByContact],
  );

  const aguardando = rows.filter((r) => !r.boleta || r.boleta.status === "rascunho");
  const emAndamento = rows.filter(
    (r) => r.boleta && r.boleta.status !== "rascunho",
  );

  const concluidasRecentes = useMemo(
    () => boletas.filter((b) => b.status === "concluida").slice(0, 10),
    [boletas],
  );

  const metrics = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const concluidasMes = boletas.filter(
      (b) => b.status === "concluida" && b.concluida_em && new Date(b.concluida_em) >= monthStart,
    ).length;
    const valorPipeline = rows.reduce((a, r) => a + (r.boleta?.valor ?? 0), 0);
    return {
      aguardando: aguardando.length,
      emAndamento: emAndamento.length,
      valorPipeline,
      concluidasMes,
    };
  }, [rows, aguardando.length, emAndamento.length, boletas]);

  function openRow(row: Row) {
    setWizardContact(row.contact);
    setWizardBoleta(row.boleta);
    setWizardOpen(true);
  }

  function contactById(id: string) {
    return contacts.find((c) => c.id === id) ?? extraContacts.find((c) => c.id === id);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("investor_boletas").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
    } else {
      toast.success("Boleta excluída");
      load();
    }
    setDeleteId(null);
  }

  return (
    <div>
      <PageTabs
        title="Relação com Investidores"
        tabs={[
          { label: "CRM de Prospecção", to: "/investidores/crm" },
          { label: "Boletas", to: "/investidores/boletas" },
        ]}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Aguardando início" value={String(metrics.aguardando)} />
          <Metric label="Em andamento" value={String(metrics.emAndamento)} />
          <Metric label="Valor em pipeline" value={fmtBRL(metrics.valorPipeline)} />
          <Metric label="Concluídas no mês" value={String(metrics.concluidasMes)} />
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome do contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 max-w-xs text-[12px]"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-[12px] text-muted-foreground/80 text-center py-12 border border-dashed rounded-md">
            Nenhum contato no estágio "Boleta em andamento". Mova um contato pelo CRM para começar.
          </div>
        ) : (
          <div className="space-y-4">
            <Section title="Aguardando início">
              {aguardando.map((r) => (
                <ContactBoletaCard
                  key={r.contact.id}
                  row={r}
                  series={r.boleta?.series_id ? seriesById.get(r.boleta.series_id) : undefined}
                  onOpen={() => openRow(r)}
                  onDelete={r.boleta ? () => setDeleteId(r.boleta!.id) : undefined}
                />
              ))}
              {aguardando.length === 0 && <EmptyRow text="Todos os contatos já iniciaram sua boleta." />}
            </Section>

            <Section title="Em andamento">
              {emAndamento.map((r) => (
                <ContactBoletaCard
                  key={r.contact.id}
                  row={r}
                  series={r.boleta?.series_id ? seriesById.get(r.boleta.series_id) : undefined}
                  onOpen={() => openRow(r)}
                />
              ))}
              {emAndamento.length === 0 && <EmptyRow text="Nenhuma boleta em andamento." />}
            </Section>

            {concluidasRecentes.length > 0 && (
              <Section title="Concluídas recentes">
                {concluidasRecentes.map((b) => {
                  const c = contactById(b.contact_id);
                  return (
                    <Card
                      key={b.id}
                      className="p-2.5 hover:border-primary/40 cursor-pointer transition-colors"
                      onClick={() => setViewBoleta(b)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-[12px] font-medium truncate">{resolveInvestorName(c, b)}</div>
                            <Badge variant={BOLETA_STATUS_VARIANT[b.status]} className="text-[9px] h-4 px-1.5">
                              {BOLETA_STATUS_LABEL[b.status]}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                            {b.series_id ? seriesById.get(b.series_id)?.nome ?? "Série" : "Sem série"} · {fmtBRL(b.valor)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  );
                })}
              </Section>
            )}
          </div>
        )}
      </div>

      <BoletaWizardSheet
        open={wizardOpen}
        onOpenChange={(v) => {
          setWizardOpen(v);
          if (!v) load();
        }}
        contact={wizardContact}
        boleta={wizardBoleta}
        onSaved={load}
      />

      <BoletaConcluidaSheet
        open={!!viewBoleta}
        onOpenChange={(v) => { if (!v) setViewBoleta(null); }}
        boleta={viewBoleta}
        contact={viewBoleta ? contactById(viewBoleta.contact_id) ?? null : null}
        series={viewBoleta?.series_id ? seriesById.get(viewBoleta.series_id) : undefined}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir boleta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contato continuará no funil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">{label}</div>
      <div className="text-[16px] font-medium text-foreground leading-tight mt-1.5">{value}</div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="text-[11px] text-muted-foreground/70 text-center py-4 border border-dashed rounded-md">
      {text}
    </div>
  );
}

function ContactBoletaCard({
  row, series, onOpen, onDelete,
}: {
  row: { contact: InvestorContact; boleta: InvestorBoleta | null };
  series: InvestorSeries | undefined;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const { contact, boleta } = row;
  const step = boleta?.current_step ?? 1;
  const stepLabel = BOLETA_STEPS.find((s) => s.id === step)?.label ?? "—";
  const cta = !boleta
    ? "Iniciar boleta"
    : boleta.status === "rascunho"
      ? `Continuar — ${stepLabel}`
      : `Avançar — ${stepLabel}`;

  return (
    <Card
      className="p-2.5 hover:border-primary/40 cursor-pointer transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {boleta ? <FileText className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[12px] font-medium truncate">{contact.name}</div>
            {boleta ? (
              <Badge variant={BOLETA_STATUS_VARIANT[boleta.status]} className="text-[9px] h-4 px-1.5">
                {BOLETA_STATUS_LABEL[boleta.status]}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5">Não iniciada</Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
            {boleta
              ? <>{series?.nome ?? "Sem série"} · {fmtBRL(boleta.valor)} · Etapa {step}/{BOLETA_STEPS.length} · {stepLabel}</>
              : <>Sem boleta — pronta para iniciar</>}
          </div>
        </div>
        <Button
          size="sm"
          variant={boleta ? "outline" : "default"}
          className="h-7 text-[11px] hidden sm:inline-flex"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          {cta}
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
}
