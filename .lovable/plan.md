## Objetivo
Deixar os cards de accordion ultracompactos em todo o projeto, reduzindo altura do header e padding interno, mantendo título + subtítulo legíveis.

## Mudanças

### 1. `src/components/ui/accordion.tsx` (afeta projeto inteiro)
- `AccordionTrigger`: `py-4` → `py-2`
- `AccordionContent` div interna: `pb-4 pt-0` → `pb-3 pt-0`

### 2. Cards do `CreditReportForm.tsx` e `CedenteVisitReportForm.tsx`
- `AccordionItem className="border rounded-lg bg-card px-4"` → `px-3`
- Trigger content: `gap-3` → `gap-2`
- Subtítulo descritivo passa para a mesma linha do título (em vez de segunda linha):
  - `<div>{title}</div><div className="text-xs text-muted-foreground">{subtitle}</div>` → `<div className="flex items-baseline gap-2 min-w-0"><span className="text-sm font-medium">{title}</span><span className="text-xs text-muted-foreground truncate">{subtitle}</span></div>`

## Resultado
Header de cada card cai de ~64px para ~32-36px (~50% menor) em todos os accordions.