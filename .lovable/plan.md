## Objetivo

Refatorar a sidebar para um agrupamento estilo Nibo (categorias macro com sub-itens), e introduzir **abas de navegação no topo da página** (estilo "Configurações > Empresa | Categorias | Cobrança | NFS-e | API | Usuários | Avançado") para os módulos que hoje vivem como menus separados.

## Mudanças propostas

### 1. Novo agrupamento da sidebar (Nibo-like)

Hoje temos dois grupos planos (`GESTÃO` e `Administração`). Vamos para grupos macro com sub-itens (collapsible quando expandidos, ícone único quando colapsados). Proposta:

**OPERAÇÃO**
- Dashboard
- Leads
- Pipeline
- Cedentes
- Crédito
- Financeiro

**RELATÓRIOS / BI**  *(novo agrupamento)*
- Indicadores  → `/bi` (página com tabs internas)
- Uploads      → `/bi/uploads` (atual `/admin/relatorios`)
- Datasets     → `/bi/datasets` (atual `/admin/datasets`)
- Widgets      → `/bi/widgets` (atual `/admin/widgets`)

**CONFIGURAÇÕES**  *(consolida o atual "Administração")*
- Vai virar **um único item de menu** `/configuracoes` que abre uma página com **abas no topo**:
  - Usuários · Alçadas · Pipeline · Categorias de doc.

> As rotas antigas (`/admin/usuarios`, `/admin/alcadas`, etc.) continuam funcionando via redirect para `/configuracoes?tab=usuarios` etc., para não quebrar links.

### 2. Abas de navegação no topo da página (estilo Nibo print)

Padrão visual igual à imagem: título grande à esquerda + linha horizontal de tabs com underline azul na ativa.

Aplicado em duas páginas-shell:

- `/configuracoes` → tabs: Usuários | Alçadas | Pipeline | Categorias de doc.
- `/bi`           → tabs: Indicadores | Uploads | Datasets | Widgets

Implementação: novo componente `PageTabs` (wrapper sobre `NavLink` com underline ativo) + layout aninhado via `<Outlet />` do React Router. Cada aba é uma rota filha (`/configuracoes/usuarios`, `/configuracoes/alcadas` …), o que mantém URL deep-linkável e botão "voltar" do navegador funcionando.

### 3. Sidebar collapsible por grupo

Quando a sidebar está **expandida** (pin ou hover), cada grupo macro vira um **header clicável** que expande/colapsa seus sub-itens (chevron à direita). Quando **colapsada** (modo ícone), mostramos apenas os ícones individuais sem o header de grupo — comportamento que você já tem, só muda o agrupamento.

Estado de "qual grupo está aberto" persistido em `localStorage` (mesma chave/padrão do pin atual). O grupo que contém a rota ativa abre automaticamente.

## Detalhes técnicos

**Arquivos a alterar / criar:**

- `src/components/AppSidebar.tsx` — reestruturar `mainItems` para árvore com grupos macro + sub-itens; adicionar lógica de expand/collapse por grupo; manter o comportamento pin/hover atual.
- `src/components/PageTabs.tsx` *(novo)* — componente reutilizável renderizando `NavLink`s horizontais com underline ativo (cor `--primary`), título da página e descrição opcional. Visual idêntico ao print do Nibo.
- `src/pages/Configuracoes.tsx` *(novo)* — shell layout: `<PageTabs title="Configurações" tabs={[...]} />` + `<Outlet />`.
- `src/pages/BI.tsx` *(novo)* — shell layout análogo para Relatórios/BI.
- `src/pages/bi/BIIndicadores.tsx` *(novo)* — move o conteúdo de "Indicadores de carteira" que hoje vive no `Index.tsx` para uma página dedicada (mantém também no Dashboard, ou move — a definir abaixo).
- `src/App.tsx` — reorganizar as rotas em rotas aninhadas:
  ```
  /configuracoes
    ├── usuarios   (AdminUsuarios)
    ├── alcadas    (AdminAlcadas)
    ├── pipeline   (AdminPipeline)
    └── categorias (AdminCategorias)
  /bi
    ├── indicadores (BIIndicadores)
    ├── uploads     (AdminRelatorios)
    ├── datasets    (AdminDatasets)
    └── widgets     (AdminDashboardWidgets)
  ```
  + redirects das rotas antigas (`/admin/*`) para os novos paths.

**Sem alterações de banco** — é puramente reorganização de UI/rotas.

## Pergunta antes de implementar

Os widgets dinâmicos ("Indicadores de carteira") que hoje aparecem no **Dashboard** (`/`) — você quer:

- (A) **Mover** para `/bi/indicadores` e remover do Dashboard, OU
- (B) **Duplicar / manter nos dois lugares** (Dashboard mostra um resumo, BI mostra a versão completa com filtros)?

Posso assumir **(A) mover** se você não responder, mas confirma para eu não retrabalhar.
