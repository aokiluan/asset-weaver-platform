## Remover botão "Abrir na esteira"

Em `src/pages/CedenteDetail.tsx`, dentro do bloco `tab === "credito"`, remover o cartão "Proposta de crédito vinculada" (linhas ~417–430) que contém o botão **Abrir na esteira**.

O `CreditReportForm` logo abaixo continua sendo renderizado normalmente, recebendo o `latestProposal?.id` como já faz hoje.

### Verificação
- Conferir se `latestProposal` ainda é usado em outras abas (ex.: `comite`) — sim, é passado para `ComiteTabContent`. Portanto a variável **não** será removida, apenas o JSX do cartão.
- Nenhum import precisa sair (o `Link` e `Button` continuam usados em outros pontos do arquivo, se aplicável — confirmar antes de remover).