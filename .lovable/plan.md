## Objetivo

Simplificar a permissão para 3 conceitos:

1. **Admin** — acesso global, único papel "fora da hierarquia" (gerencia o sistema, vê tudo, faz tudo).
2. **Módulos** — switch on/off por usuário (Gestão, Operação, Diretório, Financeiro, Config, BI).
3. **Funções de Operação** — subgrupo: `comercial`, `cadastro`, `credito`, `comite`, `formalizacao`. Só atribuíveis se o módulo Operação estiver on.

`gestor_geral` e `financeiro` deixam de existir como funções.

## Mapa de migração

| Hoje | Vira |
|---|---|
| `gestor_geral` | `admin` (sobe pra admin) |
| `financeiro` | módulo `financeiro_mod` habilitado (sem função) |
| `comercial`, `cadastro`, `credito`, `comite`, `formalizacao` | mantém + força módulo Operação on |
| `admin` | inalterado |

## Backend (migração SQL)

### 1. Backfill de dados

```sql
-- gestor_geral → admin (idempotente via ON CONFLICT)
INSERT INTO user_roles(user_id, role)
SELECT user_id, 'admin'::app_role FROM user_roles WHERE role='gestor_geral'
ON CONFLICT DO NOTHING;

-- financeiro → módulo financeiro_mod
INSERT INTO user_module_permissions(user_id, module_key, enabled)
SELECT user_id, 'financeiro_mod', true FROM user_roles WHERE role='financeiro'
ON CONFLICT (user_id, module_key) DO UPDATE SET enabled=true;

-- Funções operacionais → módulo operacao
INSERT INTO user_module_permissions(user_id, module_key, enabled)
SELECT DISTINCT user_id, 'operacao', true FROM user_roles
WHERE role IN ('comercial','cadastro','credito','comite','formalizacao')
ON CONFLICT (user_id, module_key) DO UPDATE SET enabled=true;

-- Remove papéis obsoletos
DELETE FROM user_roles WHERE role IN ('gestor_geral','financeiro');
```

### 2. Funções/políticas de RLS

- **`is_gestor_geral(uid)`** — redefinir como `SELECT public.has_role(_user_id,'admin')`. Mantém compat com as ~15 chamadas existentes sem reescrever cada policy.
- **`has_role(uid,'financeiro')`** nas policies de `investidores` (3 policies) — trocar por `public.can_access_module(uid,'financeiro_mod')`.
- Enum `app_role` **não é alterado** (evita migration pesada de tipos); `gestor_geral` e `financeiro` ficam órfãos no enum, sem usuários.

### 3. Hierarquia: triggers de consistência

```sql
-- Bloqueia atribuir função operacional sem módulo Operação
CREATE FUNCTION enforce_role_module_dependency() RETURNS trigger ...
  IF NEW.role IN ('comercial','cadastro','credito','comite','formalizacao')
     AND NOT can_access_module(NEW.user_id, 'operacao')
  THEN RAISE EXCEPTION 'Ative o módulo Operação antes';

-- Cascade: desativar módulo Operação remove funções operacionais
CREATE FUNCTION cascade_module_disable() RETURNS trigger ...
  IF NEW.module_key='operacao' AND NEW.enabled=false THEN
    DELETE FROM user_roles WHERE user_id=NEW.user_id
      AND role IN ('comercial','cadastro','credito','comite','formalizacao');
```

## Frontend

### `src/lib/roles.ts`
- `PRIMARY_ROLES` passa a ter só: `comercial`, `cadastro`, `credito`, `comite`, `formalizacao`.
- `ALL_ROLES` = `[...PRIMARY_ROLES, 'admin']`.
- Remover `gestor_geral` e `financeiro` dos labels exibidos (mantém no enum por compat).

### `AdminPermissoes.tsx`
Tabela enxuta — 4 colunas:

```text
Usuário | Acessos (botão "3 módulos · 2 funções") | Equipe | Ativo
```

- Remove as 6 colunas de módulos da grade e a coluna Funções.
- Botão "Acessos" abre o drawer.

### `UserAccessDrawer.tsx` (renomeia `UserRolesDrawer.tsx`)

Drawer agrupa tudo num só lugar:

```text
┌─ Administrador                    [○] ┐
│   Acesso global a todos os módulos    │
└───────────────────────────────────────┘

┌─ Operação                         [●] ┐
│ Funções:                              │
│  [Comercial] [Cadastro] [Crédito]     │
│  [Comitê]    [Formalização]           │
└───────────────────────────────────────┘

┌─ Outros módulos ──────────────────────┐
│ [●] Gestão        [●] Diretório       │
│ [●] Financeiro    [○] Config  [○] BI  │
└───────────────────────────────────────┘
```

- Toggle Admin no topo (quando on, todos os módulos ficam on e travados, igual hoje).
- Seção Operação: switch do módulo + grid de chips selecionáveis das 5 funções. Chips desabilitados quando módulo off.
- Seção "Outros módulos" — só switches.
- Desligar Operação remove funções (com `confirm()`).

## Impactos secundários a revisar

- `useAuth.hasRole('gestor_geral')` / `hasRole('financeiro')` em componentes — substituir por `hasRole('admin')` ou `useModulePermissions().has('financeiro_mod')`. Buscar usos com `rg`.
- `committee_eligible_voter_ids()` — continua usando `role='comite'`, ok.
- `admin_list_users` retorna roles[]; o drawer ignora `gestor_geral`/`financeiro` mesmo se aparecerem.

## Arquivos

- **Editar**: `src/pages/admin/AdminPermissoes.tsx`, `src/lib/roles.ts`, qualquer componente que use `hasRole('gestor_geral')` ou `hasRole('financeiro')`.
- **Renomear/reescrever**: `src/pages/admin/UserRolesDrawer.tsx` → `UserAccessDrawer.tsx`.
- **Migração SQL**: 1 arquivo com backfill + redefinição de `is_gestor_geral` + atualização das 3 policies de `investidores` + 2 triggers de consistência.

## Trade-offs

- **Ganha**: 3 papéis a menos, hierarquia explícita módulo→função, tabela enxuta, drawer único e auto-explicativo.
- **Custo**: migração de dados sensível (admin é elevado a partir de gestor_geral); políticas de `investidores` mudam semântica (módulo passa a ser suficiente).
- **Reversível**: enum mantém os valores antigos; se precisar voltar, é só repopular `user_roles`.