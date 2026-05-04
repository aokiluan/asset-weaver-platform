## Alinhar botão de ordenação com a coluna das bolinhas de status

Hoje o botão `ArrowUpDown` está dentro da célula "Categoria", deslocado à direita das bolinhas. Mover o botão para a primeira coluna (a coluna de 24px que contém as bolinhas verde/vermelha por linha), centralizado.

### Mudança em `src/components/cedentes/DocumentosUploadKanban.tsx`

No `<thead>` da tabela compacta:
- Mover o `<button>` com o ícone `ArrowUpDown` (e seu Tooltip) do `<th>` da Categoria para o primeiro `<th className="w-6 ...">`, com `text-center`.
- O `<th>` de Categoria volta a ter apenas o texto "Categoria" sem o wrapper `<span>` flex.