import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  capital_social: number | null;
  natureza_juridica: string;
  data_abertura: string;
  situacao_cadastral: string;
  setor: string;
  faturamento_medio: number | null;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
}

const empty: FormData = {
  cnpj: "", razao_social: "", nome_fantasia: "", capital_social: null,
  natureza_juridica: "", data_abertura: "", situacao_cadastral: "",
  setor: "", faturamento_medio: null,
  cep: "", logradouro: "", numero: "", bairro: "", cidade: "", estado: "",
  telefone: "", email: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function CedenteNovoSheet({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [validatingCNPJ, setValidatingCNPJ] = useState(false);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleCNPJBlur = async () => {
    const clean = form.cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setValidatingCNPJ(true);
    const { data, error } = await supabase.functions.invoke("validate-cnpj", { body: { cnpj: clean } });
    setValidatingCNPJ(false);
    if (error || !data?.success) {
      toast.error("Não foi possível validar o CNPJ", { description: data?.error || error?.message });
      return;
    }
    const d = data.data;
    setForm((p) => ({
      ...p,
      cnpj: d.cnpj,
      razao_social: d.razao_social || p.razao_social,
      nome_fantasia: d.nome_fantasia || p.nome_fantasia,
      capital_social: d.capital_social || p.capital_social,
      natureza_juridica: d.natureza_juridica || p.natureza_juridica,
      logradouro: d.logradouro || p.logradouro,
      numero: d.numero || p.numero,
      bairro: d.bairro || p.bairro,
      cidade: d.municipio || p.cidade,
      estado: d.uf || p.estado,
      cep: d.cep || p.cep,
      telefone: d.telefone || p.telefone,
      email: d.email || p.email,
      data_abertura: d.data_abertura || p.data_abertura,
      situacao_cadastral: d.situacao || p.situacao_cadastral,
    }));
    toast.success("Dados preenchidos via CNPJ");
  };

  const handleCEPBlur = async () => {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const { data, error } = await supabase.functions.invoke("validate-cep", { body: { cep: clean } });
    if (error || !data?.success) {
      toast.error("CEP não encontrado");
      return;
    }
    setForm((p) => ({
      ...p,
      cep: data.data.cep,
      logradouro: data.data.logradouro || p.logradouro,
      bairro: data.data.bairro || p.bairro,
      cidade: data.data.cidade || p.cidade,
      estado: data.data.estado || p.estado,
    }));
  };

  const save = async () => {
    if (!form.cnpj || !form.razao_social) {
      toast.error("CNPJ e Razão Social são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      cnpj: form.cnpj.replace(/\D/g, ""),
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia || null,
      capital_social: form.capital_social,
      natureza_juridica: form.natureza_juridica || null,
      logradouro: form.logradouro || null,
      endereco: form.logradouro || null,
      numero: form.numero || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep ? form.cep.replace(/\D/g, "") : null,
      telefone: form.telefone || null,
      email: form.email || null,
      data_abertura: form.data_abertura || null,
      situacao_cadastral: form.situacao_cadastral || null,
      setor: form.setor || null,
      faturamento_medio: form.faturamento_medio,
      owner_id: user?.id,
      created_by: user?.id,
      stage: "novo" as const,
    };
    const { data, error } = await supabase.from("cedentes").insert(payload).select("id").single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar cedente", { description: error.message });
      return;
    }
    toast.success("Cedente criado");
    onOpenChange(false);
    onCreated?.(data.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Novo cadastro</SheetTitle>
          <SheetDescription>Preencha os dados do cedente. Sócios e documentos podem ser adicionados depois.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Identificação</h3>
            <div className="space-y-2">
              <Label>CNPJ *</Label>
              <div className="relative">
                <Input
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", e.target.value)}
                  onBlur={handleCNPJBlur}
                  placeholder="00.000.000/0000-00"
                />
                {validatingCNPJ && (
                  <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tab pra autopreencher via Receita</p>
            </div>
            <div className="space-y-2">
              <Label>Razão Social *</Label>
              <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Capital Social</Label>
                <CurrencyInput value={form.capital_social} onValueChange={(v) => set("capital_social", v)} />
              </div>
              <div className="space-y-2">
                <Label>Data de Abertura</Label>
                <Input type="date" value={form.data_abertura} onChange={(e) => set("data_abertura", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Natureza Jurídica</Label>
              <Input value={form.natureza_juridica} onChange={(e) => set("natureza_juridica", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={form.setor} onChange={(e) => set("setor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Faturamento médio (mensal)</Label>
                <CurrencyInput value={form.faturamento_medio} onValueChange={(v) => set("faturamento_medio", v)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Endereço</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} onBlur={handleCEPBlur} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-3 border-t flex justify-end gap-2 bg-card">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
