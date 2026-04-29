import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Inbox, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  razao_social: string;
  cnpj: string;
  enviado_analise_em: string | null;
  owner_id: string | null;
  ownerNome?: string;
  totalDocs: number;
  pendentes: number;
}

const diasDesde = (iso: string | null) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86_400_000);
  if (d === 0) return "hoje";
  if (d === 1) return "1 dia";
  return `${d} dias`;
};

export default function FilaCadastros() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ceds } = await supabase
        .from("cedentes")
        .select("id, razao_social, cnpj, enviado_analise_em, owner_id")
        .eq("stage", "cadastro")
        .order("enviado_analise_em", { ascending: true, nullsFirst: false });

      const cedRows = (ceds ?? []) as Row[];
      const ownerIds = Array.from(new Set(cedRows.map((c) => c.owner_id).filter(Boolean) as string[]));
      const ids = cedRows.map((c) => c.id);

      const [{ data: profs }, { data: docs }] = await Promise.all([
        ownerIds.length
          ? supabase.from("profiles").select("id, nome").in("id", ownerIds)
          : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
        ids.length
          ? supabase.from("documentos").select("cedente_id, status").in("cedente_id", ids)
          : Promise.resolve({ data: [] as { cedente_id: string; status: string }[] }),
      ]);

      const ownerMap = new Map((profs ?? []).map((p) => [p.id, p.nome]));
      const docCount = new Map<string, { total: number; pend: number }>();
      (docs ?? []).forEach((d) => {
        const cur = docCount.get(d.cedente_id) ?? { total: 0, pend: 0 };
        cur.total++;
        if (d.status === "pendente") cur.pend++;
        docCount.set(d.cedente_id, cur);
      });

      setRows(
        cedRows.map((r) => ({
          ...r,
          ownerNome: r.owner_id ? ownerMap.get(r.owner_id) : undefined,
          totalDocs: docCount.get(r.id)?.total ?? 0,
          pendentes: docCount.get(r.id)?.pend ?? 0,
        })),
      );
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando fila...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Inbox className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Análise de cadastro</h1>
          <p className="text-sm text-muted-foreground">
            Cedentes enviados pelo comercial para validação documental.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Nenhum cadastro aguardando análise.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5">Cedente</th>
                <th className="text-left px-4 py-2.5">CNPJ</th>
                <th className="text-left px-4 py-2.5">Comercial</th>
                <th className="text-left px-4 py-2.5">Documentos</th>
                <th className="text-left px-4 py-2.5">Aguardando</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <Link to={`/cedentes/${r.id}?tab=documentos`} className="font-medium hover:underline">
                      {r.razao_social}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.cnpj}</td>
                  <td className="px-4 py-2.5">{r.ownerNome ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={r.pendentes > 0 ? "secondary" : "default"} className="text-xs">
                      {r.totalDocs - r.pendentes}/{r.totalDocs} revisados
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{diasDesde(r.enviado_analise_em)}</td>
                  <td className="px-2">
                    <Link
                      to={`/cedentes/${r.id}?tab=documentos`}
                      className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted"
                      aria-label="Abrir cedente"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
