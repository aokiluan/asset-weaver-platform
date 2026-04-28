import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, KanbanSquare, FileText, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user, roles } = useAuth();

  useEffect(() => {
    document.title = "Dashboard | Securitizadora";
  }, []);

  const cards = [
    { title: "Leads ativos", value: "—", icon: Users, hint: "Pipeline comercial" },
    { title: "Em negociação", value: "—", icon: KanbanSquare, hint: "Estágio avançado" },
    { title: "Documentos", value: "—", icon: FileText, hint: "Por cedente" },
    { title: "Conversão", value: "—", icon: TrendingUp, hint: "Últimos 30 dias" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email} · {roles.length > 0 ? roles.join(" · ") : "aguardando atribuição de função"}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Próximas etapas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>✅ Sub-fase 1.A concluída — autenticação, design system e estrutura base.</p>
          <p>⏳ Em seguida: <strong className="text-foreground">1.B — CRM e Kanban de leads</strong>.</p>
          <p>Depois: documentos, gestão de usuários e KPIs reais no dashboard.</p>
        </CardContent>
      </Card>
    </div>
  );
}
