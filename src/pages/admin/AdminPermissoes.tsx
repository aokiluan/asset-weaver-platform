import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Minus } from "lucide-react";
import { ALL_ROLES_FOR_MATRIX, ROLE_LABEL, type AppRole } from "@/lib/roles";
import {
  STAGE_ORDER,
  STAGE_LABEL,
  STAGE_PERMISSIONS,
  type CedenteStage,
} from "@/lib/cedente-stages";

interface UserRow {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  roles: AppRole[];
}

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
    itens: [
      "Zero documentos rejeitados",
      "Todos os documentos obrigatórios validados pelo Cadastro",
    ],
  },
  {
    from: "analise",
    to: "comite",
    itens: [
      "Parecer de crédito concluído (completude 8/8 + recomendação preenchida)",
    ],
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

export default function AdminPermissoes() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_list_users");
      setUsers(((data as UserRow[]) ?? []).filter((u) => u.ativo));
      setLoading(false);
    })();
  }, []);

  const usersByRole = useMemo(() => {
    const map: Record<string, UserRow[]> = {};
    for (const r of ALL_ROLES_FOR_MATRIX) map[r] = [];
    for (const u of users) for (const r of u.roles) map[r]?.push(u);
    return map;
  }, [users]);

  // Etapas mostradas na matriz: as que têm transição de saída
  const stagesCols = STAGE_ORDER; // novo..ativo (ativo não tem saída, mas mostramos para clareza)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-medium tracking-tight">Permissões</h1>
        <p className="text-[12px] text-muted-foreground leading-tight mt-1">
          Auditoria de quem pode movimentar a esteira e o que precisa estar pronto em cada etapa.
        </p>
      </div>

      {/* Aviso */}
      <Card className="p-2.5 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[12px] leading-tight text-foreground">
            <strong>Os gates valem para todos, inclusive admin e gestor geral.</strong>{" "}
            Se um botão de avanço estiver desabilitado, abra o tooltip dele para ver as pendências —
            elas precisam ser resolvidas pelo time responsável da etapa.
          </div>
        </div>
      </Card>

      {/* Bloco 1 — Matriz Papel × Etapa */}
      <Card className="p-2.5">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase leading-none text-muted-foreground tracking-wide">
              Bloco 1
            </div>
            <div className="text-[13px] font-medium leading-tight mt-0.5">
              Quem pode ENVIAR a partir de cada etapa
            </div>
          </div>

          <div className="overflow-x-auto -mx-2.5">
            <table className="w-full text-[12px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left font-medium px-2.5 py-1.5 text-[11px] text-muted-foreground sticky left-0 bg-card">
                    Papel
                  </th>
                  {stagesCols.map((s) => (
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
                {ALL_ROLES_FOR_MATRIX.map((role) => (
                  <tr key={role} className="border-t border-border">
                    <td className="px-2.5 py-1.5 font-medium sticky left-0 bg-card">
                      {ROLE_LABEL[role]}
                    </td>
                    {stagesCols.map((s) => {
                      const allowed = (STAGE_PERMISSIONS[s] ?? []).includes(role);
                      return (
                        <td key={s} className="text-center px-2 py-1.5">
                          {allowed ? (
                            <Check className="size-3.5 text-primary inline" />
                          ) : (
                            <Minus className="size-3 text-muted-foreground/40 inline" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Owner (caso especial) */}
                <tr className="border-t border-border">
                  <td className="px-2.5 py-1.5 font-medium sticky left-0 bg-card">
                    Owner do cedente <span className="text-muted-foreground text-[10px]">(*)</span>
                  </td>
                  {stagesCols.map((s) => (
                    <td key={s} className="text-center px-2 py-1.5">
                      {s === "novo" ? (
                        <Check className="size-3.5 text-primary inline" />
                      ) : (
                        <Minus className="size-3 text-muted-foreground/40 inline" />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground leading-none">
            (*) Mesmo sem o papel "comercial", o dono do cedente pode enviá-lo para Cadastro enquanto está em "Novo".
          </p>
        </div>
      </Card>

      {/* Bloco 2 — Gates */}
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

      {/* Bloco 3 — Usuários por papel */}
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

          {loading ? (
            <div className="text-[12px] text-muted-foreground">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ALL_ROLES_FOR_MATRIX.map((role) => {
                const list = usersByRole[role] ?? [];
                return (
                  <div key={role} className="rounded-md border border-border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[12px] font-medium leading-none">
                        {ROLE_LABEL[role]}
                      </div>
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
    </div>
  );
}
