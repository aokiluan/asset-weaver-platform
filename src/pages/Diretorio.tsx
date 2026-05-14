import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTabs } from "@/components/PageTabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FolderOpen, ArrowRight } from "lucide-react";
import {
  computeRenovacao,
  renovacaoLabel,
  renovacaoSortKey,
  type RenovacaoInfo,
} from "@/lib/cadastro-renovacao";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  stage: string;
  cadastro_revisado_em: string | null;
  minuta_assinada_em: string | null;
  docCount: number;
  ultimaAta: string | null;
}

const fmtCNPJ = (s: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const renovBadgeClass = (info: RenovacaoInfo) => {
  switch (info.status) {
    case "vencida":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "atencao":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "em_dia":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export default function Diretorio() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Diretório | Securitizadora";
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ceds } = await supabase
        .from("cedentes")
        .select("id,razao_social,nome_fantasia,cnpj,stage,cadastro_revisado_em,minuta_assinada_em")
        .order("razao_social", { ascending: true });

      const ids = (ceds ?? []).map((c) => c.id);
      let docCounts: Record<string, number> = {};
      let lastAta: Record<string, string> = {};
      if (ids.length) {
        const [{ data: docs }, { data: atas }] = await Promise.all([
          supabase.from("documentos").select("cedente_id").in("cedente_id", ids),
          supabase
            .from("committee_minutes")
            .select("cedente_id,realizado_em")
            .in("cedente_id", ids)
            .order("realizado_em", { ascending: false }),
        ]);
        for (const d of docs ?? []) {
          docCounts[d.cedente_id] = (docCounts[d.cedente_id] ?? 0) + 1;
        }
        for (const a of atas ?? []) {
          if (!lastAta[a.cedente_id]) lastAta[a.cedente_id] = a.realizado_em;
        }
      }

      const built: Row[] = (ceds ?? []).map((c: any) => ({
        id: c.id,
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        cnpj: c.cnpj,
        stage: c.stage,
        cadastro_revisado_em: c.cadastro_revisado_em,
        minuta_assinada_em: c.minuta_assinada_em,
        docCount: docCounts[c.id] ?? 0,
        ultimaAta: lastAta[c.id] ?? null,
      }));

      setRows(built);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!q) return true;
      return (
        r.razao_social.toLowerCase().includes(q) ||
        (r.nome_fantasia ?? "").toLowerCase().includes(q) ||
        r.cnpj.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    });
    // Ordena por urgência de renovação
    return list.sort((a, b) => {
      const ia = computeRenovacao(a.cadastro_revisado_em, a.minuta_assinada_em);
      const ib = computeRenovacao(b.cadastro_revisado_em, b.minuta_assinada_em);
      const sa = renovacaoSortKey(ia);
      const sb = renovacaoSortKey(ib);
      if (sa !== sb) return sa - sb;
      return a.razao_social.localeCompare(b.razao_social);
    });
  }, [rows, search]);

  return (
    <>
      <PageTabs
        title="Pasta de Cedentes"
        tabs={[]}
      />
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por razão social ou CNPJ…"
              className="pl-8 h-7 text-[12px]"
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} cedente(s)
          </span>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Cedente</th>
                <th className="text-left px-3 py-2 font-medium">CNPJ</th>
                <th className="text-left px-3 py-2 font-medium">Stage</th>
                <th className="text-left px-3 py-2 font-medium">Renovação</th>
                <th className="text-right px-3 py-2 font-medium">Docs</th>
                <th className="text-left px-3 py-2 font-medium">Última ata</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum cedente encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => {
                  const info = computeRenovacao(r.cadastro_revisado_em, r.minuta_assinada_em);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="leading-tight">
                            <div className="text-[12px] text-foreground">{r.razao_social}</div>
                            {r.nome_fantasia && (
                              <div className="text-[10px] text-muted-foreground">{r.nome_fantasia}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {fmtCNPJ(r.cnpj)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {r.stage}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] border", renovBadgeClass(info))}
                        >
                          {renovacaoLabel(info)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.docCount}</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.ultimaAta)}</td>
                      <td className="px-3 py-2 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-6 text-[11px]">
                          <Link to={`/diretorio/${r.id}`}>
                            Abrir <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
