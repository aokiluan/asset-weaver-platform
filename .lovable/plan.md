## Objetivo

Substituir o filtro de status (Ativo / Inativo / Prospect) na tela `Investidores` (`/diretorio/investidores`) por um filtro baseado nos **estágios do pipeline de investidores** — os mesmos exibidos no Kanban/CRM (`Lead`, `Primeiro Contato`, `Em Negociação`, `Boleta em Andamento`, `Investidor Ativo`, `Manter Relacionamento`, `Perdido`).

## Como o vínculo funciona

A tabela `investidores` (cadastro definitivo) não tem coluna `stage`. O estágio mora em `investor_contacts.stage`. O elo entre os dois é a tabela `investor_boletas`, que possui `contact_id` (FK para `investor_contacts`) e `investidor_id` (FK para `investidores`) — preenchido quando a boleta é concluída e o investidor passa a constar no diretório.

Para cada investidor, derivamos o estágio assim:
1. Buscar a boleta mais recente do investidor (`investor_boletas` ordenada por `updated_at desc`).
2. Pegar o `contact_id` dessa boleta e ler `investor_contacts.stage`.
3. Se não houver boleta vinculada (ex.: investidor importado direto), exibir o estágio como "—".

## Mudanças propostas

**`src/pages/Investidores.tsx`** (frontend, único arquivo):

- Importar `STAGE_ORDER`, `STAGE_LABEL`, `InvestorStage` de `@/lib/investor-contacts`.
- Trocar `STATUS_OPTIONS` (`ativo/inativo/prospect`) por `STAGE_ORDER`. O `<Select>` passa a listar "Todos os estágios" + cada `STAGE_LABEL[stage]`.
- No `load()`, fazer um segundo fetch a `investor_boletas` (`select investidor_id,contact_id,updated_at`) e a `investor_contacts` (`select id,stage`) para construir um `Map<investidor_id, stage>`.
- Aplicar o filtro por estágio em memória (`items.filter(i => stageMap.get(i.id) === stageFilter)`).
- No card de detalhe e na lista, substituir o `Badge` que mostra `selected.status` (capitalize) por um `Badge` que mostra `STAGE_LABEL[stage] ?? "—"`.
- Manter o campo `status` cru no banco intacto (não há migração).

## Pontos fora de escopo

- Não vamos alterar a coluna `status` da tabela `investidores` nem migrar dados.
- Não criamos vínculo automático para investidores que ainda não passaram por boleta — eles aparecem com estágio "—" e ficam fora dos filtros de estágio específico (aparecem só em "Todos os estágios").
- KPIs (Total cadastrado, Ativos, Volume investido, Ticket médio) continuam usando `investidores.status = 'ativo'` para preservar o significado financeiro atual.