import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageTabs } from "@/components/PageTabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, ChevronRight, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  BOLETA_STATUS_LABEL, BOLETA_STATUS_VARIANT, fmtBRL,
  isClosedStatus, isInProgressStatus, isOpenStatus,
  type InvestorBoleta, type InvestorSeries,
} from "@/lib/investor-boletas";
import { STAGE_LABEL, type InvestorContact } from "@/lib/investor-contacts";
import { BoletaWizardSheet } from "./BoletaWizardSheet";

export default function InvestidoresBoletas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boletas, setBoletas] = useState<InvestorBoleta[]>([]);
  const [contacts, setContacts] = useState<InvestorContact[]>([]);
  const [series, setSeries] = useState<InvestorSeries[]>([]);
  const [search, setSearch] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardContact, setWizardContact] = useState<InvestorContact | null>(null);
  const [wizardBoleta, setWizardBoleta] = useState<InvestorBoleta | null>(null);

  const [pickContactOpen, setPickContactOpen] = useState(false);
  const [pickContactId, setPickContactId] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Boletas | Relação com Investidores";
  }, []);

  async function load() {
    setLoading(true);
    const [b, c, s] = await Promise.all([
      supabase.from("investor_boletas").select("*").order("updated_at", { ascending: false }),
      supabase.from("investor_contacts").select("*").order("name"),
      supabase.from("investor_series").select("*").eq("ativa", true).order("ordem"),
    ]);
    setBoletas((b.data ?? []) as unknown as InvestorBoleta[]);
    setContacts((c.data ?? []) as InvestorContact[]);
    setSeries((s.data ?? []) as InvestorSeries[]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  const contactById = useMemo(() => {
    const m = new Map<string, InvestorContact>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);
  const seriesById = useMemo(() => {
    const m = new Map<string, InvestorSeries>();
    series.forEach((s) => m.set(s.id, s));
    return m;
  }, [series]);

  const filtered = useMemo(() => {
    if (!search.trim()) return boletas;
    const q = search.trim().toLowerCase();
    return boletas.filter((b) => {
      const c = contactById.get(b.contact_id);
      return c?.name?.toLowerCase().includes(q);
    });
  }, [boletas, search, contactById]);

  const drafts = filtered.filter((b) => isOpenStatus(b.status));
  const inProgress = filtered.filter((b) => isInProgressStatus(b.status));
  const closed = filtered.filter((b) => isClosedStatus(b.status));

  // contatos que estão no estágio boleta_em_andamento
  const eligibleContacts = useMemo(
    () => contacts.filter((c) => c.stage === "boleta_em_andamento"),
    [contacts],
  );

  const metrics = useMemo(() => {
    const open = [...drafts, ...inProgress];
    const valorPipeline = open.reduce((a, b) => a + (b.valor ?? 0), 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const concluidasMes = closed.filter(
      (b) => b.status === "concluida" && b.concluida_em && new Date(b.concluida_em) >= monthStart,
    ).length;
    return { totalAbertas: open.length, valorPipeline, concluidasMes };
  }, [drafts, inProgress, closed]);

  function openContinue(b: InvestorBoleta) {
    setWizardContact(contactById.get(b.contact_id) ?? null);
    setWizardBoleta(b);
    setWizardOpen(true);
  }

  function openNew() {
    setPickContactId(eligibleContacts[0]?.id ?? "");
    setPickContactOpen(true);
  }

  function startWizardWithPicked() {
    const c = contactById.get(pickContactId);
    if (!c) {
      toast.error("Selecione um contato");
      return;
    }
    setWizardContact(c);
    setWizardBoleta(null);
    setPickContactOpen(false);
    setWizardOpen(true);
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
        actions={
          <Button size="sm" className="h-7" onClick={openNew}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova boleta
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Metric label="Boletas em andamento" value={String(metrics.totalAbertas)} />
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
        ) : (
          <div className="space-y-4">
            <Section title="Rascunhos" empty="Nenhum rascunho.">
              {drafts.map((b) => (
                <BoletaCard
                  key={b.id}
                  boleta={b}
                  contact={contactById.get(b.contact_id)}
                  series={b.series_id ? seriesById.get(b.series_id) : undefined}
                  onContinue={() => openContinue(b)}
                  onDelete={() => setDeleteId(b.id)}
                  canDelete
                />
              ))}
              {drafts.length === 0 && <EmptyRow text="Nenhum rascunho." />}
            </Section>

            <Section title="Em andamento" empty="Nenhuma boleta em andamento.">
              {inProgress.map((b) => (
                <BoletaCard
                  key={b.id}
                  boleta={b}
                  contact={contactById.get(b.contact_id)}
                  series={b.series_id ? seriesById.get(b.series_id) : undefined}
                  onContinue={() => openContinue(b)}
                  onDelete={() => setDeleteId(b.id)}
                />
              ))}
              {inProgress.length === 0 && <EmptyRow text="Nenhuma boleta em andamento." />}
            </Section>

            {closed.length > 0 && (
              <Section title="Concluídas / Canceladas">
                {closed.slice(0, 20).map((b) => (
                  <BoletaCard
                    key={b.id}
                    boleta={b}
                    contact={contactById.get(b.contact_id)}
                    series={b.series_id ? seriesById.get(b.series_id) : undefined}
                    onContinue={() => openContinue(b)}
                    readOnly
                  />
                ))}
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

      <AlertDialog open={pickContactOpen} onOpenChange={setPickContactOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nova boleta</AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              Selecione um contato no estágio "{STAGE_LABEL.boleta_em_andamento}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={pickContactId} onValueChange={setPickContactId}>
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue placeholder="Selecione um contato" />
            </SelectTrigger>
            <SelectContent>
              {eligibleContacts.length === 0 && (
                <div className="text-[12px] text-muted-foreground p-2">
                  Nenhum contato em "Boleta em Andamento". Mova um contato no CRM primeiro.
                </div>
              )}
              {eligibleContacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={startWizardWithPicked} disabled={!pickContactId}>
              Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir boleta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty?: string }) {
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

function BoletaCard({
  boleta, contact, series, onContinue, onDelete, canDelete, readOnly,
}: {
  boleta: InvestorBoleta;
  contact: InvestorContact | undefined;
  series: InvestorSeries | undefined;
  onContinue: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  readOnly?: boolean;
}) {
  return (
    <Card
      className="p-2.5 hover:border-primary/40 cursor-pointer"
      onClick={onContinue}
    >
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[12px] font-medium truncate">{contact?.name ?? "—"}</div>
            <Badge variant={BOLETA_STATUS_VARIANT[boleta.status]} className="text-[9px] h-4 px-1.5">
              {BOLETA_STATUS_LABEL[boleta.status]}
            </Badge>
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
            {series?.nome ?? "Sem série"} · {fmtBRL(boleta.valor)}
            {!readOnly && ` · Etapa ${boleta.current_step}/4`}
          </div>
        </div>
        {canDelete && onDelete && (
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
