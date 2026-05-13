import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Check, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ALL_ROLES_FOR_MATRIX, ROLE_LABEL, type AppRole } from "@/lib/roles";
import { STAGE_LABEL, type CedenteStage } from "@/lib/cedente-stages";
import {
  useStagePermissions,
  type PermissionProfile,
} from "@/hooks/useStagePermissions";
import ModulePermissionsMatrix from "./ModulePermissionsMatrix";

interface UserRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles: AppRole[];
}

// Etapas com transição de saída — coluna "Ativo" foi removida
const EDITABLE_STAGES: CedenteStage[] = [
  "novo",
  "cadastro",
  "analise",
  "comite",
  "formalizacao",
];

const GATES: { from: CedenteStage; to: CedenteStage; itens: string[] }[] = [
  {
    from: "novo",
    to: "cadastro",
    itens: [
      "Documentos obrigatórios anexados",
      "Relatório comercial preenchido (com pleito de limite e modalidades)",
    ],
  },
  {
    from: "cadastro",
    to: "analise",
    itens: ["Zero documentos rejeitados", "Todos os documentos obrigatórios validados pelo Cadastro"],
  },
  {
    from: "analise",
    to: "comite",
    itens: ["Parecer de crédito concluído (completude 8/8 + recomendação preenchida)"],
  },
  {
    from: "comite",
    to: "formalizacao",
    itens: ["Decisão do comitê registrada (aprovação majoritária)"],
  },
  {
    from: "formalizacao",
    to: "ativo",
    itens: ["Minuta gerada e assinada"],
  },
];

interface ProfileFormState {
  id?: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  app_roles: AppRole[];
}

const EMPTY_FORM: ProfileFormState = {
  nome: "",
  descricao: "",
  ativo: true,
  app_roles: [],
};

