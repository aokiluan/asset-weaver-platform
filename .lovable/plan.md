## Mudança

No formulário do relatório de crédito (`src/components/credito/CreditReportForm.tsx`), transformar a seção "Parecer" no mesmo padrão de acordeão (lista suspensa) usado pelas 8 seções acima, e renomeá-la para "Parecer do crédito".

## Detalhes técnicos

Em `CreditReportForm.tsx`, substituir o bloco atual `<div className="rounded-lg border bg-card p-4 space-y-4">` (linhas 264–322) por um novo `<Accordion type="single" collapsible>` com um único `AccordionItem`:

- Título do trigger: **"Parecer do crédito"** (com hint curto, ex.: "Parecer do analista, pontos positivos/atenção, conclusão e recomendação final").
- Ícone de status: `CheckCircle2` verde quando `recomendacao` estiver preenchida e ao menos um dos campos (`parecer_analista`, `conclusao`) tiver conteúdo; caso contrário `Circle` cinza — mesmo padrão visual das outras seções.
- Conteúdo (`AccordionContent`): mover, sem alterações de comportamento, os campos atuais — `parecer_analista`, `pontos_positivos`, `pontos_atencao`, `conclusao` e o select `Recomendação final`.
- Manter o estilo do item: `border rounded-lg bg-card px-4`, igual aos demais.
- Por padrão fechado (não incluir em `defaultValue`), igual às demais seções não-iniciais.

Nenhuma mudança em schema, salvamento ou outros componentes.