## Objetivo

Exibir o **Comitê** como sub-aba permanente dentro de **Análise de crédito** no cedente, ao lado de **Relatório**, mostrando o resultado individual da votação daquele cedente — independentemente de a proposta estar ou não no estágio "comitê" no momento.

## Comportamento por cenário

| Cenário do cedente | O que aparece na sub-aba Comitê |
|---|---|
| Não tem proposta ainda | Estado vazio: "Nenhuma proposta aberta para este cedente. O comitê será habilitado quando houver uma proposta encaminhada." |
| Tem proposta, mas ainda não chegou ao comitê | Aviso informativo + botão desabilitado: "Proposta em estágio X. Comitê será aberto quando a alçada exigir." (somente leitura) |
| Proposta no estágio "comitê" (alçada = comite) | Sessão de votação ativa (`ComiteGameSession`) — comportamento atual |
| Proposta já decidida após passar pelo comitê | Resultado consolidado: votos revelados, decisão final, justificativas, data de encerramento (read-only) |

## Mudanças no código

### `src/pages/CedenteDetail.tsx`
- Remover o gate `latestProposal?.approver === "comite"` da renderização da sub-aba.
- A `TabsList` da seção "Análise de crédito" passa a ter sempre as duas opções: **Relatório** e **Comitê**.
- Renderizar `ComiteGameSession` sempre que houver `latestProposal`; quando não houver, renderizar um estado vazio simples no lugar.
- Passar uma prop nova `readOnly` (boolean) para `ComiteGameSession` quando a proposta não estiver no estágio comitê (mostra histórico/resultado, mas oculta botões de voto/abrir sessão).

### `src/components/credito/ComiteGameSession.tsx`
- Adicionar prop opcional `readOnly?: boolean`.
- Quando `readOnly`:
  - Não mostrar botões "Abrir sessão", "Votar", "Revelar", "Encerrar".
  - Sempre exibir os votos (mesmo se a sessão estava marcada como secreta e foi encerrada — usar dados já existentes).
  - Mostrar um chip "Somente leitura" no cabeçalho.
- Quando não há `session` para a proposta e está em `readOnly`: mostrar mensagem "Comitê ainda não foi aberto para esta proposta".
- Lógica de votação/abertura permanece intacta para o caso ativo.

### Estado vazio (sem proposta)
Pequeno componente inline no `CedenteDetail` com ícone `Vote`, texto explicativo e link para "Criar proposta" (reaproveitando o fluxo já existente em `/credito`).

## Não escopo
- Não alteramos o banco de dados.
- Não mudamos RLS — `committee_sessions` e `committee_votes` já são visíveis para quem vê a proposta.
- Não alteramos a tela global `/comite` — ela continua funcionando como hoje.

## Resultado

Dentro de qualquer cedente → aba **Análise de crédito** → duas sub-abas sempre visíveis (**Relatório** | **Comitê**), permitindo consultar o resultado individual do comitê daquele cedente a qualquer momento.