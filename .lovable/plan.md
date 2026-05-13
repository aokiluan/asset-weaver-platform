## Objetivo

Unificar **Usuários** e **Permissões** numa única tela em `/configuracoes/permissoes`. A aba "Usuários" some do menu de Configurações.

## Nova tela Permissões

Uma única tabela com tudo por usuário, no padrão Nibo ultracompacto:

```
| Usuário                  | Funções (papéis)        | Equipe        | Gestão | Operação | Diretório | Financeiro | Config | BI | Ativo |
| Alessandra (email)       | [Comitê x][Cadastro x]+ | [Sem equipe▾] |   ✓    |    ✓     |     ✓     |     —      |   —    | —  |  ⬤    |
| ...                                                                                                                                  |
```

- **Filtro** por nome/e-mail no topo.
- **Botão "Atribuir função"** no header da página (mesmo dialog atual: escolher usuário + papéis).
- **Coluna Funções**: chips com X para remover; botão "+" abre popover/dialog com checkboxes dos papéis para adicionar.
- **Coluna Equipe**: select inline (igual hoje).
- **6 colunas de módulos**: switch por célula. Admin → todos travados em on.
- **Coluna Ativo**: switch para `profiles.ativo`.

## Mudanças concretas

1. **`AppSidebar`** — remover item "Usuários" do grupo Configurações.
2. **Rotas** — manter `/configuracoes/usuarios` redirecionando para `/configuracoes/permissoes` (evita 404 em links salvos).
3. **`AdminPermissoes.tsx`** — substituir o conteúdo (atualmente só renderiza `ModulePermissionsMatrix`) por uma tela nova que combina:
   - Header com contagem + botão "Atribuir função" (movido de `AdminUsuarios`)
   - Filtro de busca
   - Tabela única com todas as colunas listadas acima
4. **Componente `UnifiedPermissionsTable`** novo — encapsula a tabela. Reaproveita o handler de toggle de módulos do componente atual e os handlers de papel/equipe/ativo do `AdminUsuarios`.
5. **Remover** `AdminUsuarios.tsx`, `ModulePermissionsMatrix.tsx` (substituído) e `UserModulePermissionsDialog.tsx` (não é mais necessário porque a edição é inline).
6. **`PageTabs` de Configurações** — tirar o tab "Usuários".
7. Atualizar memória do projeto se necessário (não há regra que conflite — não vou tocar).

## Sem mudanças em

- Banco: `user_roles`, `profiles`, `teams`, `user_module_permissions`, RLS, funções e regras de etapa permanecem iguais.
- `useAuth`, `roles.ts`, guards.

## Observação UX

Em viewport estreito (640px atual do usuário) a tabela vira scroll horizontal. A coluna "Usuário" fica sticky à esquerda; as 6 colunas de módulos formam um bloco rolável à direita, igual à matriz atual.