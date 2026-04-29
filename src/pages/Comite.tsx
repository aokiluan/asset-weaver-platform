import PlaceholderPage from "@/components/PlaceholderPage";

export default function Comite() {
  return (
    <PlaceholderPage
      title="Comitê de Crédito"
      description="Ambiente assíncrono de votação de propostas."
      comingItems={[
        "Fila de propostas aguardando voto",
        "Visão completa: parecer, docs, relatório de visita",
        "Voto: aprovar / recusar / reavaliar com justificativa",
        "Notificação automática a todos os membros ao chegar nova proposta",
        "Geração automática da ata em PDF ao final da votação",
        "Gamificação: ranking, streak de votos no prazo, badges (Fase 5)",
      ]}
    />
  );
}
