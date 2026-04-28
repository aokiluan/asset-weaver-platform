import { Outlet } from "react-router-dom";
import { PageTabs } from "@/components/PageTabs";

export default function Configuracoes() {
  return (
    <>
      <PageTabs
        title="Configurações"
        tabs={[
          { label: "Usuários", to: "/configuracoes/usuarios" },
          { label: "Alçadas", to: "/configuracoes/alcadas" },
          { label: "Pipeline", to: "/configuracoes/pipeline" },
          { label: "Categorias de doc.", to: "/configuracoes/categorias" },
        ]}
      />
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </>
  );
}
