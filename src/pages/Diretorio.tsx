import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTabs } from "@/components/PageTabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FolderOpen, ArrowRight, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  computeRenovacao,
  renovacaoLabel,
  renovacaoSortKey,
  type RenovacaoInfo,
  type RenovacaoStatus,
} from "@/lib/cadastro-renovacao";
import { STAGE_LABEL, STAGE_ORDER, type CedenteStage } from "@/lib/cedente-stages";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  stage: CedenteStage;
  cadastro_revisado_em: string | null;
  minuta_assinada_em: string | null;
  docCount: number;
  ultimaAta: string | null;
}

type StageFilter = "todos" | CedenteStage;
type RenovFilter = "todas" | RenovacaoStatus;
type SortKey = "cedente" | "stage" | "renovacao" | "docs" | "ata";
type SortDir = "asc" | "desc";

const RENOV_FILTERS: { key: RenovFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "vencida", label: "Vencida" },
  { key: "atencao", label: "Atenção" },
  { key: "em_dia", label: "Em dia" },
  { key: "sem_dados", label: "Sem registro" },
];

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
  const [stageFilter, setStageFilter] = useState<StageFilter>("todos");
  const [renovFilter, setRenovFilter] = useState<RenovFilter>("todas");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "renovacao",
    dir: "asc",
  });

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
      const docCounts: Record<string, number> = {};
      const lastAta: Record<string, string> = {};
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

  // Cache de RenovacaoInfo por id
  const renovMap = useMemo(() => {
    const m = new Map<string, RenovacaoInfo>();
    for (const r of rows) {
      m.set(r.id, computeRenovacao(r.cadastro_revisado_em, r.minuta_assinada_em));
    }
    return m;
  }, [rows]);

  const stagesPresent = useMemo(() => {
    const s = new Set<CedenteStage>();
    rows.forEach((r) => s.add(r.stage));
    return STAGE_ORDER.filter((st) => s.has(st)).concat(s.has("inativo" as CedenteStage) ? ["inativo" as CedenteStage] : []);
  }, [rows]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const list = rows.filter((r) => {
      if (q) {
        const matchText =
          r.razao_social.toLowerCase().includes(q) ||
          (r.nome_fantasia ?? "").toLowerCase().includes(q) ||
          (qDigits && r.cnpj.replace(/\D/g, "").includes(qDigits));
        if (!matchText) return false;
      }
      if (stageFilter !== "todos" && r.stage !== stageFilter) return false;
      if (renovFilter !== "todas") {
        const info = renovMap.get(r.id);
        if (!info || info.status !== renovFilter) return false;
      }
      return true;
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    const cmp = (a: Row, b: Row): number => {
      switch (sort.key) {
        case "cedente":
          return a.razao_social.localeCompare(b.razao_social) * dir;
        case "stage": {
          const ia = STAGE_ORDER.indexOf(a.stage);
          const ib = STAGE_ORDER.indexOf(b.stage);
          return ((ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)) * dir;
        }
        case "renovacao": {
          const ia = renovacaoSortKey(renovMap.get(a.id)!);
          const ib = renovacaoSortKey(renovMap.get(b.id)!);
          return (ia - ib) * dir;
        }
        case "docs":
          return (a.docCount - b.docCount) * dir;
        case "ata": {
          const ta = a.ultimaAta ? new Date(a.ultimaAta).getTime() : 0;
          const tb = b.ultimaAta ? new Date(b.ultimaAta).getTime() : 0;
          return (ta - tb) * dir;
        }
        default:
          return 0;
      }
    };

    return list.sort((a, b) => {
      const r = cmp(a, b);
      if (r !== 0) return r;
      return a.razao_social.localeCompare(b.razao_social);
    });
  }, [rows, search, stageFilter, renovFilter, sort, renovMap]);

  function handleSort(key: SortKey) {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      // defaults: docs e ata abrem em desc; restante asc
      return { key, dir: key === "docs" || key === "ata" ? "desc" : "asc" };
    });
  }

  const hasFilters = stageFilter !== "todos" || renovFilter !== "todas" || search.trim() !== "";

  return (
    <>
      <PageTabs title="Pasta de Cedentes" tabs={[]} />
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
            {filteredSorted.length} cedente(s)
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
              Stage
            </span>
            <Chip active={stageFilter === "todos"} onClick={() => setStageFilter("todos")}>
              Todos
            </Chip>
            {stagesPresent.map((st) => (
              <Chip
                key={st}
                active={stageFilter === st}
                onClick={() => setStageFilter(st)}
              >
                {STAGE_LABEL[st]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
              Renovação
            </span>
            {RENOV_FILTERS.map((r) => (
              <Chip
                key={r.key}
                active={renovFilter === r.key}
                onClick={() => setRenovFilter(r.key)}
              >
                {r.label}
              </Chip>
            ))}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] ml-auto text-muted-foreground"
                onClick={() => {
                  setStageFilter("todos");
                  setRenovFilter("todas");
                  setSearch("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <Th sortKey="cedente" sort={sort} onSort={handleSort}>Cedente</Th>
                <th className="text-left px-3 py-2 font-medium">CNPJ</th>
                <Th sortKey="stage" sort={sort} onSort={handleSort}>Stage</Th>
                <Th sortKey="renovacao" sort={sort} onSort={handleSort}>Renovação</Th>
                <Th sortKey="docs" sort={sort} onSort={handleSort} align="right">Docs</Th>
                <Th sortKey="ata" sort={sort} onSort={handleSort}>Última ata</Th>
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
              {!loading && filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum cedente encontrado.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredSorted.map((r) => {
                  const info = renovMap.get(r.id)!;
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
                          {STAGE_LABEL[r.stage] ?? r.stage}
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
      className="h-7 px-2.5 text-[12px]"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Th({
  sortKey,
  sort,
  onSort,
  align = "left",
  children,
}: {
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={cn(
        "px-3 py-2 font-medium select-none cursor-pointer hover:text-foreground transition-colors",
        align === "right" ? "text-right" : "text-left",
      )}
      onClick={() => onSort(sortKey)}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "justify-end",
        )}
      >
        {children}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} />
      </span>
    </th>
  );
}
