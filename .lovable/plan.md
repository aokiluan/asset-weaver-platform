## Converter dialog de importação de cedentes para painel deslizante à direita

Mesma mudança que foi feita no dialog de importação de leads/investidores: trocar o componente `Dialog` pelo `Sheet` (shadcn) com `side="right"`.

### Mudança

**`src/components/cedentes/CedenteImportDialog.tsx`**
- Trocar imports de `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter` por `Sheet/SheetContent/SheetHeader/SheetTitle/SheetDescription/SheetFooter`.
- `<SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">`.
- Manter todo o conteúdo interno (stepper Upload → Validação, dropzone, tabela de preview, botão "Baixar modelo", footer com Cancelar / Voltar / Importar) sem alterações.

Não mexe em lógica, parsing, validação ou inserção no banco.