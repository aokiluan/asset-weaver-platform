## Diagnóstico

A tela do resumo (e várias outras) ainda parece "respirando" porque:

1. **Padding interno do card** — `p-3` (12px) ainda dá uma borda perceptível
2. **Espaçamento entre seções** — `space-y-3` + `pt-3` somam 24px entre cada bloco (Identificação → Contato → Endereço…)
3. **Gap vertical do grid** — `gap-y-2` (8px) entre linhas de campos
4. **Line-height** — texto sem `leading-tight`/`leading-none` ocupa altura padrão (~1.5x)
5. **Espaço label → valor** — labels `text-[11px]` sem ajuste de altura
6. **Tamanho dos valores** — `text-[13px]` é maior que a base do padrão (`12px`)

## Proposta — apertar mais 1 nível

### Tela do resumo do cedente (`CedenteDetail.tsx` aba "Resumo")

| Elemento | Hoje | Proposto |
|---|---|---|
| Padding do card externo | `p-3` (12px) | `p-2.5` (10px) |
| Entre seções | `space-y-3` + `pt-3` | `space-y-2` + `pt-2` |
| Title de seção | `text-[11px]` | `text-[10px]` |
| Label de campo | `text-[11px] leading-tight` | `text-[10px] leading-none mb-0.5` |
| Valor de campo | `text-[13px]` | `text-[12px] leading-tight` |
| Gap vertical do grid | `gap-y-2` | `gap-y-1` |
| `mt-4` antes do card | `mt-4` (16px) | `mt-3` (12px) |

Resultado: ~30% menos altura sem perder legibilidade.

### Atualizar memória `mem://design/nibo-compact` — nova convenção "denso"

Adicionar tier mais agressivo para telas de visualização de dados (resumos, listas chave-valor):
- Padding de card de visualização: `p-2.5`
- Entre seções dentro de card: `space-y-2 pt-2 border-t`
- Label inline: `text-[10px] leading-none text-muted-foreground mb-0.5`
- Valor: `text-[12px] leading-tight`
- Title de seção: `text-[10px] uppercase tracking-[0.08em] font-semibold`
- Grid gap: `gap-x-3 gap-y-1`
- `leading-tight` ou `leading-snug` SEMPRE em parágrafos densos

### Aplicar a outras telas com padrão similar (1 lote)

Mesmo tratamento em:
- `CedenteNovoSheet.tsx` — bloco "Identificação" com mesmo padrão
- Empty states com `p-6` → `p-4`
- Headers de seção com `text-xs uppercase` → `text-[10px] uppercase`

## Garantias

- Zero mudança funcional, só CSS
- Aprova lote 1 (resumo) primeiro; se gostar, aplico em outras telas
- Memória atualizada para que telas futuras sigam o tier denso

## Arquivos editados

- `src/pages/CedenteDetail.tsx` — aba resumo
- `src/components/cedentes/CedenteNovoSheet.tsx` — bloco identificação
- `mem://design/nibo-compact` — adicionar tier "visualização densa"
- `mem://index.md` — referência atualizada