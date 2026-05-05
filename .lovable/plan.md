## Compactar tabelas — densidade tipo "Fechamento de mês"

Editar somente `src/components/ui/table.tsx`:

**TableHeader**
- `bg-muted/40` → `bg-muted/30`

**TableRow**
- Classes: `border-b border-border/60 transition-colors data-[state=selected]:bg-muted hover:bg-muted/40`

**TableHead**
- `h-11 px-4 ... font-semibold uppercase tracking-wider` → `h-8 px-3 text-[11px] font-medium normal-case tracking-normal text-muted-foreground`

**TableCell**
- `p-4` → `px-3 py-1.5 text-[13px] whitespace-nowrap`

Resultado: linhas ~32–36px, cabeçalho leve, alinhado à imagem 2.

**Pós-mudança**: se ícones de ação (`Button size="icon"` h-10 w-10) ficarem maiores que a linha, padronizar para `h-7 w-7` apenas nas páginas afetadas: AdminPipeline, AdminAlcadas, AdminUsuarios, AdminEquipes, AdminCategorias, AdminDatasets, AdminRelatorios, AdminDashboardWidgets.

Nenhuma outra mudança em páginas.
