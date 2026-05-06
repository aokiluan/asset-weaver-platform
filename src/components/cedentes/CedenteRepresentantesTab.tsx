import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Users, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { SocioFormCard, type Socio } from "./SocioFormCard";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftIndicator } from "@/components/ui/draft-indicator";

interface Representante extends Socio {
  qualificacao?: string;
  participacao_capital?: number | null;
  fonte: string;
  sincronizado_em?: string | null;
  cedente_id?: string;
  dirty?: boolean;
}

interface Props {
  cedenteId: string;
  jaSincronizado: boolean;
  onSynced: () => void;
}

const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

// Campos opcionais que devem ser enviados como null quando vazios,
// para que o UPDATE realmente limpe valores no banco.
const NULLABLE_FIELDS: (keyof Representante)[] = [
  "sexo",
  "data_nascimento",
  "cpf",
  "rg",
  "orgao_emissor",
  "data_expedicao",
  "naturalidade",
  "nacionalidade",
  "nome_pai",
  "nome_mae",
  "endereco_logradouro",
  "endereco_numero",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_estado",
  "endereco_cep",
  "estado_civil",
  "conjuge_nome",
  "conjuge_sexo",
  "conjuge_data_nascimento",
  "conjuge_cpf",
  "conjuge_rg",
  "conjuge_orgao_emissor",
  "conjuge_data_expedicao",
  "conjuge_naturalidade",
  "conjuge_nacionalidade",
  "qualificacao",
];

const newEmptyRepresentante = (cedenteId: string): Representante => ({
  id: `tmp-${crypto.randomUUID()}`,
  persisted: false,
  cedente_id: cedenteId,
  nome: "",
  fonte: "manual",
  qualificacao: "",
  participacao_capital: null,
  dirty: true,
});

