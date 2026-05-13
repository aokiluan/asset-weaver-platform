## Objetivo

Limpar visualmente a tabela de `/configuracoes/permissoes` removendo a coluna **Funções** da grade principal e movendo a gestão de funções para um **drawer por usuário**, sem alterar lógica de autorização (RLS, regras de etapa).

## Mudanças

### 1. Nova coluna "Funções" colapsada → botão
- Substituir a coluna atual (chips X/+) por uma célula compacta com:
  - Contagem (ex.: `3 funções`) em `text-[11px] text-muted-foreground`
  - Botão ghost `h-6` com ícone `Settings2` size-3.5 que abre o drawer
- Largura da coluna reduzida (~140px), liberando espaço horizontal para os módulos.

### 2. Novo componente `UserRolesDrawer.tsx`
- `Sheet` lateral (side="right", `w-[380px]`)
- Header: avatar + nome + email do usuário
- Body:
  - Lista de funções atribuídas (chips removíveis, padrão Nibo)
  - Combobox "Atribuir função" com as funções disponíveis (filtra as já atribuídas)
- Footer: botão "Fechar" ghost
- Reaproveita os handlers já existentes em `AdminPermissoes.tsx` (`addRole`, `removeRole`) — apenas movidos para props do drawer.

### 3. `AdminPermissoes.tsx`
- Remover JSX dos chips inline da coluna Funções.
- Adicionar estado `rolesDrawerUserId` e renderizar `<UserRolesDrawer>` controlado.
- Manter todos os handlers e queries (`user_roles`, RLS) intocados.
- Remover o botão "Atribuir função" do header (a ação agora vive dentro do drawer por usuário).

## Não muda

- Tabela `user_roles`, RLS, `has_role()`, regras de transição de etapa.
- Colunas Equipe, Ativo e os 6 módulos continuam idênticos.
- Hook `useModulePermissions`.

## Arquivos

- **Criar:** `src/pages/admin/UserRolesDrawer.tsx`
- **Editar:** `src/pages/admin/AdminPermissoes.tsx`

## Padrão visual

Segue Nibo ultracompacto: chips `h-5 text-[10px]`, botões `h-7`, drawer com `space-y-3`, label `text-[10px] leading-none`, valor `text-[12px] leading-tight`.