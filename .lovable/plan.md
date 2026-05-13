# Permissões de Módulos por Papel

Implementar camada parametrizável de visibilidade/acesso de **módulos do menu** por papel, sem tocar em RLS, em `user_roles`, em `roles.ts` ou em `cedente-stages.ts`. Esta camada controla apenas navegação (sidebar + guarda de rota), não dados.

A tela existente de Permissões (matriz papel × estágio) **continua existindo**: vamos criar uma segunda matriz (papel × módulo) na mesma página, em uma seção acima ou abaixo da atual — sem remover nada do que já está lá.

## Etapas

### 1. Migration Supabase
Tabela `public.role_module_permissions`:
- `role text` (string livre, espelha o enum `app_role` mas sem FK para evitar acoplamento)
- `module_key text`
- `enabled boolean default true`
- `updated_at timestamptz default now()`
- `updated_by uuid references public.profiles(id)`
- PK `(role, module_key)`

RLS:
- `SELECT` para qualquer autenticado
- `ALL` (insert/update/delete) somente `has_role(auth.uid(), 'admin')`

Seed: produto cartesiano de 8 papéis × 6 módulos (`gestao`, `operacao`, `diretorio`, `config`, `financeiro_mod`, `bi`), todos `enabled = true`.

Trigger `update_updated_at_column` em UPDATE (já existe a função no projeto).

### 2. Hook `src/hooks/useModulePermissions.ts`
- `useQuery(['role-module-permissions'], ...)` lendo todos os registros, `staleTime` 5 min.
- Usa `useAuth()` para descobrir os papéis do usuário.
- Retorna `{ isModuleEnabled(moduleKey), isLoading }`.
- Regra: `enabled = true` se **qualquer** papel do usuário tiver `enabled = true` para aquele `module_key`. Se não houver registro → tratar como `true` (fail-open, evita quebrar prod).
- Atalho: se o usuário tem papel `admin`, retorna `true` direto.

### 3. Tela `AdminPermissoes` — adicionar matriz Papel × Módulo
Manter a matriz papel × estágio atual. Adicionar nova seção (Card) "Acesso a módulos" com:

- Tabela com header fixo (módulos) e primeira coluna fixa (papéis).
- Labels:

```text
gestao          → Gestão
operacao        → Operação
diretorio       → Diretório
financeiro_mod  → Financeiro
config          → Configurações
bi              → BI
```

- Células com `Switch` (shadcn).
- Loading: Skeleton.
- Autosave: ao alternar, `upsert` em `role_module_permissions` setando `updated_by = auth.uid()`. Toast de sucesso/erro via `sonner`. Em erro, reverte estado local.
- Linha `admin`: switches sempre marcados e `disabled`, com `Tooltip` "Admin sempre tem acesso total a todos os módulos". O upsert não é executado para essa linha.
- Realtime opcional: invalidar a query após mutação.

### 4. `AppSidebar.tsx` — filtro por módulo
- Importar `useModulePermissions`.
- Em `visibleGroups`, adicionar `.filter(g => isModuleEnabled(g.key))` após o filtro de roles.
- Confirmar que os `key` de `GROUPS` batem com `module_key` da tabela. Hoje temos: `gestao`, `operacao`, `diretorio`, `config`. Não existe grupo `bi` nem `financeiro_mod` separados — BI está dentro de "Configurações", e Financeiro também é item dentro de "Configurações". Decisão para manter o spec coerente:
  - Filtrar **grupos** pelo `module_key` igual à `key` do grupo.
  - Filtrar **itens individuais** que mapeiam para módulos específicos:
    - item `Financeiro` (`/financeiro`) → `financeiro_mod`
    - itens `BI – *` (`/bi/*`) → `bi`
  - Demais itens herdam o módulo do grupo.

### 5. `RoleGuard` + rotas em `App.tsx`
- Adicionar prop opcional `moduleKey?: string` em `RoleGuard`.
- Se fornecida e `isModuleEnabled(moduleKey)` for `false` (após `loading`), `<Navigate to="/gestao/comercial" replace />`.
- Mantém o `hasRole` atual — módulo é camada adicional.
- Em `App.tsx`, passar `moduleKey`:
  - `/comite` → `operacao`
  - `/formalizacao` → `operacao`
  - `/financeiro` → `financeiro_mod`
  - `/configuracoes/*` → `config`
  - `/bi/*` → `bi` (envolver `BI` em `RoleGuard` com `role="admin"` + `moduleKey="bi"` — já tem o role guard).

### 6. `AdminUsuarios` — ajuste visual
- Garantir que **todos** os papéis do usuário são exibidos como `Badge` separados (a função `admin_list_users` já retorna `roles app_role[]`).
- Texto de apoio abaixo da seção de papéis: *"Os módulos acessíveis por cada papel são configurados em Configurações → Permissões."*
- Sem controle por usuário.

## Arquivos afetados
- `supabase/migrations/<timestamp>_role_module_permissions.sql` (novo)
- `src/hooks/useModulePermissions.ts` (novo)
- `src/pages/admin/AdminPermissoes.tsx` (adicionar seção)
- `src/components/AppSidebar.tsx`
- `src/components/RoleGuard.tsx`
- `src/App.tsx`
- `src/pages/admin/AdminUsuarios.tsx`

## Fora do escopo
- Não mexer em `user_roles`, `roles.ts`, `cedente-stages.ts`, RLS de outras tabelas.
- Não criar permissão por usuário individual.
- Matriz papel × estágio (já existente) permanece intacta.
