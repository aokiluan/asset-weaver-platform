import PlaceholderPage from "@/components/PlaceholderPage";

export default function GestaoDiario() {
  return (
    <PlaceholderPage
      title="Dashboard Diário"
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
