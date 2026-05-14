import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTabs } from "@/components/PageTabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdfPreview } from "@/components/ui/pdf-preview";
import { ArrowLeft, FileText, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { INVESTOR_ACTIVITY_LABEL, type InvestorActivity } from "@/lib/investor-contacts";

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

interface BoletaRow {
  id: string;
  valor: number | null;
  concluida_em: string | null;
  status: string;
  signed_files: Array<{ name: string; storage_path: string }>;
}

const fmtMoneyBRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

export default function InvestidorDetail() {
  const { id } = useParams();
  const [data, setData] = useState<Investidor | null>(null);
  const [loading, setLoading] = useState(true);
  const [boletas, setBoletas] = useState<BoletaRow[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [activities, setActivities] = useState<InvestorActivity[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from("investidores").select("*").eq("id", id).maybeSingle();
      setData(data as Investidor | null);

      const { data: bols } = await supabase
        .from("investor_boletas")
        .select("id,valor,concluida_em,status,contact_id")
        .eq("investidor_id", id)
        .order("concluida_em", { ascending: false });
      const contactIds = Array.from(
        new Set(((bols ?? []) as any[]).map((b) => b.contact_id).filter(Boolean)),
      );
      if (contactIds.length) {
        const { data: acts } = await supabase
          .from("investor_contact_activities")
          .select("*")
          .in("contact_id", contactIds)
          .order("occurred_at", { ascending: false });
        setActivities((acts ?? []) as InvestorActivity[]);
      } else {
        setActivities([]);
      }
      const ids = (bols ?? []).map((b: any) => b.id);
      let byBoleta: Record<string, any[]> = {};
      if (ids.length) {
        const { data: tracks } = await (supabase.from as any)("signature_tracking")
          .select("boleta_id, signed_files").in("boleta_id", ids);
        for (const t of (tracks ?? []) as any[]) {
          if (Array.isArray(t.signed_files)) byBoleta[t.boleta_id] = t.signed_files;
        }
      }
      setBoletas(((bols ?? []) as any[]).map((b) => ({ ...b, signed_files: byBoleta[b.id] ?? [] })));
      setLoading(false);
      document.title = `${(data as any)?.razao_social ?? "Investidor"} | Securitizadora`;
    })();
  }, [id]);

  async function handleDownload(path: string, name?: string) {
    setDownloading(path);
    try {
      const { data, error } = await supabase.storage
        .from("investor-boletas").download(path);
      if (error || !data) throw error ?? new Error("Falha no download");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name ?? path.split("/").pop() ?? "documento.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      toast.error("Não foi possível baixar", { description: e?.message });
    } finally {
      setDownloading(null);
    }
  }

  async function handleView(path: string, name?: string) {
    setViewing(path);
    try {
      const { data, error } = await supabase.storage
        .from("investor-boletas").download(path);
      if (error || !data) throw error ?? new Error("Falha ao abrir");
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      setPreviewName(name ?? path.split("/").pop() ?? "Documento");
      setPreviewUrl(url);
    } catch (e: any) {
      toast.error("Não foi possível visualizar", { description: e?.message });
    } finally {
      setViewing(null);
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName("");
  }

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

            <div className="rounded-md border bg-card p-2.5 space-y-2">
              <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                Boletas e documentos assinados
              </div>
              {boletas.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/80 py-2">Nenhuma boleta vinculada.</div>
              ) : (
                <div className="space-y-2">
                  {boletas.map((b) => (
                    <div key={b.id} className="rounded border p-2 space-y-1.5">
                      <div className="text-[12px] leading-tight">
                        Boleta · {fmtMoneyBRL(b.valor)}
                        <span className="text-muted-foreground"> · {fmtDate(b.concluida_em)}</span>
                      </div>
                      {b.signed_files.length === 0 ? (
                        <div className="text-[10px] text-muted-foreground/70">Nenhum PDF assinado salvo.</div>
                      ) : (
                        <div className="space-y-1">
                          {b.signed_files.map((f) => (
                            <div key={f.storage_path} className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1 text-[11px] truncate">{f.name}</div>
                              <Button
                                variant="ghost" size="sm" className="h-6 text-[11px] px-2"
                                onClick={() => handleView(f.storage_path, f.name)}
                                disabled={viewing === f.storage_path}
                              >
                                {viewing === f.storage_path
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><Eye className="h-3 w-3 mr-1" /> Ver</>}
                              </Button>
                              <Button
                                variant="ghost" size="sm" className="h-6 text-[11px]"
                                onClick={() => handleDownload(f.storage_path, f.name)}
                                disabled={downloading === f.storage_path}
                              >
                                {downloading === f.storage_path
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <><Download className="h-3 w-3 mr-1" /> Baixar</>}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border bg-card p-2.5 space-y-2">
              <div className="text-[10px] leading-none uppercase tracking-wide text-muted-foreground">
                Histórico de contatos
              </div>
              {activities.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/80 py-2">
                  Nenhum contato registrado.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activities.map((a) => (
                    <div key={a.id} className="border-l-2 border-border pl-2">
                      <div className="text-[10px] leading-none text-muted-foreground">
                        {new Date(a.occurred_at).toLocaleDateString("pt-BR")} ·{" "}
                        {INVESTOR_ACTIVITY_LABEL[a.type]}
                      </div>
                      <div className="text-[12px] leading-tight text-foreground mt-0.5 whitespace-pre-wrap">
                        {a.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      <Dialog open={!!previewUrl} onOpenChange={(v) => { if (!v) closePreview(); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-3 py-2 border-b">
            <DialogTitle className="text-[12px] font-medium truncate">{previewName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewUrl && <PdfPreview src={previewUrl} className="h-full" />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