export function CedenteRepresentantesTab({ cedenteId, jaSincronizado, onSynced }: Props) {
  const [items, setItems] = useState<Representante[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  // Autosave: persiste apenas itens não-salvos ou com edições pendentes (dirty),
  // mesclando com os dados do servidor ao restaurar para não sobrescrever o que já está no banco.
  const { restored, lastSavedAt, clearDraft, discardDraft } = useFormDraft<Representante[]>({
    key: cedenteId ? `representantes:${cedenteId}` : null,
    value: items.filter((r) => r.dirty || !r.persisted),
    setValue: (draftItems) => {
      if (!Array.isArray(draftItems) || draftItems.length === 0) return;
      setItems((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]));
        for (const d of draftItems) {
          if (byId.has(d.id)) {
            byId.set(d.id, { ...byId.get(d.id)!, ...d, dirty: true });
          } else if (!d.persisted) {
            byId.set(d.id, { ...d, dirty: true });
          }
        }
        return Array.from(byId.values());
      });
    },
    enabled: !loading,
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cedente_representantes")
      .select("*")
      .eq("cedente_id", cedenteId)
      .order("nome");
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar representantes", { description: error.message });
      return;
    }
    setItems(
      ((data as any[]) ?? []).map((r) => ({ ...r, persisted: true, dirty: false })),
    );
  };

  // Sync inicial — chamado uma única vez quando o cedente ainda não tem
  // representantes sincronizados da Receita. Depois disso a edição é manual.
  const initialSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-representantes", {
      body: { cedente_id: cedenteId },
    });
    setSyncing(false);
    if (error || (data as any)?.error) {
      toast.error("Falha ao buscar na Receita", {
        description: error?.message || (data as any)?.error,
      });
      return;
    }
    const inseridos = (data as any)?.inseridos ?? (data as any)?.total ?? 0;
    if (inseridos > 0) {
      toast.success(`Representantes carregados da Receita (${inseridos})`);
    }
    await load();
    onSynced();
  };

  useEffect(() => {
    load();
  }, [cedenteId]);

  useEffect(() => {
    if (!loading && !jaSincronizado && !autoTried && !syncing) {
      setAutoTried(true);
      initialSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, jaSincronizado]);

  const updateLocal = (id: string, next: Representante) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...next, dirty: true } : r)));
  };

  const addNew = () => {
    setItems((prev) => [...prev, newEmptyRepresentante(cedenteId)]);
  };

  const removeOne = async (rep: Representante) => {
    if (!confirm(`Remover ${rep.nome || "este representante"}?`)) return;
    if (!rep.persisted) {
      setItems((prev) => prev.filter((r) => r.id !== rep.id));
      return;
    }
    const { error } = await supabase.from("cedente_representantes").delete().eq("id", rep.id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    toast.success("Representante removido");
    setItems((prev) => prev.filter((r) => r.id !== rep.id));
  };

  const save = async (rep: Representante) => {
    if (!rep.nome?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSavingId(rep.id);
    const { id, persisted, dirty, sincronizado_em, ...rest } = rep;

    // Normaliza campos opcionais: string vazia / undefined => null,
    // garantindo que o UPDATE realmente persista as alterações.
    const payload: any = {
      ...rest,
      cedente_id: cedenteId,
      nome: rep.nome.trim(),
      fonte: rep.fonte || "manual",
      participacao_capital: rep.participacao_capital ?? null,
    };
    for (const f of NULLABLE_FIELDS) {
      const v = (rep as any)[f];
      payload[f] = v === undefined || v === null || v === "" ? null : v;
    }

    let error;
    let savedId = id;
    if (persisted) {
      ({ error } = await supabase.from("cedente_representantes").update(payload).eq("id", id));
    } else {
      const { data, error: insErr } = await supabase
        .from("cedente_representantes")
        .insert(payload)
        .select("id")
        .single();
      error = insErr;
      if (data) savedId = data.id;
    }
    setSavingId(null);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Representante salvo");
    setItems((prev) => {
      const next = prev.map((r) =>
        r.id === id ? { ...r, id: savedId, persisted: true, dirty: false } : r,
      );
      // Se não há mais itens com edição pendente, limpa o rascunho local
      if (!next.some((r) => r.dirty || !r.persisted)) {
        clearDraft();
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold">Representantes legais</h2>
            <p className="text-xs text-muted-foreground">
              Sócios e administradores carregados da Receita Federal (BrasilAPI) na primeira abertura. Expanda para completar os dados cadastrais.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DraftIndicator
            restored={restored}
            lastSavedAt={lastSavedAt}
            onDiscard={() => discardDraft()}
          />
          {syncing && (
            <span className="flex items-center text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Buscando na Receita...
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          {syncing
            ? "Buscando representantes na Receita..."
            : "Nenhum representante encontrado. Adicione manualmente."}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-1">
          {items.map((rep, idx) => (
            <AccordionItem
              key={rep.id}
              value={rep.id}
              className="border rounded-md px-3 data-[state=open]:bg-muted/30"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-1 items-center gap-2.5 text-left pr-3">
                  <span className="font-medium flex-1 truncate">
                    {rep.nome || <span className="text-muted-foreground italic">Novo representante</span>}
                  </span>
                  <span className="hidden md:inline text-xs font-mono text-muted-foreground">
                    {rep.cpf ?? "—"}
                  </span>
                  <span className="hidden md:inline text-xs text-muted-foreground min-w-[120px] truncate">
                    {rep.qualificacao ?? "—"}
                  </span>
                  <span className="hidden md:inline text-xs text-muted-foreground w-16 text-right">
                    {fmtPct(rep.participacao_capital)}
                  </span>
                  <Badge variant={rep.fonte === "receita" ? "default" : "secondary"}>
                    {rep.fonte === "receita" ? "Receita" : "Manual"}
                  </Badge>
                  {rep.dirty && (
                    <Badge variant="outline" className="text-xs">não salvo</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <SocioFormCard
                  socio={rep}
                  index={idx}
                  title={`Representante ${idx + 1}`}
                  hideDataExpedicao
                  onChange={(s) => updateLocal(rep.id, { ...rep, ...s })}
                  onRemove={() => removeOne(rep)}
                  headerExtra={
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b mb-2">
                      <div>
                        <Label>Qualificação</Label>
                        <Input
                          value={rep.qualificacao ?? ""}
                          onChange={(e) =>
                            updateLocal(rep.id, { ...rep, qualificacao: e.target.value })
                          }
                          placeholder="Ex: Sócio-administrador, Diretor"
                        />
                      </div>
                      <div>
                        <Label>% Capital</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rep.participacao_capital ?? ""}
                          onChange={(e) =>
                            updateLocal(rep.id, {
                              ...rep,
                              participacao_capital:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  }
                  footerExtra={
                    <div className="flex justify-end pt-3 border-t mt-3">
                      <Button onClick={() => save(rep)} disabled={savingId === rep.id} size="sm">
                        {savingId === rep.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar representante
                      </Button>
                    </div>
                  }
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="flex justify-center pt-2">
        <Button onClick={addNew} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" /> Adicionar representante
        </Button>
      </div>
    </div>
  );
}
