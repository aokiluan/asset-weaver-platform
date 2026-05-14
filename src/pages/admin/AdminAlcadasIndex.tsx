import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminAlcadas from "./AdminAlcadas";
import AdminCategorias from "./AdminCategorias";

export default function AdminAlcadasIndex() {
  const [sp, setSp] = useSearchParams();
  const sub = sp.get("sub") === "categorias" ? "categorias" : "faixas";

  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v === "categorias") next.set("sub", "categorias");
    else next.delete("sub");
    setSp(next, { replace: true });
  };

  return (
    <Tabs value={sub} onValueChange={onChange} className="space-y-3">
      <TabsList className="h-8">
        <TabsTrigger value="faixas" className="text-[12px] h-7">Faixas de alçada</TabsTrigger>
        <TabsTrigger value="categorias" className="text-[12px] h-7">Categorias de documento</TabsTrigger>
      </TabsList>
      <TabsContent value="faixas" className="mt-0">
        <AdminAlcadas />
      </TabsContent>
      <TabsContent value="categorias" className="mt-0">
        <p className="text-[11px] text-muted-foreground mb-2">
          A exigibilidade de documentos pode variar por faixa de faturamento — futuramente cada categoria poderá ser vinculada a uma faixa de alçada.
        </p>
        <AdminCategorias />
      </TabsContent>
    </Tabs>
  );
}
