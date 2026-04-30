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
import { Loader2, RefreshCw, Users, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { SocioFormCard, type Socio } from "./SocioFormCard";

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

  const sync = async () => {
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
    toast.success(`Representantes atualizados (${(data as any).total})`);
    await load();
    onSynced();
  };

  useEffect(() => {
    load();
  }, [cedenteId]);

  useEffect(() => {
    if (!loading && !jaSincronizado && !autoTried && !syncing) {
      setAutoTried(true);
      sync();
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
    const payload: any = {
      ...rest,
      cedente_id: cedenteId,
      participacao_capital: rep.participacao_capital ?? null,
      // datas vazias devem virar null pra evitar erro
      data_nascimento: (rep as any).data_nascimento || null,
      data_expedicao: (rep as any).data_expedicao || null,
      conjuge_data_nascimento: (rep as any).conjuge_data_nascimento || null,
      conjuge_data_expedicao: (rep as any).conjuge_data_expedicao || null,
    };

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
    setItems((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, id: savedId, persisted: true, dirty: false } : r,
      ),
    );
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold">Representantes legais</h2>
            <p className="text-xs text-muted-foreground">
              Sócios e administradores conforme dados da Receita Federal (BrasilAPI). Expanda para completar os dados cadastrais.
            </p>
          </div>
        </div>
        <Button onClick={sync} disabled={syncing} variant="outline" size="sm">
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar da Receita
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-12">
          {syncing
            ? "Buscando representantes na Receita..."
            : "Nenhum representante encontrado. Clique em \"Atualizar da Receita\" ou adicione manualmente."}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {items.map((rep, idx) => (
            <AccordionItem
              key={rep.id}
              value={rep.id}
              className="border rounded-md px-3 data-[state=open]:bg-muted/30"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex flex-1 items-center gap-4 text-left pr-3">
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
