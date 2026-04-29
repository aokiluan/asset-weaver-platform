import PlaceholderPage from "@/components/PlaceholderPage";

export default function Formalizacao() {
  return (
    <PlaceholderPage
      title="Formalização"
      description="Geração da minuta padrão e controle de assinatura via CRDC."
      comingItems={[
        "Geração automática da minuta em PDF com dados do cedente",
        "Download para upload na ferramenta de assinatura CRDC",
        "Marcação de minuta como assinada → ativação automática do cedente",
        "Histórico de minutas geradas",
      ]}
    />
  );
}
