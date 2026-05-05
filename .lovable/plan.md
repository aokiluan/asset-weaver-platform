## Aplicar design "clean" na página piloto AdminUsuarios

Validar o padrão visual em uma única tela antes de propagar. Mudanças isoladas em `src/pages/admin/AdminUsuarios.tsx` — sem tocar em `ui/table.tsx` (já está compacto) nem em outras páginas.

### Header da página
- Título: `text-[20px] font-medium tracking-tight` (era `text-2xl font-semibold`).
- Remover o subtítulo "Gerencie usuários, papéis, equipes e status de acesso." — manter só o título, como na referência Conta Azul.
- Substituir o `<div className="flex justify-between">` por linha com contador à direita: `<span className="text-[12px] text-muted-foreground">{users.length} usuários</span>` antes do botão "Atribuir função".
- Botão "Atribuir função": `size="sm"` para alinhar com a densidade.

### Container da tabela
- Trocar `rounded-lg border bg-card overflow-hidden` por `rounded-md border bg-card` (cantos menores, mais sutil).
- Envolver em wrapper com `mt-4` separando do header.

### Linhas
- Adicionar `className="group"` em cada `<TableRow>` para suportar ações no hover (preparar terreno; nenhuma ação muda agora pois Switches são sempre visíveis).

### Ajustes finos nas células
- Nome: manter `font-medium` mas em `text-[13px]` (herdado do TableCell). Cargo abaixo: `text-[11px] text-muted-foreground`.
- E-mail: remover `text-sm` (deixar herdar 13px).
- Select de equipe: já está `h-8` — manter. Reduzir largura para `w-[160px]`.
- Badges de função: `variant="secondary"` + `className="gap-1 h-5 px-2 text-[11px] font-normal"` para ficarem mais discretas.
- Switch: sem alteração (tamanho default já condiz).

### Estados vazio/carregando
- `py-8` → `py-6` e fonte `text-[12px]` para reduzir peso visual.

### O que NÃO muda
- `src/components/ui/table.tsx` (já ajustado).
- Lógica, queries, RLS, handlers.
- Outras páginas admin — só propagamos depois da validação.

Após aprovar, se você gostar do resultado em Usuários, replico o mesmo padrão (header sem subtítulo, contador, container `rounded-md`, badges discretas) em AdminPipeline, AdminAlcadas, AdminEquipes, AdminCategorias, AdminDatasets, AdminRelatorios e AdminDashboardWidgets.