## Objetivo

Padronizar o formulário de criação/edição de contato (`InvestorContactFormDialog`) para abrir como **painel lateral deslizando da direita**, no mesmo padrão do `InvestorContactDrawer` já existente.

## Mudanças

### 1. `src/pages/investidores/InvestorContactFormDialog.tsx`
- Trocar `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` (de `@/components/ui/dialog`) por `Sheet`/`SheetContent`/`SheetHeader`/`SheetFooter` (de `@/components/ui/sheet`).
- `SheetContent` com `side="right"` e largura compatível com o drawer atual (`w-full sm:max-w-lg`).
- Manter toda a lógica do formulário (estado, validação, submit, react-hook-form/handlers existentes) — apenas substituir o invólucro visual.
- Footer: manter padrão Nibo — Cancelar (ghost) + Salvar (primário) à direita.
- Manter a mesma API de props (`open`, `onOpenChange`, `contact`, etc.) para não quebrar o consumidor.

### 2. Renomear (opcional, recomendado)
- Renomear arquivo para `InvestorContactFormSheet.tsx` e atualizar import em `InvestidoresCRM.tsx`. 
- Se preferir evitar churn, manter o nome `InvestorContactFormDialog.tsx` e só trocar o conteúdo interno.

## Fora de escopo
- Demais dialogs (`QuickViewDialog`, `RegistrarContatoDialog`, `ConfirmStageMoveDialog`) permanecem como Dialog.
- Sem mudanças no schema, RLS ou lógica de negócio.

## Pergunta
Prefere **renomear** o arquivo para `...FormSheet.tsx` ou **manter o nome atual** apenas trocando o conteúdo?
