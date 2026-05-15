## Entendimento

Hoje a tela `/diretorio/investidores` lista apenas registros da tabela `investidores` (cadastro definitivo, criado quando uma boleta é concluída). Por isso só aparece "luan" (que já é Investidor Ativo). Todos os demais leads do pipeline (Lead, Primeiro Contato, Em Negociação, Boleta em Andamento, Manter Relacionamento, Perdido) ficam invisíveis aqui — eles existem só em `investor_contacts`.

Você quer que esta tela passe a mostrar **todos os contatos do pipeline**, e não só os efetivados.

## Mudança proposta

Trocar a fonte de dados da tela: a lista passa a ler de `investor_contacts` (todo o pipeline). Quando o contato já tiver virado investidor cadastrado (vínculo via `investor_boletas.investidor_id`), enriquecemos com dados de `investidores` (CNPJ, valor investido, perfil etc.).

### Detalhes (`src/pages/Investidores.tsx`)

1. **Fetch principal**: `investor_contacts` (id, name, type, stage, ticket, contact_name, phone, last_contact_date, next_action) ordenado por `name`.
2. **Fetch auxiliar**: `investor_boletas` (contact_id, investidor_id da boleta mais recente) + `investidores` (dados completos dos efetivados). Monta `Map<contact_id, investidor>`.
3. **Renderização da lista**:
   - Item: nome do contato + badge do estágio (`STAGE_LABEL`) + tipo (PF/PJ/assessoria/institucional). Se houver investidor vinculado, mostra também o CNPJ formatado.
4. **Filtro de estágio**: continua igual, mas agora opera diretamente sobre `contact.stage`.
5. **Painel de detalhe**:
   - Cabeçalho: nome + badge estágio + badge tipo. Se houver investidor vinculado, mostra CNPJ; senão, mostra contato/telefone do pipeline.
   - KPIs:
     - Se vinculado a investidor: "Valor investido" (do `investidores.valor_investido`) e "Perfil".
     - Se ainda não vinculado: "Ticket esperado" (do `contact.ticket`) e "Próxima ação" (do `contact.next_action`).
   - Botão "Abrir detalhes" só aparece quando há investidor vinculado (rota `/diretorio/investidores/:id`); para leads puros, botão vira "Abrir no pipeline" → navega para o CRM com o contato selecionado (ou só esconde, se preferir manter simples).
6. **KPIs do topo**:
   - "Total no pipeline" → `investor_contacts.length`.
   - "Investidores ativos" → contatos com `stage = investidor_ativo`.
   - "Volume investido" → soma de `investidores.valor_investido` dos vinculados.
   - "Ticket médio (pipeline)" → média de `contact.ticket` dos não-terminais.

## Fora de escopo

- Sem mudanças no banco.
- Sem alteração na rota de detalhe do investidor cadastrado.
- Importação/criação de novo contato continua sendo feita pelas telas do pipeline (CRM/Boletas).