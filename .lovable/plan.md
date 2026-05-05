## Densidade ultracompacta nas tabelas

Editar somente `src/components/ui/table.tsx`:

- **TableHead**: `h-8 px-3` → `h-7 px-2.5`. Fonte mantida em `text-[11px]`.
- **TableCell**: `px-3 py-1.5 text-[13px]` → `px-2.5 py-1 text-[12px]`.

Resultado esperado: linhas ~26–28px (antes ~32–36px), cabeçalho 28px. Mantém legibilidade e o padrão "clean" da referência, mas com densidade máxima.

Nada mais muda — sem alteração em páginas, badges ou switches. Se algum Switch/Select ficar visualmente apertado depois, ajustamos pontualmente.