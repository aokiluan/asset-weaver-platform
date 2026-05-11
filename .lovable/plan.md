# Histórico de contratos na Formalização

Hoje a página `/formalizacao` mostra apenas os cedentes com `stage = 'formalizacao'`. Depois que a minuta é assinada e o cedente é ativado, ele desaparece da tela — para reaver o contrato é preciso entrar pelo cadastro do cedente.

Vamos replicar o padrão usado em `/comite` (abas "Em pauta" / "Reprovados" / "Atas") para que a Formalização tenha um **histórico permanente de contratos**, com busca, download do PDF e atalho para o cedente.

## O que muda na UI

A página `Formalizacao.tsx` passa a usar `Tabs` com três abas no mesmo padrão visual do Comitê:

1. **Em formalização** (atual) — cedentes com `stage = 'formalizacao'`. Comportamento, cards e ações exatamente como hoje.
2. **Aguardando assinatura** — atalho filtrado: apenas os de `stage = 'formalizacao'` que ainda têm `minuta_assinada = false`. (Reaproveita os mesmos cards.)
3. **Contratos assinados** — nova lista/histórico, mostrando todos os cedentes que já tiveram minuta marcada como assinada (`minuta_assinada = true`), independentemente do `stage` atual. Inclui, portanto, cedentes já `ativo` e `inativo`.

Os 3 StatCards no topo continuam idênticos (Em formalização / Aguardando / Prontos para ativar).

## Aba "Contratos assinados" — layout

Tabela compacta no padrão das Atas, ordenada por `minuta_assinada_em` desc:

| Cedente | CNPJ | Proposta | Valor aprovado | Assinado em | Status atual | Ações |

- **Cedente / CNPJ:** link para `/cedentes/:id?tab=formalizacao`.
- **Proposta:** código + valor aprovado (vindos de `credit_proposals` aprovada mais recente daquele cedente).
- **Assinado em:** `minuta_assinada_em` formatado pt-BR + "há Xd".
- **Status atual:** Badge — `Ativo` (verde), `Inativo` (cinza), ou `Em formalização` (âmbar) caso ainda não tenha sido ativado.
- **Ações:** botão `Baixar minuta (PDF)` (reusa `downloadMinutaPDF` já existente) e botão `Abrir cadastro`.

Campo de busca acima da tabela (mesmo componente `Input` usado no Comitê) que filtra por razão social, CNPJ ou código de proposta.

Estado vazio: ícone `FileSignature` + "Nenhum contrato assinado ainda."

## Permissões

Reusa `canGenerate = admin | formalizacao` para o botão de baixar PDF. A leitura da aba "Contratos assinados" é liberada para todos que já enxergam a página (`admin`, `formalizacao`, `gestor_geral`) — controlado pelas RLS atuais de `cedentes` e `credit_proposals`, não exige migração.

## Detalhes técnicos

- **Sem mudanças no banco.** Já existem as colunas `minuta_assinada`, `minuta_assinada_em`, `minuta_assinada_por` em `cedentes`. As RLS atuais já permitem o `select` desses registros para os papéis envolvidos.
- **Carregamento:** ao montar a página, fazer um `select` adicional em `cedentes` filtrando `minuta_assinada = true` (limit 200, ordenado por `minuta_assinada_em desc`) e um `select` em `credit_proposals` (`stage = 'aprovado'`, `in cedente_id`) para enriquecer a linha. Reaproveita o mapeamento `propostas` já feito no `load()`.
- **Reuso de PDF:** o helper `downloadMinutaPDF` em `src/lib/minuta-pdf.ts` já gera a minuta a partir do cedente + proposta — usa o mesmo branding S3 Capital aplicado no plano anterior.
- **Sem novas rotas:** tudo dentro de `/formalizacao` via `Tabs` controladas por estado local (`useState`), igual ao `Comite.tsx`.

## Arquivos a editar

- `src/pages/Formalizacao.tsx` — refatorar para usar `Tabs`, separar a lista atual em duas abas (Em formalização / Aguardando) e adicionar a aba "Contratos assinados" com busca, badge de status, botões de baixar minuta e abrir cadastro.

Nenhum arquivo novo, nenhuma migração, nenhum impacto em outras páginas.
