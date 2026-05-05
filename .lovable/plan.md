## Tabelas: densidade extrema

Editar `src/components/ui/table.tsx`:

- **TableHead**: `h-7 px-2.5 text-[11px]` → `h-6 px-2 text-[10px]`.
- **TableCell**: `px-2.5 py-1 text-[12px]` → `px-2 py-0.5 text-[12px]` (mantém 12px para legibilidade; padding vertical 2px de cada lado).

Resultado: linhas ~22–24px, cabeçalho 24px. Próximo do limite de legibilidade.

Switches dentro das células podem ficar maiores que a linha — se acontecer, ajustamos depois nas páginas afetadas.