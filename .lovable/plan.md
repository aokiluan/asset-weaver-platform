# Reorganizar módulo Configurações

## Estado final das abas (`src/pages/Configuracoes.tsx`)

```
Configurações
  1. Permissões              → /configuracoes/permissoes
  2. Equipes                 → /configuracoes/equipes
  3. Alçadas de crédito      → /configuracoes/alcadas
  4. Séries de investimento  → /configuracoes/series-investidor
```

- A aba **Pipeline** é removida (etapas comerciais já fechadas — sem necessidade de edição).
- A aba **Categorias de doc.** sai do nível raiz e passa a viver **dentro de Alçadas de crédito** como sub-aba, alinhada à ideia de que a exigibilidade documental varia por faixa de faturamento.
- Renomear "Alçadas" → "Alçadas de crédito".

## Estrutura interna de Alçadas de crédito

`/configuracoes/alcadas` ganha um nível de sub-abas próprio (PageTabs interno ou `Tabs` do shadcn — sub-abs leves para não conflitar com o `PageTabs` da página pai). Sub-abas:

```
Alçadas de crédito
  • Faixas de alçada        (conteúdo atual de AdminAlcadas)
  • Categorias de documento (conteúdo atual de AdminCategorias)
```

Implementação: criar uma página container `AdminAlcadasIndex` (novo arquivo `src/pages/admin/AdminAlcadasIndex.tsx`) que renderiza um `Tabs` com os dois conteúdos, mostrando `<AdminAlcadas />` ou `<AdminCategorias />` conforme aba selecionada (state local + query param `?sub=categorias`). Sem rotas filhas — mantém URL única e reaproveita 100% dos componentes existentes.

> Nota: o vínculo real "categoria exigida por faixa" exige nova relação no schema (`approval_level_id` em `documento_categorias` ou tabela ponte). **Não está nesta task** — fica como evolução futura. Esta task apenas organiza a UI para preparar a transição visual.

## Rotas (`src/App.tsx`)

- Remover rotas: `<Route path="pipeline" element={<AdminPipeline />} />` e `<Route path="categorias" element={<AdminCategorias />} />`.
- Substituir `<Route path="alcadas" element={<AdminAlcadas />} />` por `<Route path="alcadas" element={<AdminAlcadasIndex />} />`.
- Adicionar redirects de compatibilidade:
  - `/configuracoes/pipeline` → `/configuracoes/permissoes` (Navigate replace)
  - `/configuracoes/categorias` → `/configuracoes/alcadas?sub=categorias` (Navigate replace)
- Imports: remover `AdminPipeline` e (se não usado em outro lugar) `AdminCategorias` direto; adicionar `AdminAlcadasIndex`.

## Detalhes técnicos

- Arquivos a editar:
  - `src/pages/Configuracoes.tsx` (lista e ordem das abas; renomear "Alçadas" → "Alçadas de crédito"; remover Pipeline e Categorias de doc.)
  - `src/App.tsx` (rotas)
- Arquivos a criar:
  - `src/pages/admin/AdminAlcadasIndex.tsx` — container com `Tabs` internas, lê/escreve `?sub=categorias` no query string para deep-link.
- Arquivos preservados sem alteração interna:
  - `src/pages/admin/AdminAlcadas.tsx` (passa a ser embutido pelo Index)
  - `src/pages/admin/AdminCategorias.tsx` (passa a ser embutido pelo Index)
  - `src/pages/admin/AdminPipeline.tsx` (fica órfão de rota, pode ser limpo no futuro)
- Sem alterações em: schema do banco (`documento_categorias`, `approval_levels`), RLS, hooks, edge functions, ou qualquer outra lógica.
- `useModulePermissions` / `RoleGuard` continuam apontando para `moduleKey: "config"` no nível raiz — sub-abas herdam.

## Fora de escopo

- Vincular categorias de documento a faixas de alçada no banco (modelagem futura).
- Remover fisicamente `AdminPipeline.tsx`.
- Renomear rotas (`/configuracoes/alcadas` permanece).
