## Ícones mais finos e minimalistas

Referência: print da sidebar colapsada — traços visivelmente mais finos que o padrão atual do Lucide (stroke 2).

### Abordagem

Lucide aceita a prop `strokeWidth`. O padrão é `2`; vou reduzir para `1.5` (e `1.25` em alguns casos pontuais) para um look mais delicado, sem trocar nenhum ícone.

### Mudança principal — sidebar

**`src/components/AppSidebar.tsx`**
- No `SidebarItem`, adicionar `strokeWidth={1.5}` no `<Icon />` que renderiza cada item de menu.
- No header (botões `Pin` / `PinOff`) e no `ChevronDown` dos grupos: também `strokeWidth={1.5}` para manter coerência visual.

Resultado: a coluna de ícones do menu lateral (que é o foco do print) fica com traço fino e clean.

### Padronização global (opcional, recomendado)

Para que botões de ação nas tabelas (Pencil, Trash2, Plus, etc.) sigam o mesmo peso visual, aplicar `strokeWidth={1.5}` por padrão nos componentes de UI mais usados:

- **`src/components/ui/button.tsx`** — sem mudança estrutural; ícones internos continuam controlados pelo consumidor.
- Atualizar os ícones inline nas páginas onde já reduzimos tamanho (h-3.5 w-3.5) para também receberem `strokeWidth={1.5}`:
  - `src/pages/admin/AdminCategorias.tsx`
  - `src/pages/admin/AdminAlcadas.tsx`
  - `src/pages/admin/AdminPipeline.tsx`
  - `src/pages/admin/AdminEquipes.tsx`
  - `src/pages/admin/AdminDashboardWidgets.tsx`
  - `src/pages/admin/AdminUsuarios.tsx`
  - `src/pages/Leads.tsx`
  - `src/pages/Financeiro.tsx`

### Detalhes técnicos

- `strokeWidth={1.5}` em ícones pequenos (h-3.5/h-4) entrega o look "Linear/Notion-like" do print.
- Não altera tamanho, cor, nem layout — só o peso do traço SVG.
- Nenhuma mudança no Tailwind config nem no CSS global.

### Resultado esperado

- Sidebar colapsada com ícones nitidamente mais finos, igual ao print.
- Botões de ação (editar/excluir) nas tabelas com o mesmo peso visual fino, reforçando o padrão ultracompacto já aplicado.
