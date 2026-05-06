## Objetivo
Reduzir tamanho de fonte da linha de cabeçalho do representante (accordion trigger) para ficar proporcional ao design ultracompacto.

## Mudança
`src/components/cedentes/CedenteRepresentantesTab.tsx` (linhas 282-302):
- `py-3` → `py-2`
- Nome: `font-medium` → `text-[13px] font-medium`
- CPF/qualificação/% capital: `text-xs` → `text-[11px]`
- Badges Receita/Manual e "não salvo": adicionar `text-[10px] px-1.5 py-0 h-[18px]`