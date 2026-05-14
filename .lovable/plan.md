## Objetivo

Adicionar filtros e ordenação na tela **Pasta de Cedentes** (`src/pages/Diretorio.tsx`), seguindo o padrão Nibo ultracompacto (chips h-7 e cabeçalhos clicáveis).

## Mudanças (apenas `src/pages/Diretorio.tsx`)

### 1. Filtros (chips ghost/secondary h-7, abaixo da busca)

- **Stage** (chips na 1ª linha): `Todos · Novo · Cadastro · Análise · Comitê · Formalização · Ativo · Inativo` — usa `STAGE_LABEL` de `cedente-stages.ts`. Chips dinâmicos: só aparece quem tem ≥1 cedente.
- **Renovação** (chips na 2ª linha): `Todas · Em dia · Atenção · Vencida · Sem registro` — mapeia para `RenovacaoStatus`.
- Botão **Limpar filtros** (ghost h-7) à direita quando algum filtro ≠ default.
- Contador "X cedente(s)" continua refletindo o resultado já filtrado.

### 2. Ordenação (clicar no `<th>`)

Colunas ordenáveis: **Cedente** (razão social, alfabético), **Stage** (ordem do funil), **Renovação** (urgência via `renovacaoSortKey`), **Docs** (numérico), **Última ata** (data).

- Ícone `ArrowUp`/`ArrowDown` (h-3 w-3) ao lado do label do header ativo; `ArrowUpDown` esmaecido nos outros.
- Estado: `{ key, dir: 'asc' | 'desc' }`. Default: `renovacao asc` (mantém comportamento atual de "mais urgente primeiro").
- Click alterna asc↔desc; click em coluna nova reseta para asc (exceto Última ata e Docs que abrem em desc).
- Tiebreaker sempre por razão social asc.

### 3. Detalhes técnicos

- `useMemo` único combina filtro + ordenação.
- `computeRenovacao` chamada uma vez por linha durante sort/filter — manter cache simples (Map por id) para não recalcular.
- Sem mudanças em backend, queries, RLS ou outras rotas.
- Sem mudanças visuais fora da seção de filtros + cabeçalho da tabela.