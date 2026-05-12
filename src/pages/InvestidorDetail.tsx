import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTabs } from "@/components/PageTabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Investidor {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  tipo_pessoa: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  valor_investido: number | null;
  perfil: string | null;
  observacoes: string | null;
  status: string;
}

const fmtDoc = (s: string) => {
  const d = (s ?? "").replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return s ?? "—";
};
const fmtMoney = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-[12px] leading-tight text-foreground">{value ?? "—"}</div>
    </div>
  );
}

export default function InvestidorDetail() {
  const { id } = useParams();
  const [data, setData] = useState<Investidor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from("investidores")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setData(data as Investidor | null);
      setLoading(false);
      document.title = `${(data as any)?.razao_social ?? "Investidor"} | Securitizadora`;
    })();
  }, [id]);

  return (
    <>
      <PageTabs
        title={data?.razao_social ?? "Investidor"}
        description={data?.nome_fantasia ?? undefined}
        tabs={[]}
        actions={
          <Button asChild variant="ghost" size="sm" className="h-7 text-[11px]">
            <Link to="/diretorio/investidores">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Link>
          </Button>
        }
      />
      <div className="max-w-7xl mx-auto space-y-4">
        {loading && <div className="text-[12px] text-muted-foreground">Carregando…</div>}
        {!loading && !data && (
          <div className="text-[12px] text-muted-foreground">Investidor não encontrado.</div>
        )}
        {data && (
          <>
            <div className="rounded-md border bg-card p-2.5 space-y-2">
              <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                Identificação
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                <Field label="Razão social" value={data.razao_social} />
                <Field label="Nome fantasia" value={data.nome_fantasia} />
                <Field label="Documento" value={fmtDoc(data.cnpj)} />
                <Field label="Tipo" value={data.tipo_pessoa.toUpperCase()} />
                <Field label="Status" value={data.status} />
                <Field label="Perfil" value={data.perfil} />
                <Field label="Valor investido" value={fmtMoney(data.valor_investido)} />
              </div>
            </div>

            <div className="rounded-md border bg-card p-2.5 space-y-2">
              <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                Contato
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                <Field label="E-mail" value={data.email} />
                <Field label="Telefone" value={data.telefone} />
              </div>
            </div>

            <div className="rounded-md border bg-card p-2.5 space-y-2">
              <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                Endereço
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                <Field label="Logradouro" value={data.endereco} />
                <Field label="Número" value={data.numero} />
                <Field label="Bairro" value={data.bairro} />
                <Field label="CEP" value={data.cep} />
                <Field label="Cidade" value={data.cidade} />
                <Field label="Estado" value={data.estado} />
              </div>
            </div>

            {data.observacoes && (
              <div className="rounded-md border bg-card p-2.5 space-y-2">
                <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                  Observações
                </div>
                <div className="text-[12px] leading-tight whitespace-pre-wrap">
                  {data.observacoes}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
