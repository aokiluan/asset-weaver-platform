## Remover agrupamentos no Diretório (lista flat)

A pasta do cedente passa a mostrar **uma única lista plana** de arquivos, sem cabeçalhos colapsáveis de grupo (sem "Documento (9)", "Ata (1)", "Parecer (4)" etc.). A coluna **Tipo** continua existindo na tabela — quem quiser separar usa o filtro/ordenação por Tipo.

### O que muda em `src/pages/DiretorioDetail.tsx`

- Remover o controle **"Agrupar por"** da toolbar (Tipo / Categoria / Sem grupos).
- Remover a renderização dos headers de grupo (`<div>` com chevron + ícone de pasta + label + contagem) tanto na visão Lista quanto na visão Grid.
- Renderizar `arquivos[]` direto em uma única `<tbody>` (lista) ou um único grid de cards.
- Ordenação default continua sendo Data ↓; usuário pode trocar para "Tipo (A→Z)" se quiser ver agrupado visualmente sem precisar do collapse.
- Estado relacionado (`groupBy`, `collapsedGroups`, helpers de agrupamento) é removido.

### O que NÃO muda

- Chips de totais por tipo no header (continuam como filtro rápido).
- Coluna **Tipo** com badge colorido.
- Filtros, busca, seleção múltipla, preview no Sheet, botão "Adicionar anexo livre".
- Schema, fetches e normalização para `arquivos[]`.

### Arquivo editado

- `src/pages/DiretorioDetail.tsx`
