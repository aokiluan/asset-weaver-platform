## Objetivo

Liberar o botão **"Enviar para Cadastro"** quando o Comercial concluir apenas:
1. Documentos obrigatórios anexados
2. Relatório comercial preenchido (com pleito dentro dele)

O requisito atual de existir registro em `credit_proposals` (gate `hasPleito`) será removido — a proposta nasce automaticamente quando o cedente entra em **Comitê** (já existe `cedente_ensure_proposal_on_comite`), então não precisa ser pré-condição da etapa **Novo**.

## O que está bloqueando hoje

No cedente atual (`626ee6bf…`) o estado é:
- 8 categorias obrigatórias com 1 doc cada (status pendente — OK pelo gate, que só checa categoria preenchida)
- Relatório de visita salvo
- **Sem registro em `credit_proposals`** → gate `hasPleito = false` → botão fica desabilitado com tooltip "Pleito de limite informado"

A causa é que `hasPleito` só vira `true` quando alguém cria uma proposta manualmente, mas no fluxo do Comercial isso não existe — o pleito é informado dentro do relatório de visita (`limite_global_solicitado` + `modalidades`).

## Mudanças (apenas frontend)

### 1. `src/lib/cedente-stages.ts`
Na avaliação da etapa `novo`, remover o `check(c.hasPleito, …)`. Ficam apenas:
- Documentos obrigatórios anexados
- Relatório de visita preenchido

### 2. `src/pages/CedenteDetail.tsx`
Remover `hasPleito` do `checklistEnvio` (mantém Documentos + Relatório comercial; Representantes sincronizados continua opcional/informativo).

### 3. (Opcional, recomendado) `CedenteVisitReportForm.tsx`
Tornar **obrigatório** preencher `limite_global_solicitado` e ao menos uma modalidade ativa para conseguir salvar o relatório. Assim o pleito continua sendo capturado, só que dentro do próprio relatório — sem depender de `credit_proposals`.

## Fora de escopo
- Permissões por papel (já estão corretas: comercial/admin/gestor_geral podem enviar de `novo → cadastro`).
- RLS do banco (a UPDATE em `cedentes` na etapa `novo` já permite o owner/comercial via `can_edit_cedente`).
- Demais etapas da esteira.

## Validação
Após a mudança, no cedente atual o botão **"Enviar para Cadastro"** deve ficar habilitado, e o tooltip de pendências deixa de mencionar "Pleito".