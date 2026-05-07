## Problema

O `VisitReportVersionsPanel` (e o `CreditReportVersionsPanel`) é renderizado fora do `<Accordion>` das seções, dentro de um wrapper com `space-y-2.5` (10 px). Já entre os AccordionItems o espaço é `space-y-0.5` (2 px). Por isso o card "Histórico de versões" fica visualmente afastado do "5. Parecer comercial".

## Solução

Aproximar o painel de versões dos cards anteriores aplicando margem-superior pequena (`mt-0.5` = 2 px) no wrapper, sobrescrevendo o `space-y-2.5` do pai com `!mt-0.5`.

### Arquivos

1. `src/components/cedentes/CedenteVisitReportForm.tsx` — envolver `<VisitReportVersionsPanel ... />` em `<div className="!mt-0.5">…</div>`.
2. `src/components/credito/CreditReportForm.tsx` — mesmo tratamento ao redor de `<CreditReportVersionsPanel ... />`.

Sem mudar nada do componente interno, mantendo o padrão de espaçamento ultracompacto entre os cards.