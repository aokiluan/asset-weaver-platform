import { Outlet } from "react-router-dom";
import { PageTabs } from "@/components/PageTabs";

export default function Configuracoes() {
  return (
    <>
      <PageTabs
        title="Configurações"
        tabs={[
          { label: "Permissões", to: "/configuracoes/permissoes" },
          { label: "Equipes", to: "/configuracoes/equipes" },
          { label: "Alçadas de crédito", to: "/configuracoes/alcadas" },
          { label: "Séries de investimento", to: "/configuracoes/series-investidor" },
        ]}
      />
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </>
  );
}
