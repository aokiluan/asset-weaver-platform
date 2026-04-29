import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";

interface Representante {
  id: string;
  nome: string;
  cpf: string | null;
  qualificacao: string | null;
  participacao_capital: number | null;
  fonte: string;
  sincronizado_em: string | null;
}

interface Props {
  cedenteId: string;
  jaSincronizado: boolean;
  onSynced: () => void;
}

const fmtPct = (v: number | null) =>
  v == null ? "—" : `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export function CedenteRepresentantesTab({ cedenteId, jaSincronizado, onSynced }: Props) {
  const [items, setItems] = useState<Representante[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cedente_representantes")
      .select("id,nome,cpf,qualificacao,participacao_capital,fonte,sincronizado_em")
      .eq("cedente_id", cedenteId)
      .order("nome");
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar representantes", { description: error.message });
      return;
    }
    setItems((data as Representante[]) ?? []);
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

  // Auto-sincroniza 1x se ainda não foi feito
  useEffect(() => {
    if (!loading && !jaSincronizado && !autoTried && !syncing) {
      setAutoTried(true);
      sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, jaSincronizado]);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold">Representantes legais</h2>
            <p className="text-xs text-muted-foreground">
              Sócios e administradores conforme dados da Receita Federal (BrasilAPI).
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
            : "Nenhum representante encontrado. Clique em \"Atualizar da Receita\" para buscar."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Qualificação</TableHead>
              <TableHead className="text-right">% Capital</TableHead>
              <TableHead>Fonte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="font-mono text-xs">{r.cpf ?? "—"}</TableCell>
                <TableCell>{r.qualificacao ?? "—"}</TableCell>
                <TableCell className="text-right">{fmtPct(r.participacao_capital)}</TableCell>
                <TableCell>
                  <Badge variant={r.fonte === "receita" ? "default" : "secondary"}>
                    {r.fonte === "receita" ? "Receita" : "Manual"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
