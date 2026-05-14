import { Outlet } from "react-router-dom";
import { PageTabs } from "@/components/PageTabs";

export default function BI() {
  return (
    <>
      <PageTabs
        title="Relatórios / BI"
        tabs={[
          { label: "Indicadores", to: "/bi/indicadores" },
          { label: "Uploads", to: "/bi/uploads" },
          { label: "Datasets", to: "/bi/datasets" },
          { label: "Widgets", to: "/bi/widgets" },
        ]}
      />
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </>
  );
}
