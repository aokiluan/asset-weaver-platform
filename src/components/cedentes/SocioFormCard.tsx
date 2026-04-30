import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Socio {
  id: string; // local id (uuid ou tmp-)
  persisted?: boolean;
  nome: string;
  sexo?: string;
  data_nascimento?: string;
  cpf?: string;
  rg?: string;
  orgao_emissor?: string;
  data_expedicao?: string;
  naturalidade?: string;
  nacionalidade?: string;
  nome_pai?: string;
  nome_mae?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_estado?: string;
  endereco_cep?: string;
  estado_civil?: string;
  conjuge_nome?: string;
  conjuge_sexo?: string;
  conjuge_data_nascimento?: string;
  conjuge_cpf?: string;
  conjuge_rg?: string;
  conjuge_orgao_emissor?: string;
  conjuge_data_expedicao?: string;
  conjuge_naturalidade?: string;
  conjuge_nacionalidade?: string;
}

interface Props {
  socio: Socio;
  index: number;
  onChange: (s: Socio) => void;
  onRemove: () => void;
  title?: string;
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export function SocioFormCard({ socio, index, onChange, onRemove, title, headerExtra, footerExtra }: Props) {
  const set = <K extends keyof Socio>(k: K, v: Socio[K]) => onChange({ ...socio, [k]: v });

  const handleCEP = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const { data, error } = await supabase.functions.invoke("validate-cep", { body: { cep: clean } });
    if (error || !data?.success) {
      toast.error("CEP não encontrado");
      return;
    }
    onChange({
      ...socio,
      endereco_cep: data.data.cep,
      endereco_logradouro: data.data.logradouro,
      endereco_bairro: data.data.bairro,
      endereco_cidade: data.data.cidade,
      endereco_estado: data.data.estado,
    });
    toast.success("Endereço preenchido");
  };

  const casado = socio.estado_civil === "casado" || socio.estado_civil === "uniao_estavel";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title ?? `Sócio ${index + 1}`}</h3>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Remover
        </Button>
      </div>

      {headerExtra}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label>Nome completo *</Label>
          <Input value={socio.nome} onChange={(e) => set("nome", e.target.value)} />
        </div>
        <div>
          <Label>Sexo</Label>
          <Select value={socio.sexo} onValueChange={(v) => set("sexo", v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data de nascimento</Label>
          <Input type="date" value={socio.data_nascimento ?? ""} onChange={(e) => set("data_nascimento", e.target.value)} />
        </div>
        <div>
          <Label>CPF</Label>
          <Input value={socio.cpf ?? ""} onChange={(e) => set("cpf", e.target.value)} />
        </div>
        <div>
          <Label>RG</Label>
          <Input value={socio.rg ?? ""} onChange={(e) => set("rg", e.target.value)} />
        </div>
        <div>
          <Label>Órgão emissor</Label>
          <Input value={socio.orgao_emissor ?? ""} onChange={(e) => set("orgao_emissor", e.target.value)} />
        </div>
        <div>
          <Label>Data de expedição</Label>
          <Input type="date" value={socio.data_expedicao ?? ""} onChange={(e) => set("data_expedicao", e.target.value)} />
        </div>
        <div>
          <Label>Naturalidade</Label>
          <Input value={socio.naturalidade ?? ""} onChange={(e) => set("naturalidade", e.target.value)} />
        </div>
        <div>
          <Label>Nacionalidade</Label>
          <Input value={socio.nacionalidade ?? ""} onChange={(e) => set("nacionalidade", e.target.value)} />
        </div>
        <div>
          <Label>Nome do pai</Label>
          <Input value={socio.nome_pai ?? ""} onChange={(e) => set("nome_pai", e.target.value)} />
        </div>
        <div>
          <Label>Nome da mãe</Label>
          <Input value={socio.nome_mae ?? ""} onChange={(e) => set("nome_mae", e.target.value)} />
        </div>
      </div>

      <div className="pt-2">
        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Endereço</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>CEP</Label>
            <Input
              value={socio.endereco_cep ?? ""}
              onChange={(e) => set("endereco_cep", e.target.value)}
              onBlur={(e) => handleCEP(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <Label>Logradouro</Label>
            <Input value={socio.endereco_logradouro ?? ""} onChange={(e) => set("endereco_logradouro", e.target.value)} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={socio.endereco_numero ?? ""} onChange={(e) => set("endereco_numero", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={socio.endereco_bairro ?? ""} onChange={(e) => set("endereco_bairro", e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={socio.endereco_cidade ?? ""} onChange={(e) => set("endereco_cidade", e.target.value)} />
          </div>
          <div>
            <Label>UF</Label>
            <Input value={socio.endereco_estado ?? ""} onChange={(e) => set("endereco_estado", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Label>Estado civil</Label>
        <Select value={socio.estado_civil} onValueChange={(v) => set("estado_civil", v)}>
          <SelectTrigger className="md:w-[260px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
            <SelectItem value="casado">Casado(a)</SelectItem>
            <SelectItem value="uniao_estavel">União estável</SelectItem>
            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {casado && (
        <div className="pt-2 border-t">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Dados do cônjuge</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Nome do cônjuge</Label>
              <Input value={socio.conjuge_nome ?? ""} onChange={(e) => set("conjuge_nome", e.target.value)} />
            </div>
            <div>
              <Label>Sexo</Label>
              <Select value={socio.conjuge_sexo} onValueChange={(v) => set("conjuge_sexo", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={socio.conjuge_data_nascimento ?? ""} onChange={(e) => set("conjuge_data_nascimento", e.target.value)} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={socio.conjuge_cpf ?? ""} onChange={(e) => set("conjuge_cpf", e.target.value)} />
            </div>
            <div>
              <Label>RG</Label>
              <Input value={socio.conjuge_rg ?? ""} onChange={(e) => set("conjuge_rg", e.target.value)} />
            </div>
            <div>
              <Label>Órgão emissor</Label>
              <Input value={socio.conjuge_orgao_emissor ?? ""} onChange={(e) => set("conjuge_orgao_emissor", e.target.value)} />
            </div>
            <div>
              <Label>Data de expedição</Label>
              <Input type="date" value={socio.conjuge_data_expedicao ?? ""} onChange={(e) => set("conjuge_data_expedicao", e.target.value)} />
            </div>
            <div>
              <Label>Naturalidade</Label>
              <Input value={socio.conjuge_naturalidade ?? ""} onChange={(e) => set("conjuge_naturalidade", e.target.value)} />
            </div>
            <div>
              <Label>Nacionalidade</Label>
              <Input value={socio.conjuge_nacionalidade ?? ""} onChange={(e) => set("conjuge_nacionalidade", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {footerExtra}
    </div>
  );
}
