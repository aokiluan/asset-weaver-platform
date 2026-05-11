## Problema

Quando o usuário com perfil **crédito** envia o cedente para a etapa **Comitê**, a aba "Comitê" ainda exibe "Comitê ainda não iniciado" com o botão "Abrir sessão de comitê". O esperado é que a sessão já esteja aberta automaticamente — o comitê só precisa votar.

Hoje o trigger `cedente_ensure_proposal_on_comite` cria a `credit_proposals`, mas **não** cria o registro em `committee_sessions`. Por isso o `ComiteGameSession` cai no estado "sem sessão" e exige o clique manual.

## Solução

Estender o trigger do banco para que, ao entrar na etapa `comite`, **a proposta E a sessão de comitê** sejam criadas atomicamente. Sem mudanças de UI.

### Migração SQL

Atualizar a função `public.cedente_ensure_proposal_on_comite()`:

- Após garantir a `credit_proposals` (com id `existing_id` ou recém-inserida), verificar se já existe uma `committee_sessions` para a proposta.
- Se não existir, inserir uma nova com:
  - `proposal_id` = id da proposta
  - `status` = `'aberta'`
  - `voto_secreto` = `true` (padrão atual usado pelo botão manual)
  - `created_by` = `COALESCE(auth.uid(), NEW.owner_id, NEW.created_by)`
- Idempotente: não recria se já houver sessão.

### Sem alterações de frontend

- `ComiteTabContent` e `ComiteGameSession` continuam idênticos. Como a sessão passa a existir já no momento em que o usuário abre a aba Comitê, o estado "Comitê ainda não iniciado" simplesmente não aparece mais nesse fluxo.
- O botão "Abrir sessão de comitê" segue existindo como fallback (caso uma proposta antiga não tenha sessão), sem prejuízo.

### Fora de escopo

- Backfill de propostas antigas em etapa `comite` sem sessão: não tocar — o botão manual cobre.
- Reabrir sessão após `encerrada`/`revelada`: comportamento atual mantido.
