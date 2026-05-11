# Padronizar status das categorias

Hoje em `DocumentosUploadKanban.tsx` (linha 930-937), categorias sem anexos mostram `"0 anexos"` (formato diferente), enquanto categorias com anexos usam `"X · Y verif."` — o que cria duas linguagens visuais distintas e faz os "não obrigatórios" parecerem outra coisa.

## Mudança
Unificar para o mesmo padrão `"X · Y verif."` em todos os casos:

- `total === 0` → `<span className="text-muted-foreground/60 tabular-nums">0 · 0 verif.</span>`
- `completo` → mantém `<span className="text-green-600 font-medium tabular-nums">{total} · {aprovados} verif. ✓</span>`
- demais → mantém `<span className="text-muted-foreground tabular-nums">{total} · {aprovados} verif.</span>`

Resultado: tanto obrigatórios quanto não obrigatórios usam a mesma estrutura `N · N verif.`, variando apenas a cor (mais apagada quando vazio).

## Fora de escopo
- Não mexer no bullet (●) à esquerda nem no marcador `*` de obrigatório.
- Não mudar nada na coluna de ações.
