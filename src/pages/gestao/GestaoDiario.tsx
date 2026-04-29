import PlaceholderPage from "@/components/PlaceholderPage";

export default function GestaoDiario() {
  return (
    <PlaceholderPage
      title="Dashboard Diário"
      description="Visão diária consolidada a partir dos uploads do dia (XLS/CSV)."
      comingItems={[
        "Operações fechadas no dia",
        "Saldo operacional do dia",
        "Captações e desembolsos",
        "Comparativo D vs D-1",
        "Alertas operacionais",
      ]}
    />
  );
}
