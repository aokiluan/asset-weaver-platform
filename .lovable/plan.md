## Objetivo

Remover a trava atual da aba **Comitê** dentro do `CedenteDetail`. Hoje, se o cedente não está na etapa `comite`, mostramos uma mensagem "Comitê ainda não habilitado". Você quer que o comitê esteja **sempre disponível**, independente da etapa do cedente.

## O que muda

### `src/pages/CedenteDetail.tsx` — função `ComiteTabContent`

Comportamento atual:
- Se há proposta → renderiza `ComiteGameSession`.
- Se `stage = comite` e sem proposta → chama RPC `ensure_proposal_for_cedente` e mostra loader.
- Caso contrário → mensagem de "ainda não habilitado".

Comportamento novo:
- Se há proposta → renderiza `ComiteGameSession` (igual hoje).
- Se **não há proposta** (qualquer que seja a etapa do cedente) → chama `ensure_proposal_for_cedente` automaticamente e mostra loader "Preparando sessão do comitê…".
- A mensagem de "ainda não habilitado" e a checagem `cedenteStage === "comite"` são removidas.

A função RPC `ensure_proposal_for_cedente` já cria a proposta com `stage = 'comite'` independente da etapa do cedente, então funciona para qualquer caso. Permissão continua controlada por `can_view_proposal` no banco.

### Trigger no banco — sem mudança

O trigger `cedente_ensure_proposal_on_comite` continua existindo (cria proposta automaticamente quando cedente entra em `comite`). Não atrapalha — é só um fallback proativo. Mantemos.

## Resultado

A aba **Comitê** abre direto com a sessão de votação para qualquer cedente. Se ainda não houver proposta vinculada, ela é criada automaticamente no primeiro acesso.

## Arquivos alterados

- `src/pages/CedenteDetail.tsx` (somente o componente `ComiteTabContent`).
