import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4"];

type Agg = "sum" | "avg" | "count" | "min" | "max";
type Tipo = "kpi" | "bar" | "line" | "pie" | "table";

export interface WidgetConfig {
  metric_col?: string;
  agg?: Agg;
  group_col?: string;
  format?: "number" | "currency" | "percent";
  /** "latest" (apenas último período) | "all" (todos) */
  scope?: "latest" | "all";
}

export interface WidgetDef {
  id: string;
  titulo: string;
  descricao: string | null;
  dataset_id: string;
  tipo: Tipo;
  config: WidgetConfig;
  largura: number;
}

const fmt = (v: number, format?: WidgetConfig["format"]) => {
  if (!Number.isFinite(v)) return "—";
  if (format === "currency")
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  if (format === "percent") return `${v.toFixed(1)}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
};

function aggregate(values: number[], agg: Agg): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum": return values.reduce((a, b) => a + b, 0);
    case "avg": return values.reduce((a, b) => a + b, 0) / values.length;
    case "count": return values.length;
    case "min": return Math.min(...values);
    case "max": return Math.max(...values);
  }
}

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function DynamicWidget({ widget }: { widget: WidgetDef }) {
  const cfg = widget.config || {};

  const { data: rows, isLoading } = useQuery({
    queryKey: ["widget-rows", widget.id, widget.dataset_id, cfg.scope ?? "latest"],
    queryFn: async () => {
      // Descobre último período do dataset
      const { data: lastUp } = await supabase
        .from("report_uploads")
        .select("periodo_referencia")
        .eq("dataset_id", widget.dataset_id)
        .eq("status", "processado")
        .order("periodo_referencia", { ascending: false })
        .limit(1);
      const latest = lastUp?.[0]?.periodo_referencia;

      let q = supabase.from("report_rows").select("dados, periodo_referencia").eq("dataset_id", widget.dataset_id);
      if ((cfg.scope ?? "latest") === "latest" && latest) {
        q = q.eq("periodo_referencia", latest);
      }
      const { data, error } = await q.limit(20000);
      if (error) throw error;
      return (data ?? []) as { dados: Record<string, unknown>; periodo_referencia: string }[];
    },
  });

  const numericValues = useMemo(() => {
    if (!rows || !cfg.metric_col) return [];
    return rows.map((r) => toNum(r.dados[cfg.metric_col!])).filter((n): n is number => n !== null);
  }, [rows, cfg.metric_col]);

  const grouped = useMemo(() => {
    if (!rows || !cfg.group_col) return [];
    const map = new Map<string, number[]>();
    for (const r of rows) {
      const k = String(r.dados[cfg.group_col!] ?? "—");
      const v = cfg.metric_col ? toNum(r.dados[cfg.metric_col]) : 1;
      if (!map.has(k)) map.set(k, []);
      if (v !== null) map.get(k)!.push(v);
    }
    return Array.from(map.entries())
      .map(([nome, vals]) => ({ nome, valor: aggregate(cfg.metric_col ? vals : new Array(vals.length).fill(1), cfg.agg ?? "sum") }))
      .sort((a, b) => b.valor - a.valor);
  }, [rows, cfg.group_col, cfg.metric_col, cfg.agg]);

  const timeseries = useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, number[]>();
    for (const r of rows) {
      const k = r.periodo_referencia;
      const v = cfg.metric_col ? toNum(r.dados[cfg.metric_col]) : 1;
      if (!map.has(k)) map.set(k, []);
      if (v !== null) map.get(k)!.push(v);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, vals]) => ({
        periodo: new Date(periodo).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        valor: aggregate(cfg.metric_col ? vals : new Array(vals.length).fill(1), cfg.agg ?? "sum"),
      }));
  }, [rows, cfg.metric_col, cfg.agg]);

  const span = widget.largura >= 2 ? "lg:col-span-2" : "";

  if (isLoading) {
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Carregando…</CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground italic">Sem dados importados ainda.</CardContent>
      </Card>
    );
  }

  if (widget.tipo === "kpi") {
    const valor = aggregate(cfg.metric_col ? numericValues : rows.map(() => 1), cfg.agg ?? "sum");
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{widget.titulo}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{fmt(valor, cfg.format)}</div>
          {widget.descricao && <p className="text-xs text-muted-foreground mt-1">{widget.descricao}</p>}
        </CardContent>
      </Card>
    );
  }

  if (widget.tipo === "bar") {
    const data = grouped.slice(0, 10);
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => fmt(v, cfg.format)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (widget.tipo === "line") {
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: number) => fmt(v, cfg.format)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  if (widget.tipo === "pie") {
    const data = grouped.slice(0, 8);
    return (
      <Card className={`shadow-[var(--shadow-card)] ${span}`}>
        <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.nome} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v, cfg.format)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // table
  const cols = Object.keys(rows[0].dados).slice(0, 6);
  return (
    <Card className={`shadow-[var(--shadow-card)] ${span}`}>
      <CardHeader><CardTitle className="text-base">{widget.titulo}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground border-b">
              <tr>{cols.map((c) => <th key={c} className="text-left p-2 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b border-border/50">
                  {cols.map((c) => <td key={c} className="p-2">{String(r.dados[c] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
