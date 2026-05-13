## Adicionar "Manter Relacionamento" e "Perdido" como colunas do Kanban

Hoje esses dois estágios existem como tipo válido e label, mas não estão em `STAGE_ORDER`, então não aparecem no board nem nos seletores de UI. Vou adicioná-los como duas colunas extras à direita, depois de "Investidor Ativo".

### Mudanças

**1. `src/lib/investor-contacts.ts`**
- Adicionar `manter_relacionamento` e `perdido` ao final de `STAGE_ORDER` (vira array de 7).
- Ajustar `isAdvance` / `nextStage` / `prevStage` para tratar esses dois como **terminais paralelos**, não como progressão linear:
  - De qualquer estágio é possível ir para `manter_relacionamento` ou `perdido` (não conta como "avanço").
  - `nextStage`/`prevStage` desses dois retornam `null` (não há próximo/anterior natural).
  - A progressão linear `lead → primeiro_contato → … → investidor_ativo` continua igual.

**2. `src/pages/investidores/InvestidoresCRM.tsx` (kanban)**
- O `STAGE_ORDER.map` já vai renderizar as duas colunas novas automaticamente.
- Estilizar visualmente as colunas terminais com tom mais discreto (header em `text-muted-foreground`, possivelmente borda tracejada) para diferenciar do funil ativo.

**3. Drawer/Form/ConfirmStageMove**
- O stepper do `InvestorContactDrawer` mostra a sequência linear; vou mantê-lo só com os 5 estágios do funil e exibir `manter_relacionamento`/`perdido` como **badges/ações separadas** ("Mover para Manter Relacionamento", "Marcar como Perdido"), evitando poluir o stepper.
- O select de estágio no `InvestorContactFormDialog` lista todos os 7 (já usa `STAGE_ORDER`).
- `ConfirmStageMoveDialog` continua funcionando — só mostra "avanço/retrocesso" quando aplicável.

### Não muda
- Schema do banco (constraint já aceita os 7 valores desde a migration anterior).
- Lógica de import (já mapeia os 7 estágios).