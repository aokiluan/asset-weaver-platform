# Cards KPI da página `/cedentes` — verificação + novo card

## Verificação dos cards atuais (`src/pages/Cedentes.tsx`)

Os três cards já leem corretamente do estado `items`:

- **Total cadastrado** → `items.length` ✅
- **Aprovados** → `items.filter(i => i.status === "aprovado").length` ✅ (campo `status` da tabela `cedentes`)
- **Limite total aprovado** → soma de `limite_aprovado` dos cedentes com `status === "aprovado"` ✅

Nenhuma mudança de cálculo necessária — apenas é preciso passar a buscar dois campos extras do banco (`cadastro_revisado_em`, `minuta_assinada_em`) para alimentar o novo card.

## Novo card: Renovações pendentes

Conta cedentes cuja renovação cadastral semestral está **vencida** ou **em atenção** (≤30 dias para vencer), usando `computeRenovacao(cadastro_revisado_em, minuta_assinada_em)` de `src/lib/cadastro-renovacao.ts`.

- Label: **Renovações pendentes**
- Valor principal: total (vencidas + atenção)
- Sublinha: detalhamento `X vencidas · Y a vencer` em `text-[10px] text-muted-foreground`
- Cor sutil no número quando > 0: `text-destructive` se houver vencidas, senão padrão

## Mudanças no arquivo `src/pages/Cedentes.tsx`

1. Acrescentar `cadastro_revisado_em, minuta_assinada_em` ao `select` em `load()`.
2. Adicionar campos opcionais correspondentes na interface `Cedente`.
3. Calcular, ao lado de `totalAprovado`:
   ```ts
   const renov = items.map(i => computeRenovacao(i.cadastro_revisado_em, i.minuta_assinada_em));
   const vencidas = renov.filter(r => r.status === "vencida").length;
   const atencao  = renov.filter(r => r.status === "atencao").length;
   const pendentes = vencidas + atencao;
   ```
4. Trocar grid de KPIs para `md:grid-cols-2 lg:grid-cols-4` e inserir o quarto card.
5. Manter padrão visual Nibo já em uso (border, p-3, label 11px, valor 18px).

## Fora de escopo

- Padronização do header com `<PageTabs>` (página atualmente usa header próprio) — manter como está para não expandir o pedido.
