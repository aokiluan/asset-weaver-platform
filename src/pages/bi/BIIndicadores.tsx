import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DynamicWidget, WidgetDef } from "@/components/DynamicWidget";

export default function BIIndicadores() {
  const { data: customWidgets, isLoading } = useQuery({
    queryKey: ["bi-custom-widgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_widgets")
        .select("id, titulo, descricao, dataset_id, tipo, config, largura")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as WidgetDef[];
    },
  });

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-foreground">
          Indicadores de carteira
        </h2>
        <p className="text-xs text-muted-foreground">
          Dados vindos dos relatórios importados pelo admin.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores…</p>
      ) : !customWidgets || customWidgets.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum widget configurado ainda. Vá em <strong>Widgets</strong> para criar o primeiro.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {customWidgets.map((w) => (
            <DynamicWidget key={w.id} widget={w} />
          ))}
        </div>
      )}
    </div>
  );
}
