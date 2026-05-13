## Objetivo

Trocar o controle de **acesso a módulos do menu** de "por perfil (app_role)" para **"por usuário"**, com default **bloqueado**. Papéis continuam existindo (identidade/função e regras de etapas), mas não decidem mais o que aparece no menu.

## Modelo de dados

Nova tabela `user_module_permissions`:
- `user_id` (uuid, FK profiles)
- `module_key` (text: gestao, operacao, diretorio, financeiro_mod, config, bi)
- `enabled` (bool, default true)
- unique (`user_id`, `module_key`)
- RLS: SELECT para o próprio usuário e admin; INSERT/UPDATE/DELETE só admin

Função `can_access_module(_user_id, _module_key)` (security definer):
- admin → sempre true
- senão → existe registro com `enabled = true`? caso contrário false (bloqueado por padrão)

A tabela `role_module_permissions` deixa de ser consultada pelo frontend (mantida no banco, sem uso, para evitar perda de histórico — pode ser removida depois).

## Frontend

**1. Hook `useModulePermissions`** — passa a buscar `user_module_permissions` do usuário logado e expõe `isModuleEnabled(key)` com default `false` (exceto admin).

**2. `AppSidebar`** — cada grupo do menu já é filtrado pelo hook; muda só a fonte de verdade.

**3. `RoleGuard` (moduleKey)** — continua igual, redireciona quando módulo não liberado.

**4. Tela de Permissões (`/configuracoes/permissoes`)** — substitui a matriz atual (Perfil × Módulo) pela **Matriz Usuário × Módulo**:
- Linhas: usuários ativos (nome + papéis como chips read-only)
- Colunas: 6 módulos
- Switch por célula, salvar otimista (igual ao atual)
- Filtro de busca por nome/email
- Admin sempre marcado e desabilitado

**5. Admin > Usuários — nova aba "Permissões"** no editor do usuário:
- Mesma lista de módulos com switches, escopo só daquele usuário
- Reaproveita o mesmo serviço de upsert

## Migração de dados

Script de seed único: para cada usuário existente, copiar para `user_module_permissions` o resultado efetivo do modelo antigo (união dos `role_module_permissions` dos papéis dele). Isso garante que ninguém perde acesso na virada.

## Fora de escopo (confirmado)

- Permissões de etapa (`stage_permissions`, `permission_profiles`) **não mudam** — continuam por papel via perfis de permissão.
- Papéis (`user_roles`) continuam controlando RLS de tabelas e regras de etapa.

## Detalhes técnicos

- Migration cria tabela + RLS + função + seed.
- Invalidar `queryKey: ["user-module-permissions", userId]` após toggles.
- Remover `ALL_ROLES_FOR_MATRIX` e `ModulePermissionsMatrix` antigo (ou manter só o componente novo no lugar).
- Sem mudanças em `useAuth`, `roles.ts`, ou guards de etapa.