# Mover Pasta de Investidores e renomear módulo Diretório → Governança

## 1. Sidebar (`src/components/AppSidebar.tsx`)

- Mover item "Pasta de Investidores" do grupo `diretorio` para o grupo `relacao_investidores`, renomeando para **"Investidores"**. URL `/diretorio/investidores` é mantida (sem renomear rota — não foi pedido).
- Renomear o grupo `diretorio` para chave `governanca`, label **"Governança"**. O grupo fica sem itens; como o filtro atual exige `items.length > 0`, ele simplesmente não renderiza no menu — comportamento desejado ("vai ficar sem nenhuma seção").
- Grupo `relacao_investidores` final:
  ```
  RELAÇÃO COM INVESTIDORES
    Pipeline de Investidores  → /investidores/crm
    Investidores              → /diretorio/investidores
  ```

## 2. Renomear chave de módulo `diretorio` → `governanca` em todo o app

Substituir literais e tipos:
- `src/hooks/useModulePermissions.ts`: trocar `"diretorio"` por `"governanca"` no union `ModuleKey`.
- `src/pages/admin/UserAccessDrawer.tsx` (linha 14): `{ key: "diretorio", label: "Diretório" }` → `{ key: "governanca", label: "Governança" }`.
- `src/pages/admin/AdminPermissoes.tsx` (linha 21): no array `ALL_MODULE_KEYS`, trocar `"diretorio"` por `"governanca"`.
- Buscar e revisar qualquer outro `moduleKey: "diretorio"` no código (atualmente nenhum item de sidebar usa explicitamente — o filtro `isModuleEnabled(g.key)` usa a `key` do grupo, então a renomeação acima já cobre).

## 3. Migração de dados (`user_module_permissions`)

Atualmente existem registros com `module_key = 'diretorio'` no banco. Para preservar permissões já configuradas:

```sql
update public.user_module_permissions
set module_key = 'governanca'
where module_key = 'diretorio';
```

Aplicada via `supabase--migration`. Sem alteração de schema (a coluna é `text` livre).

## 4. Roteamento (`src/App.tsx`)

Sem mudanças — todas as rotas `/diretorio/...` continuam funcionando como hoje (`/diretorio/investidores`, `/diretorio/investidores/:id`, `/diretorio/:id` e o redirect `/diretorio` → `/cedentes`). O usuário não pediu para renomear URLs e fazer isso quebraria links externos / favoritos.

## Detalhes técnicos

- Arquivos a editar:
  - `src/components/AppSidebar.tsx`
  - `src/hooks/useModulePermissions.ts`
  - `src/pages/admin/UserAccessDrawer.tsx`
  - `src/pages/admin/AdminPermissoes.tsx`
- Migração SQL via `supabase--migration` para preservar permissões.
- Sem alteração em RLS, edge functions, schemas de tabelas, lógica de negócio, componentes de página, ou na rota `/diretorio/*`.
- O grupo "Governança" fica oculto no menu (sem itens), mas aparece nas telas de permissões/usuários para configuração futura.

## Fora de escopo

- Renomear rotas `/diretorio/...` para `/governanca/...`.
- Adicionar novas seções em Governança.
- Mexer em qualquer lógica de Pasta de Investidores além do local no menu/label.
