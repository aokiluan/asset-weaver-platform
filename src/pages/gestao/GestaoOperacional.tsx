import PlaceholderPage from "@/components/PlaceholderPage";

export default function GestaoOperacional() {
  return (
    <PlaceholderPage
      title="Dashboard Operacional"
      comingItems={[
        "Volume operado no período (PV, valor de face)",
        "Carteira ativa por sacado e por cedente",
        "Inadimplência e atrasos",
        "Performance de cobrança",
        "Distribuição de risco da carteira",
      ]}
    />
  );
}
