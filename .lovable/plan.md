## Bug: accordions não abrem no Relatório de visita (modo view)

### Causa
Em `src/components/cedentes/CedenteVisitReportForm.tsx` linha 472, o `<fieldset disabled={readOnly}>` envolve o `<Accordion>`. Em HTML, `fieldset[disabled]` desabilita TODOS os botões dentro — incluindo os `AccordionTrigger`, que são `<button>`. Por isso clicar na setinha não abre.

O mesmo bug existe no `CreditReportForm.tsx` (linha 347) — vou corrigir os dois.

### Correção
Trocar `<fieldset disabled={...}>` por `<div>` em ambos os arquivos. Os campos individuais (`Input`, `Textarea`, `Select`) já recebem `disabled={isReadOnly}` via prop nas suas chamadas, então a desabilitação dos campos continua funcionando — só os triggers do accordion voltam a responder.

### Arquivos
- `src/components/cedentes/CedenteVisitReportForm.tsx` (linhas 472 e 709)
- `src/components/credito/CreditReportForm.tsx` (linhas 347 e 477)
