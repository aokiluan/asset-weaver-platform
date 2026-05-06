## Objetivo
Reduzir a largura máxima dos cards de seção (accordions) em todo o projeto para ficarem ultracompactos, mantendo legibilidade dos grids de 3 colunas.

## Largura mínima recomendada
`max-w-3xl` (768px). Abaixo disso, grids de 3 colunas começam a quebrar e os labels podem truncar. Esse é o limite prático "ultracompacto" sem prejudicar formulários.

## Mudanças
Adicionar `max-w-3xl` ao container do `<Accordion>` em:

- `src/components/credito/CreditReportForm.tsx` (linhas 349 e 399)
- `src/components/cedentes/CedenteVisitReportForm.tsx` (linha 473)
- `src/components/cedentes/CedenteRepresentantesTab.tsx` (linha 275)

Não alterar `CreditReportVersionsPanel.tsx` e `VisitReportVersionsPanel.tsx` — são painéis laterais de versões, não cards de formulário.

## Resultado
Cards param de esticar até a borda da tela, ficando ~768px de largura máxima — visualmente muito mais compactos.