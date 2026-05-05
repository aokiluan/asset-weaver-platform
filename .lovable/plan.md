## Objetivo

Simplificar de 13 para 7 papéis, introduzir conceito de **equipes** com gestor próprio, e suportar dois níveis de gestão: **gestor de equipe** (vê só sua equipe) e **gestor geral** (vê tudo do papel).

## Modelo de papéis (final)

```text
admin           → acesso total
comercial       → etapa "novo"
cadastro        → etapa "cadastro"
credito         → etapa "análise"
comite          → etapa "comitê"
formalizacao    → etapa "formalização"
financeiro      → etapa "ativo"

+ flag "gestor_geral" → vê tudo do papel principal, em todas as equipes
+ ser gestor_id de uma team → vê só os membros daquela equipe
```

## Modelo de equipes

```text
teams
  id, nome, papel_principal (app_role), gestor_id (uuid → profiles), ativo

profiles
  + team_id (uuid → teams, nullable)
```

Exemplo:
```text
Comercial SP   (papel: comercial, gestor: João)
  └─ Maria, Pedro, João

Comercial RJ   (papel: comercial, gestor: Ana)
  └─ Carlos, Ana

Carlos extra: tem flag gestor_geral → vê SP + RJ
```

## Mapa de migração de papéis

| Antigo | Novo |
|---|---|
| admin | admin |
| comercial / gestor_comercial | comercial (+ gestor_geral se gestor) |
| analista_cadastro | cadastro |
| analista_credito / gestor_credito / gestor_risco | credito (+ gestor_geral se gestor) |
| comite | comite |
| financeiro / gestor_financeiro | financeiro (+ gestor_geral se gestor) |
| relacao_investidor / gestor_relacao_investidor / operacional | financeiro |

`team_id` fica **nulo** após migração — admin organiza na nova tela.

## Etapas de execução

### 1. Migração de banco (única migration)

- Criar enum novo `app_role` com: `admin, comercial, cadastro, credito, comite, formalizacao, financeiro, gestor_geral`
- Criar tabela `teams` (id, nome, papel_principal, gestor_id, ativo, timestamps) + RLS
- Adicionar `profiles.team_id` nullable + FK
- Migrar dados de `user_roles` conforme tabela acima (insert dos novos, delete dos antigos, drop+rename do enum com cast via text)
- Recriar funções com nova lógica:
  - `has_role(uid, role)`
  - `is_gestor_geral(uid)` — tem papel `gestor_geral`
  - `is_team_manager_of(uid, target_uid)` — uid é `gestor_id` da team em que `target_uid` está
  - `can_view_cedente(viewer, owner)` → admin OR gestor_geral(viewer) OR is_team_manager_of(viewer, owner) OR owner = viewer OR papéis de etapa (credito, cadastro, comite, formalizacao, financeiro)
  - `can_view_proposal`, `can_review_documento`, `can_decide_proposal` reescritos com mesma lógica
- Atualizar todas as RLS policies (cedentes, leads, propostas, documentos, visit_reports, comitê, pareceres) para usar novas funções
- Substituir `is_admin_or_gestor_comercial` por checagem `admin OR (comercial AND (gestor_geral OR team_manager))`

### 2. RLS de `teams`
- SELECT: autenticados (todos veem nomes de equipes, útil para selects)
- INSERT/UPDATE/DELETE: só admin

### 3. Front-end

- `src/lib/roles.ts`: novo `AppRole` (7 + `gestor_geral`) e `ROLE_LABEL`
- `src/lib/cedente-stages.ts`: `STAGE_PERMISSIONS` ajustado para os novos papéis
- `src/App.tsx`: `RoleGuard` em `/financeiro`, `/comite`, `/formalizacao` com novos papéis
- Buscar/substituir referências aos papéis antigos em todos os componentes
- `src/pages/admin/AdminUsuarios.tsx`:
  - Coluna "Papel principal" (select único)
  - Coluna "Equipe" (select de teams filtradas pelo papel)
  - Coluna "Gestor geral" (switch que adiciona/remove role `gestor_geral`)
  - Indicador visual de "é gestor desta equipe" (lê de `teams.gestor_id`)
- Nova página `src/pages/admin/AdminEquipes.tsx`:
  - Listar/criar/editar/desativar equipes
  - Definir papel principal e gestor da equipe
  - Listar membros da equipe (read-only, vem de `profiles.team_id`)
- `src/pages/Configuracoes.tsx`: adicionar aba "Equipes" → `/configuracoes/equipes`
- `src/App.tsx`: rota `/configuracoes/equipes`

## Detalhes técnicos

- Troca do enum: criar `app_role_new`, `ALTER COLUMN ... TYPE app_role_new USING role::text::app_role_new` em `user_roles` (com mapeamento prévio dos valores antigos para nomes válidos no novo enum), `DROP TYPE app_role`, `ALTER TYPE app_role_new RENAME TO app_role`
- Tudo numa migration transacional
- `src/integrations/supabase/types.ts` é regenerado automaticamente
- Restrição implícita: um usuário tem **um** papel principal + opcional `gestor_geral` + opcional vínculo a 1 equipe
- Validação: `teams.gestor_id` deve ser um profile que tem o papel correspondente a `teams.papel_principal` (validação no app, não no banco, para evitar trigger complexo)

## Fora de escopo (futuro)

- Sub-equipes (parent_team_id)
- Multi-equipe por usuário (vira tabela team_members)
- Auditoria de mudanças de papel/equipe
