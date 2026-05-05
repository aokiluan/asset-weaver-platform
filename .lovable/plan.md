## Aglutinar ações e switches no canto direito

Inspirado no print: ícones de ação só aparecem no hover da linha, encostados na borda direita. Switches/colunas de status também ficam encostados na direita.

### Padrão a aplicar

Para cada coluna de "Ações" / "Ativo" / "Gestor geral":

- `<TableHead>` da coluna: `w-[100px] text-right` → `w-px text-right pr-3` (largura mínima, padding direito reduzido).
- Botões de ícone na linha: `size="icon"` (h-7 w-7) → `className="h-6 w-6"` + ícones `h-4 w-4` → `h-3.5 w-3.5`.
- Wrapper de ações: `gap-1` → `gap-0.5` + `opacity-0 group-hover:opacity-100 transition-opacity` (revelados no hover).
- `<TableRow>` ganha `className="group"` para o hover funcionar.
- Trash usa `text-destructive` para clareza visual.

### Arquivos editados

1. **`src/pages/admin/AdminCategorias.tsx`** — coluna Ações: hover-reveal, h-6 w-6, pr-3.
2. **`src/pages/admin/AdminAlcadas.tsx`** — idem.
3. **`src/pages/admin/AdminPipeline.tsx`** — idem.
4. **`src/pages/admin/AdminEquipes.tsx`** — idem.
5. **`src/pages/admin/AdminDashboardWidgets.tsx`** — idem (coluna sem `text-right` antes, agora alinhada).
6. **`src/pages/Leads.tsx`** — idem (`w-24` → `w-px`).
7. **`src/pages/admin/AdminUsuarios.tsx`** — colunas "Gestor geral" (`w-[140px]`) e "Ativo" (`w-[100px]`) viram `w-px text-right pr-3`; `<TableHead>` ganha `text-right`; switches recebem `className="ml-auto"` (ou wrapper `flex justify-end`) para encostar à direita. A coluna Equipe permanece como está.

### Resultado

- Ações somem por padrão e aparecem só ao passar o mouse → linha mais limpa, como no print.
- Switches e ícones encostados na borda direita do card.
- Largura das colunas de ação encolhe ao mínimo, devolvendo espaço para as colunas de conteúdo.
