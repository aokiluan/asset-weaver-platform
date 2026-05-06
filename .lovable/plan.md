## Ajuste de tamanho dos campos — Relatório de crédito

### Problema
Na seção "Identificação" (e demais seções), o campo `Select` (ex: "Tipo de análise") usa o trigger compacto do design system (`h-7`, `text-[12px]`), enquanto os campos `Input` (ex: "Regional", "Executivo comercial") herdam o padrão global (`h-10`, `text-base`). Resultado: inputs aparecem visivelmente maiores que selects na mesma linha — inconsistência visual.

### Solução
Padronizar a altura/tipografia do `Input` e do `Textarea` dentro do `FieldRenderer` (e do `TextareaField`) do `CreditReportForm` para o mesmo padrão compacto do `SelectTrigger` — sem mexer no componente global do design system (que é usado em outras telas).

### Mudanças

**`src/components/credito/CreditReportForm.tsx`** — único arquivo afetado:

1. No `FieldRenderer`, aplicar classes compactas:
   - `<Input className="h-7 text-[12px] px-2.5" />`
   - `<Textarea className="text-[12px] min-h-[60px]" />` (mantendo `rows={3}`)
2. No `TextareaField`, aplicar `className="text-[12px] min-h-[60px]"` no `<Textarea>`.
3. Os `<Label className="text-xs">` já estão compactos — sem mudança.
4. Os `SelectTrigger` já estão compactos via componente base — sem mudança.

### Não afeta
- Componentes globais (`src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`)
- Outros formulários do projeto
- Lógica de versionamento / save / PDF
- Layout do grid (`md:grid-cols-2`)
