## Adicionar ordenação por obrigatoriedade

Adicionar um botão discreto (ícone `ArrowUpDown` da lucide) ao lado do título da coluna **CATEGORIA** no header da tabela compacta. Ele alterna entre 3 estados:

1. **nenhum** (padrão) — ordem original do banco (`ordem` da categoria)
2. **obrigatórios primeiro**
3. **opcionais primeiro**

### Mudanças em `src/components/cedentes/DocumentosUploadKanban.tsx`

1. Importar `ArrowUpDown` de `lucide-react`.
2. Novo estado: `const [sortObrig, setSortObrig] = useState<"none" | "obrig" | "opc">("none")`.
3. No `useMemo` `grupos`, após montar `out`, aplicar sort estável quando `sortObrig !== "none"`:
   - `"obrig"`: obrigatórios no topo
   - `"opc"`: opcionais no topo
4. No `<th>` da coluna Categoria, adicionar um `<button>` minúsculo (ícone 12px, `text-muted-foreground hover:text-foreground`, sem borda) que cicla os 3 estados ao clicar. Quando ativo, ícone fica em `text-foreground` para indicar que há ordenação.
5. Tooltip curto: "Ordenar por obrigatoriedade".

Sem mudanças em outros arquivos, sem schema, sem novas dependências.