export default function AdminPermissoes() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const queryClient = useQueryClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const { data: profiles = [], isLoading: loadingProfiles } = useStagePermissions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<PermissionProfile | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_list_users");
      setUsers(((data as UserRow[]) ?? []).filter((u) => u.ativo));
      setLoadingUsers(false);
    })();
  }, []);

  const usersByRole = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    for (const r of ALL_ROLES_FOR_MATRIX) map[r] = [];
    for (const u of users) for (const r of u.roles) map[r]?.push(u);
    return map;
  }, [users]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["stage-permissions"] });

  async function toggleCell(profile: PermissionProfile, stage: CedenteStage, value: boolean) {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("stage_permissions")
      .upsert(
        { profile_id: profile.id, stage, can_send: value },
        { onConflict: "profile_id,stage" },
      );
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: PermissionProfile) {
    setForm({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? "",
      ativo: p.ativo,
      app_roles: p.app_roles,
    });
    setDialogOpen(true);
  }

  async function saveProfile() {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let profileId = form.id;
      if (profileId) {
        const { error } = await supabase
          .from("permission_profiles")
          .update({
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            ativo: form.ativo,
          })
          .eq("id", profileId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("permission_profiles")
          .insert({
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            ativo: form.ativo,
            is_system: false,
            ordem: 100,
          })
          .select("id")
          .single();
        if (error) throw error;
        profileId = data.id;

        // Inicializa células da matriz para todas as etapas (false)
        const cells = EDITABLE_STAGES.concat(["ativo", "inativo"] as CedenteStage[]).map((s) => ({
          profile_id: profileId!,
          stage: s,
          can_send: false,
        }));
        await supabase.from("stage_permissions").insert(cells);
      }

      // Sincroniza vínculos de papel
      await supabase.from("profile_role_bindings").delete().eq("profile_id", profileId!);
      if (form.app_roles.length > 0) {
        await supabase
          .from("profile_role_bindings")
          .insert(form.app_roles.map((r) => ({ profile_id: profileId!, app_role: r })));
      }

      toast({ title: "Perfil salvo" });
      setDialogOpen(false);
      invalidate();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile(p: PermissionProfile) {
    const { error } = await supabase.from("permission_profiles").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil removido" });
    setConfirmDelete(null);
    invalidate();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-medium tracking-tight">Permissões</h1>
        <p className="text-[12px] text-muted-foreground leading-tight mt-1">
          Controle quais módulos do menu cada papel enxerga.
        </p>
      </div>

      {/* Blocos 1, 2 e 3 ocultados a pedido (código preservado abaixo).
      {/* Bloco 1 — Matriz Papel × Etapa (editável) */}
      {false && (
      <Card className="p-2.5">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase leading-none text-muted-foreground tracking-wide">
              Bloco 1
            </div>
            <div className="text-[13px] font-medium leading-tight mt-0.5">
              Quem pode ENVIAR a partir de cada etapa
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Visualização somente leitura. Edição desabilitada.
            </p>
          </div>

          {loadingProfiles ? (
            <div className="text-[12px] text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto -mx-2.5">
              <table className="w-full text-[12px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left font-medium px-2.5 py-1.5 text-[11px] text-muted-foreground sticky left-0 bg-card">
                      Perfil
                    </th>
                    {EDITABLE_STAGES.map((s) => (
                      <th
                        key={s}
                        className="text-center font-medium px-2 py-1.5 text-[11px] text-muted-foreground whitespace-nowrap"
                      >
                        {STAGE_LABEL[s]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-2.5 py-1.5 sticky left-0 bg-card">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${!p.ativo ? "text-muted-foreground line-through" : ""}`}>
                            {p.nome}
                          </span>
                          {p.is_system && (
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-[9px] font-normal"
                            >
                              sistema
                            </Badge>
                          )}
                        </div>
                        {p.app_roles.length > 0 && (
                          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                            {p.app_roles.map((r) => ROLE_LABEL[r]).join(" · ")}
                          </div>
                        )}
                      </td>
                      {EDITABLE_STAGES.map((s) => {
                        const checked = !!p.permissions[s];
                        return (
                          <td key={s} className="text-center px-2 py-1.5">
                            <Checkbox
                              checked={checked}
                              disabled
                              aria-label={`${p.nome} pode enviar de ${STAGE_LABEL[s]}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Owner (caso especial) */}
                  <tr className="border-t border-border">
                    <td className="px-2.5 py-1.5 sticky left-0 bg-card">
                      <span className="font-medium">
                        Owner do cedente{" "}
                        <span className="text-muted-foreground text-[10px]">(*)</span>
                      </span>
                    </td>
                    {EDITABLE_STAGES.map((s) => (
                      <td key={s} className="text-center px-2 py-1.5">
                        {s === "novo" ? (
                          <Check className="size-3.5 text-primary inline" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground leading-none">
            (*) Mesmo sem o papel "Comercial", o dono do cedente pode enviá-lo para Cadastro
            enquanto está em "Novo". Esta regra é fixa.
          </p>
        </div>
      </Card>
      )}

      {/* Bloco 2 — Gates */}
      {false && (
      <Card className="p-2.5">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase leading-none text-muted-foreground tracking-wide">
              Bloco 2
            </div>
            <div className="text-[13px] font-medium leading-tight mt-0.5">
              O que precisa estar pronto para avançar (gates)
            </div>
          </div>

          <ul className="space-y-2">
            {GATES.map((g) => (
              <li key={g.from} className="border-l-2 border-primary/40 pl-2.5">
                <div className="text-[11px] text-muted-foreground leading-none mb-0.5">
                  {STAGE_LABEL[g.from]} → {STAGE_LABEL[g.to]}
                </div>
                <ul className="text-[12px] leading-tight space-y-0.5">
                  {g.itens.map((it) => (
                    <li key={it} className="flex items-start gap-1.5">
                      <Check className="size-3 text-primary mt-0.5 shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      )}

      {/* Bloco 3 — Usuários por papel */}
      {false && (
      <Card className="p-2.5">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase leading-none text-muted-foreground tracking-wide">
              Bloco 3
            </div>
            <div className="text-[13px] font-medium leading-tight mt-0.5">
              Usuários ativos por papel
            </div>
          </div>

          {loadingUsers ? (
            <div className="text-[12px] text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALL_ROLES_FOR_MATRIX.map((role) => {
                const list = usersByRole[role] ?? [];
                return (
                  <div key={role} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[12px] font-medium leading-none">{ROLE_LABEL[role]}</div>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-normal">
                        {list.length}
                      </Badge>
                    </div>
                    {list.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground leading-none">
                        Nenhum usuário
                      </div>
                    ) : (
                      <ul className="space-y-0.5">
                        {list.map((u) => (
                          <li key={u.id} className="text-[12px] leading-tight">
                            <span className="font-medium">{u.nome}</span>
                            <span className="text-muted-foreground ml-1.5 text-[10px]">
                              {u.email}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
      )}

      {/* Bloco 4 — Matriz Papel × Módulo */}
      <ModulePermissionsMatrix isAdmin={isAdmin} />

      {/* Dialog: novo / editar perfil */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[14px]">
              {form.id ? "Editar perfil" : "Novo perfil"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="h-7 text-[12px]"
                placeholder="Ex: Crédito Sênior"
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
                className="text-[12px]"
                placeholder="Para que serve este perfil"
              />
            </div>
            <div className="space-y-1">
              <Label>Papéis base vinculados</Label>
              <div className="grid grid-cols-2 gap-1.5 border border-border rounded-md p-2">
                {ALL_ROLES_FOR_MATRIX.map((r) => {
                  const checked = form.app_roles.includes(r);
                  return (
                    <label
                      key={r}
                      className="flex items-center gap-1.5 text-[12px] cursor-pointer leading-none"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setForm({
                            ...form,
                            app_roles: v
                              ? [...form.app_roles, r]
                              : form.app_roles.filter((x) => x !== r),
                          });
                        }}
                      />
                      {ROLE_LABEL[r]}
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground leading-none mt-1">
                O perfil concede a um usuário todos os papéis vinculados (para fins de RLS e gates).
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ativo-switch">Perfil ativo</Label>
              <Switch
                id="ativo-switch"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="h-7">
              Cancelar
            </Button>
            <Button onClick={saveProfile} disabled={saving} className="h-7">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              O perfil "{confirmDelete?.nome}" e suas permissões na matriz serão removidos. Esta
              ação não afeta os papéis base atribuídos aos usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && deleteProfile(confirmDelete)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
