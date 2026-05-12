import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTabs } from "@/components/PageTabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Wallet, ArrowRight } from "lucide-react";

interface Row {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  tipo_pessoa: string;
  valor_investido: number | null;
  status: string;
}

const fmtDoc = (s: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return s;
};

const fmtMoney = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function Investidores() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Pasta de Investidores | Securitizadora";
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("investidores")
        .select("id,razao_social,nome_fantasia,cnpj,tipo_pessoa,valor_investido,status")
        .order("razao_social", { ascending: true });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.razao_social.toLowerCase().includes(q) ||
        (r.nome_fantasia ?? "").toLowerCase().includes(q) ||
        r.cnpj.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
    );
  }, [rows, search]);

  return (
    <>
      <PageTabs
        title="Pasta de Investidores"
        description="Cadastro consolidado de investidores parceiros."
        tabs={[]}
      />
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou documento…"
              className="pl-8 h-7 text-[12px]"
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {filtered.length} investidor(es)
          </span>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Investidor</th>
                <th className="text-left px-3 py-2 font-medium">Documento</th>
                <th className="text-left px-3 py-2 font-medium">Tipo</th>
                <th className="text-right px-3 py-2 font-medium">Valor investido</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhum investidor cadastrado.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="leading-tight">
                          <div className="text-[12px] text-foreground">{r.razao_social}</div>
                          {r.nome_fantasia && (
                            <div className="text-[10px] text-muted-foreground">
                              {r.nome_fantasia}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {fmtDoc(r.cnpj)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {r.tipo_pessoa}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmtMoney(r.valor_investido)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-6 text-[11px]">
                        <Link to={`/diretorio/investidores/${r.id}`}>
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
