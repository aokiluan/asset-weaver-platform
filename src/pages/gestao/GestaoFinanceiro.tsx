import PlaceholderPage from "@/components/PlaceholderPage";

export default function GestaoFinanceiro() {
  return (
    <PlaceholderPage
      title="Dashboard Financeiro"
      description="Indicadores financeiros consolidados a partir da planilha Excel online."
      comingItems={[
        "Receita do período",
        "Custo de captação",
        "Spread realizado",
        "Posição de caixa",
        "Resultado consolidado",
      ]}
    />
  );
}
