import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Scale, TrendingUp, CheckCircle2, AlertTriangle, Wallet, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

const STAGE_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  analise: "Análise",
  parecer: "Parecer Risco",
  comite: "Comitê",
  aprovado: "Aprovada",
  reprovado: "Reprovada",
  cancelado: "Cancelada",
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Index() {
  const { user, roles } = useAuth();

  useEffect(() => {
    document.title = "Dashboard Executivo | Securitizadora";
  }, []);

  const { data: leads } = useQuery({
    queryKey: ["dash-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id, stage_id, valor_estimado, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["dash-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, nome, cor, ordem, is_ganho, is_perdido")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cedentes } = useQuery({
    queryKey: ["dash-cedentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cedentes").select("id, status, limite_aprovado, razao_social");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: proposals } = useQuery({
    queryKey: ["dash-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_proposals")
        .select("id, stage, valor_solicitado, valor_aprovado, cedente_id, created_at, decided_at");
      if (error) throw error;
      return data || [];
    },
  });

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const totalLeads = leads?.length || 0;
    const ganhoIds = new Set((stages || []).filter((s) => s.is_ganho).map((s) => s.id));
    const perdidoIds = new Set((stages || []).filter((s) => s.is_perdido).map((s) => s.id));
    const ganhos = (leads || []).filter((l) => l.stage_id && ganhoIds.has(l.stage_id)).length;
    const perdidos = (leads || []).filter((l) => l.stage_id && perdidoIds.has(l.stage_id)).length;
    const fechados = ganhos + perdidos;
    const conversao = fechados > 0 ? (ganhos / fechados) * 100 : 0;

    const totalCedentes = cedentes?.length || 0;
    const limiteTotal = (cedentes || []).reduce((acc, c) => acc + Number(c.limite_aprovado || 0), 0);

    const totalSolicitado = (proposals || []).reduce((a, p) => a + Number(p.valor_solicitado || 0), 0);
    const totalAprovado = (proposals || [])
      .filter((p) => p.stage === "aprovado")
      .reduce((a, p) => a + Number(p.valor_aprovado || p.valor_solicitado || 0), 0);
    const propEmAndamento = (proposals || []).filter(
      (p) => !["aprovado", "reprovado", "cancelado"].includes(p.stage),
    ).length;
    const taxaAprovacao = (() => {
      const decididas = (proposals || []).filter((p) => ["aprovado", "reprovado"].includes(p.stage));
      const aprovadas = decididas.filter((p) => p.stage === "aprovado");
      return decididas.length > 0 ? (aprovadas.length / decididas.length) * 100 : 0;
    })();

    return {
      totalLeads, ganhos, perdidos, conversao,
      totalCedentes, limiteTotal,
      totalSolicitado, totalAprovado, propEmAndamento, taxaAprovacao,
    };
  }, [leads, stages, cedentes, proposals]);

  // ===== Funil comercial =====
  const funilData = useMemo(() => {
    if (!stages || !leads) return [];
    return stages.map((s) => ({
      nome: s.nome,
      total: leads.filter((l) => l.stage_id === s.id).length,
      cor: s.cor || "hsl(var(--primary))",
    }));
  }, [stages, leads]);

  // ===== Propostas por estágio =====
  const propStageData = useMemo(() => {
    const counts: Record<string, { count: number; valor: number }> = {};
    (proposals || []).forEach((p) => {
      const k = p.stage;
      if (!counts[k]) counts[k] = { count: 0, valor: 0 };
      counts[k].count += 1;
      counts[k].valor += Number(p.valor_solicitado || 0);
    });
    return Object.entries(counts).map(([k, v]) => ({
      nome: STAGE_LABELS[k] || k,
      propostas: v.count,
      valor: v.valor,
    }));
  }, [proposals]);

  // ===== Concentração por cedente (top 5 limites) =====
  const concentracaoData = useMemo(() => {
    return [...(cedentes || [])]
      .filter((c) => Number(c.limite_aprovado || 0) > 0)
      .sort((a, b) => Number(b.limite_aprovado || 0) - Number(a.limite_aprovado || 0))
      .slice(0, 5)
      .map((c) => ({
        nome: (c.razao_social || "—").slice(0, 20),
        limite: Number(c.limite_aprovado || 0),
      }));
  }, [cedentes]);

  // ===== Evolução mensal de propostas (últimos 6 meses) =====
  const evolucaoData = useMemo(() => {
    const now = new Date();
    const buckets: { mes: string; solicitado: number; aprovado: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }),
        solicitado: 0,
        aprovado: 0,
      });
    }
    (proposals || []).forEach((p) => {
      const d = new Date(p.created_at);
      const idx = buckets.findIndex(
        (_, i) => {
          const ref = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
        },
      );
      if (idx >= 0) {
        buckets[idx].solicitado += Number(p.valor_solicitado || 0);
        if (p.stage === "aprovado") {
          buckets[idx].aprovado += Number(p.valor_aprovado || p.valor_solicitado || 0);
        }
      }
    });
    return buckets;
  }, [proposals]);

  const kpiCards = [
    { title: "Leads ativos", value: kpis.totalLeads, icon: Users, hint: `${kpis.ganhos} ganhos · ${kpis.perdidos} perdidos` },
    { title: "Cedentes", value: kpis.totalCedentes, icon: Building2, hint: `Limite total: ${fmtBRL(kpis.limiteTotal)}` },
    { title: "Propostas em andamento", value: kpis.propEmAndamento, icon: Scale, hint: `${fmtBRL(kpis.totalSolicitado)} solicitado` },
    { title: "Volume aprovado", value: fmtBRL(kpis.totalAprovado), icon: CheckCircle2, hint: `${kpis.taxaAprovacao.toFixed(0)}% taxa de aprovação`, isText: true },
  ];

  const secondaryKpis = [
    { title: "Conversão comercial", value: `${kpis.conversao.toFixed(1)}%`, icon: Target, hint: "Ganhos / fechados" },
    { title: "Ticket médio aprovado", value: fmtBRL(kpis.totalAprovado / Math.max(1, (proposals || []).filter((p) => p.stage === "aprovado").length)), icon: Wallet, hint: "Por proposta aprovada" },
    { title: "Propostas analisadas", value: (proposals || []).filter((p) => ["aprovado", "reprovado"].includes(p.stage)).length, icon: TrendingUp, hint: "Decididas no período" },
    { title: "Pendentes de decisão", value: kpis.propEmAndamento, icon: AlertTriangle, hint: "Análise / risco / comitê" },
  ];

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      <header>
        <h1 className="text-[20px] font-medium tracking-tight text-foreground">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email} · {roles.length > 0 ? roles.join(" · ") : "aguardando atribuição de função"}
        </p>
      </header>

      {/* KPIs principais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <Card key={c.title} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={c.isText ? "text-[14px] font-semibold text-foreground" : "text-[18px] font-semibold text-foreground tabular-nums"}>
                {c.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* KPIs secundários */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryKpis.map((c) => (
          <Card key={c.title} className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{c.title}</span>
                <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-lg font-semibold text-foreground">{c.value}</div>
              <p className="text-[11px] text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Funil comercial</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funilData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {funilData.map((d, i) => (
                    <Cell key={i} fill={d.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Propostas por estágio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={propStageData}
                  dataKey="propostas"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.nome}: ${e.propostas}`}
                  labelLine={false}
                >
                  {propStageData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Evolução mensal (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="solicitado" stroke="hsl(var(--primary))" strokeWidth={2} name="Solicitado" />
                <Line type="monotone" dataKey="aprovado" stroke="#22c55e" strokeWidth={2} name="Aprovado" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Concentração de limites — Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={concentracaoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: number) => fmtBRL(v)}
                />
                <Bar dataKey="limite" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
