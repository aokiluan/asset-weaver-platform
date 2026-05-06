## Objetivo
Reduzir o espaçamento vertical entre campos e entre label↔input em todo o projeto, **sem mudar** tamanho de fonte, altura de inputs, nem altura de textareas/campos de descrição.

## Diagnóstico
O excesso de espaço vem de classes utilitárias usadas em todos os formulários:
- `space-y-2` no wrapper de cada campo → gera ~8px entre o label e o input
- `gap-4` nas grids de campos → ~16px entre colunas/linhas
- `space-y-4` dentro de `AccordionContent` → ~16px entre blocos
- `space-y-6` em seções maiores (CreditReportForm) → ~24px
- `FormItem` (shadcn) usa `space-y-2` internamente

## Mudanças (sem mexer em fontes/alturas)

### 1. Primitivo `FormItem` — `src/components/ui/form.tsx`
- `space-y-2` → `space-y-1` (gap label↔input fica ~4px)

### 2. Primitivo `Label` — `src/components/ui/label.tsx`
- Adicionar `mb-0.5` ao `labelVariants` para garantir respiro mínimo (mantém font size atual)

### 3. Formulários principais — substituições padronizadas
Arquivos:
- `src/components/cedentes/CedenteVisitReportForm.tsx`
- `src/components/credito/CreditReportForm.tsx`
- `src/components/cedentes/CedenteFormDialog.tsx`
- `src/components/cedentes/CedenteNovoSheet.tsx`
- `src/components/cedentes/SocioFormCard.tsx`
- `src/components/cedentes/CedenteRepresentantesTab.tsx`
- `src/components/leads/LeadFormDialog.tsx`

Substituições (apenas em wrappers de campo / grids de form, sem tocar em layouts gerais de página):
- `space-y-2` (em wrapper de campo `<div>` com Label+Input) → `space-y-1`
- `gap-4` (em grids de campos) → `gap-2.5`
- `gap-2` em grids já compactos → manter
- `AccordionContent className="space-y-4 pt-2"` → `space-y-2.5 pt-1.5`
- `Accordion className="space-y-2"` → `space-y-1.5`
- `space-y-6` em seções de form → `space-y-3.5`

### 4. Não alterar
- `input.tsx`, `textarea.tsx`, `select.tsx` (alturas e fontes ficam como estão)
- Tamanho do `Label` (apenas margem inferior leve)
- Botões, cards, dialogs, sidebar, páginas fora de formulários

## Resultado esperado
Mesma tipografia atual, mas com formulários visivelmente mais densos: label cola mais no campo e os campos ficam mais próximos verticalmente — exatamente o problema mostrado no print do "Regional → Tipo de análise".