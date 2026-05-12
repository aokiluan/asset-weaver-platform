# Pipeline kanban — refator visual ultracompacto (Nibo)

Aplicar o padrão Nibo da memória core ao kanban em `src/pages/Pipeline.tsx`. Sem alterações de lógica, dados ou drag-and-drop.

## 1. Header da página
- Substituir o `<header>` manual por `<PageTabs title="Pipeline" description="..." tabs={[]} actions={...}/>` (mesmo padrão das demais páginas).
- Botão "Novo cadastro": `h-7 text-[12px]`, ícone `size-3.5`.

## 2. Colunas (`StageColumn`)
- Largura `w-64` (atual `w-72`) → mais colunas visíveis.
- Container: `rounded-md` (em vez de `lg`), `bg-muted/30`, `border`.
- Header da coluna: `px-2.5 py-1.5`, título `text-[12px] font-medium`, contador `text-[10px] text-muted-foreground tabular-nums`. Bolinha de cor `h-1.5 w-1.5`.
- Lista: `p-1.5 space-y-1.5`, altura `min-h-[160px] max-h-[calc(100vh-220px)]`.
- Footer "Faturamento": `px-2.5 py-1 text-[10px] leading-none`.
- Estado "Vazio": `text-[10px] text-muted-foreground/60 text-center py-3`.

## 3. Card do cedente (`CedenteCardItem`)
- `p-2` (era `p-3`), `rounded`, `border`, `bg-card`, sombra sutil (sem `shadow-card`).
- Razão social: `text-[12px] leading-tight line-clamp-2` (sem font-medium pesado, manter `font-medium`).
- Remover badge "cedente" (ruído visual desnecessário no kanban).
- Nome fantasia: `text-[10px] text-muted-foreground truncate mt-0.5`.
- CNPJ: `text-[10px] text-muted-foreground tabular-nums mt-0.5` — formatado `00.000.000/0000-00`.
- Linha rodapé (setor + faturamento): `mt-1.5`, setor `text-[10px]`, valor `text-[11px] font-medium text-primary tabular-nums`.

## 4. Drag overlay
- Mesmo card compacto, largura `w-64`, sombra elegante mantida.

## 5. Container externo
- `space-y-3` mantido.
- `gap-3` entre colunas (era `gap-4`), `pb-3`.

## Resultado esperado
Mais colunas visíveis na mesma largura, cards 30–40% mais densos, tipografia consistente com Cedentes/Diretório, sem alterar comportamento de DnD ou queries.
