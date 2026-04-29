import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, ArrowLeft, Plus, Building2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { SocioFormCard, Socio } from "@/components/cedentes/SocioFormCard";
import { useAuth } from "@/hooks/useAuth";

interface FormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  capital_social: number | null;
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  data_abertura: string;
  situacao_cadastral: string;
  setor: string;
  faturamento_medio: number | null;
}

const empty: FormData = {
  cnpj: "", razao_social: "", nome_fantasia: "", capital_social: null, natureza_juridica: "",
  logradouro: "", numero: "", bairro: "", cidade: "", estado: "", cep: "",
  telefone: "", email: "", data_abertura: "", situacao_cadastral: "",
  setor: "", faturamento_medio: null,
};

export default function CedenteCadastro() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cedenteId, setCedenteId] = useState<string | undefined>(routeId);
  const [activeTab, setActiveTab] = useState("dados");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingCNPJ, setValidatingCNPJ] = useState(false);
  const [form, setForm] = useState<FormData>(empty);
  const [socios, setSocios] = useState<Socio[]>([]);

  const isEdit = !!cedenteId;

  useEffect(() => {
    if (routeId) loadCedente(routeId);
  }, [routeId]);

  const loadCedente = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase.from("cedentes").select("*").eq("id", id).single();
    if (error) {
      toast.error("Erro ao carregar", { description: error.message });
      setLoading(false);
      return;
    }
    setForm({
      cnpj: data.cnpj ?? "",
      razao_social: data.razao_social ?? "",
      nome_fantasia: data.nome_fantasia ?? "",
      capital_social: data.capital_social,
      natureza_juridica: data.natureza_juridica ?? "",
      logradouro: data.logradouro ?? data.endereco ?? "",
      numero: data.numero ?? "",
      bairro: data.bairro ?? "",
      cidade: data.cidade ?? "",
      estado: data.estado ?? "",
      cep: data.cep ?? "",
      telefone: data.telefone ?? "",
      email: data.email ?? "",
      data_abertura: data.data_abertura ?? "",
      situacao_cadastral: data.situacao_cadastral ?? "",
      setor: data.setor ?? "",
      faturamento_medio: data.faturamento_medio,
    });

    const { data: socData } = await supabase.from("cedente_socios").select("*").eq("cedente_id", id);
    setSocios(
      (socData ?? []).map((s: any) => ({
        ...s,
        persisted: true,
      })),
    );
    setLoading(false);
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((p) => ({ ...p, [k]: v }));

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
    toast.success("Endereço preenchido");
  };

  const save = async (advance?: "socios" | "documentos") => {
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
    };

    let id = cedenteId;

    if (isEdit && id) {
      const { error } = await supabase.from("cedentes").update(payload).eq("id", id);
      if (error) { toast.error("Erro ao salvar", { description: error.message }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase
        .from("cedentes")
        .insert({ ...payload, owner_id: user?.id, created_by: user?.id, stage: "novo" })
        .select("id")
        .single();
      if (error) { toast.error("Erro ao criar", { description: error.message }); setSaving(false); return; }
      id = data.id;
      setCedenteId(id);
      window.history.replaceState({}, "", `/cedentes/${id}/editar`);
    }

    // Salvar sócios
    if (id && socios.length > 0) {
      // Estratégia simples: deletar todos e re-inserir (igual ao projeto antigo)
      await supabase.from("cedente_socios").delete().eq("cedente_id", id);
      const toInsert = socios.map((s) => {
        const { id: _localId, persisted: _p, ...rest } = s;
        return {
          ...rest,
          cedente_id: id,
          data_nascimento: rest.data_nascimento || null,
          data_expedicao: rest.data_expedicao || null,
          conjuge_data_nascimento: rest.conjuge_data_nascimento || null,
          conjuge_data_expedicao: rest.conjuge_data_expedicao || null,
          cpf: rest.cpf?.replace(/\D/g, "") || null,
          conjuge_cpf: rest.conjuge_cpf?.replace(/\D/g, "") || null,
          endereco_cep: rest.endereco_cep?.replace(/\D/g, "") || null,
        };
      });
      const { error: sErr } = await supabase.from("cedente_socios").insert(toInsert);
      if (sErr) { toast.error("Erro ao salvar sócios", { description: sErr.message }); setSaving(false); return; }
    }

    setSaving(false);
    toast.success("Cadastro salvo");

    if (advance === "socios") setActiveTab("socios");
    else if (advance === "documentos") {
      // documentos vivem no CedenteDetail
      navigate(`/cedentes/${id}#documentos`);
    }
  };

  const addSocio = () => {
    setSocios((p) => [
      ...p,
      { id: `tmp-${Date.now()}`, nome: "", nacionalidade: "Brasileira" } as Socio,
    ]);
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cedentes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? "Editar cadastro" : "Novo cadastro"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {form.razao_social || "Preencha os dados do cedente"}
            </p>
          </div>
        </div>
        <Button onClick={() => save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dados"><Building2 className="h-4 w-4 mr-1.5" /> Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="socios" disabled={!isEdit && !cedenteId}>
            <Users className="h-4 w-4 mr-1.5" /> Sócios ({socios.length})
          </TabsTrigger>
          <TabsTrigger value="documentos" disabled={!cedenteId}>
            <FileText className="h-4 w-4 mr-1.5" /> Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
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
                <p className="text-xs text-muted-foreground mt-1">Tab pra autopreencher via Receita</p>
              </div>
              <div className="md:col-span-2">
                <Label>Razão Social *</Label>
                <Input value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Nome Fantasia</Label>
                <Input value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
              </div>
              <div>
                <Label>Capital Social</Label>
                <Input
                  type="number"
                  value={form.capital_social ?? ""}
                  onChange={(e) => set("capital_social", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Natureza Jurídica</Label>
                <Input value={form.natureza_juridica} onChange={(e) => set("natureza_juridica", e.target.value)} />
              </div>
              <div>
                <Label>Data de Abertura</Label>
                <Input type="date" value={form.data_abertura} onChange={(e) => set("data_abertura", e.target.value)} />
              </div>
              <div>
                <Label>Situação Cadastral</Label>
                <Input value={form.situacao_cadastral} onChange={(e) => set("situacao_cadastral", e.target.value)} />
              </div>
              <div>
                <Label>Setor</Label>
                <Input value={form.setor} onChange={(e) => set("setor", e.target.value)} />
              </div>
              <div>
                <Label>Faturamento Médio (mensal)</Label>
                <Input
                  type="number"
                  value={form.faturamento_medio ?? ""}
                  onChange={(e) => set("faturamento_medio", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} onBlur={handleCEPBlur} />
              </div>
              <div className="md:col-span-3">
                <Label>Logradouro</Label>
                <Input value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
              </div>
              <div>
                <Label>Número</Label>
                <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.estado} onChange={(e) => set("estado", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => save("socios")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar e ir para Sócios →
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="socios" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Adicione todos os sócios e representantes legais da empresa.
            </p>
            <Button variant="outline" onClick={addSocio}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar sócio
            </Button>
          </div>

          {socios.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              Nenhum sócio cadastrado.
            </div>
          ) : (
            socios.map((s, i) => (
              <SocioFormCard
                key={s.id}
                socio={s}
                index={i}
                onChange={(novo) => setSocios((p) => p.map((x) => (x.id === s.id ? novo : x)))}
                onRemove={() => setSocios((p) => p.filter((x) => x.id !== s.id))}
              />
            ))
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("dados")}>← Voltar</Button>
            <Button onClick={() => save("documentos")} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar e ir para Documentos →
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                A gestão de documentos acontece na tela de detalhe do cedente.
              </p>
              {cedenteId && (
                <Button onClick={() => navigate(`/cedentes/${cedenteId}`)}>
                  Abrir cedente e gerenciar documentos
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
