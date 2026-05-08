## Objetivo

Remover a exibição "Rascunho salvo / Rascunho restaurado · HH:MM · Descartar" de todos os formulários, mantendo o autosave funcionando por baixo (não perdemos dados em caso de refresh).

## O que muda

1. **`src/components/ui/draft-indicator.tsx`**
   - Tornar o componente um no-op: sempre `return null`.
   - Mantém a assinatura de props para não quebrar imports existentes.

   Alternativa considerada: remover o componente e todos os usos. Descartado por ser muito mais invasivo (vários formulários importam) e sem ganho funcional.

2. **Hook `useFormDraft` permanece intacto**
   - Continua salvando rascunho em localStorage e restaurando ao reabrir.
   - Apenas a UI de feedback é suprimida.

## O que NÃO muda

- Comportamento de autosave / restore (silencioso).
- Botões "Cancelar" e ação primária do footer dos forms.
- Padrão Nibo ultracompacto.

## Arquivos editados

- `src/components/ui/draft-indicator.tsx` — retorna `null`.

## Resultado esperado

Nenhum form exibe mais a faixa "Rascunho restaurado · 09:34 Descartar". O rascunho continua sendo salvo automaticamente em background.
