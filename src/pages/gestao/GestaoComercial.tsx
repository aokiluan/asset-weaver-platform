import PlaceholderPage from "@/components/PlaceholderPage";

export default function GestaoComercial() {
  return (
    <PlaceholderPage
      title="Dashboard Comercial"
      comingItems={[
        "Funil de leads por estágio do pipeline",
        "Taxa de conversão lead → cedente ativo",
        "Ranking de produtividade por comercial",
        "Tempo médio em cada estágio",
        "Volume de pleitos abertos no período",
      ]}
    />
  );
}
