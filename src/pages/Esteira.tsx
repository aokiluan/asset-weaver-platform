import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/PageTabs";
import { Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, STAGE_COLORS, type CedenteStage } from "@/lib/cedente-stages";

const FLUXO_STAGES: CedenteStage[] = [
  "novo" as CedenteStage,
  "cadastro" as CedenteStage,
  "analise" as CedenteStage,
  "comite" as CedenteStage,
  "formalizacao" as CedenteStage,
];

interface Row {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  stage: CedenteStage;
  setor: string | null;
  limite_aprovado: number | null;
}

const fmtCNPJ = (s: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length !== 14) return s;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export default function Esteira() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"todos" | CedenteStage>("todos");

  useEffect(() => {
    document.title = "Esteira de Crédito | Operação";
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cedentes")
        .select("id,razao_social,nome_fantasia,cnpj,stage,setor,limite_aprovado")
        .in("stage", FLUXO_STAGES as unknown as string[])
        .order("razao_social", { ascending: true });
      setLoading(false);
      if (error) {
        toast.error("Erro ao carregar", { description: error.message });
        return;
      }
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return rows.filter((r) => {
      if (stageFilter !== "todos" && r.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        r.razao_social.toLowerCase().includes(q) ||
        (r.nome_fantasia ?? "").toLowerCase().includes(q) ||
        (qd && r.cnpj.replace(/\D/g, "").includes(qd))
      );
    });
  }, [rows, search, stageFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: rows.length };
    for (const st of FLUXO_STAGES) c[st] = rows.filter((r) => r.stage === st).length;
    return c;
  }, [rows]);

  return (
    <>
      <PageTabs title="Esteira de Crédito" tabs={[]} />
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

        <div className="flex flex-wrap items-center gap-1">
          <Chip active={stageFilter === "todos"} onClick={() => setStageFilter("todos")}>
            Todos ({counts.todos})
          </Chip>
          {FLUXO_STAGES.map((st) => (
            <Chip key={st} active={stageFilter === st} onClick={() => setStageFilter(st)}>
              {STAGE_LABEL[st]} ({counts[st] ?? 0})
            </Chip>
          ))}
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Cedente</th>
                <th className="text-left px-3 py-2 font-medium">CNPJ</th>
                <th className="text-left px-3 py-2 font-medium">Etapa</th>
                <th className="text-left px-3 py-2 font-medium">Setor</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum cedente em fluxo.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="leading-tight">
                        <div className="text-[12px] text-foreground">{r.razao_social}</div>
                        {r.nome_fantasia && (
                          <div className="text-[10px] text-muted-foreground">{r.nome_fantasia}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {fmtCNPJ(r.cnpj)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: STAGE_COLORS[r.stage], color: STAGE_COLORS[r.stage] }}
                      >
                        {STAGE_LABEL[r.stage] ?? r.stage}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.setor ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-6 text-[11px]">
                        <Link to={`/esteira/${r.id}`}>
                          Abrir <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className={cn("h-7 px-2.5 text-[12px]")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
