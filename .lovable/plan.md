# Limpeza do legado `credit_proposals` no fluxo de análise

## Objetivo
Garantir que `credit_proposals` **não influencie mais o gate Análise → Comitê** nem polua o `CedenteDetail`. A tabela continua existindo apenas como suporte ao módulo de votação do comitê (já refatorado para usar `credit_reports` como fonte do parecer).

## O que muda

### 1. Banco de dados (migração)
- **Drop** da função `public.ensure_proposal_for_cedente(uuid)` — não é mais chamada por ninguém depois desta limpeza.
- **Mantém** o trigger `cedente_ensure_proposal_on_comite` (ele cria a proposta automaticamente quando o cedente entra na etapa `comite`, alimentando a tela de votação — agora é a **única** porta de entrada).
- **Mantém** `set_proposal_approval_level`, `log_proposal_stage_change`, `committee_*`, `credit_opinions`, `approval_levels`. Eles seguem sustentando a votação real.

### 2. `src/pages/CedenteDetail.tsx`
- Remover do `load()` o `select` em `credit_proposals` quando o cedente ainda está em `novo/cadastro/analise`. Só consultar quando `stage ∈ {comite, formalizacao, ativo, inativo}`.
- Remover o estado `hasPleito` (não é usado em nenhum gate em `cedente-stages.ts`).
- `hasParecer` passa a depender **só** de `credit_reports` (completude = 8 e `recomendacao` setado) — ajuste já feito na rodada anterior; agora limpamos o `OR propsList.some(...)` que sobrou.
- `ComiteTabContent`: remover o `useEffect` que chama `ensure_proposal_for_cedente`. Quando o usuário abre a aba Comitê, o cedente já está em `stage='comite'` e o trigger garantiu a proposta. Se ainda não houver, mostrar mensagem "Aguardando entrada no comitê" em vez de auto-provisionar.
- `CreditReportForm` recebe `proposalId={null}` — confirmar que o componente já tolera isso (já tolera, é prop opcional).

### 3. `src/lib/cedente-stages.ts`
- Remover `hasPleito` da interface `CedenteForGates` (já não é usado em nenhum `case`).
- Atualizar comentário: deixar explícito que o gate Análise → Comitê é alimentado pelo `credit_reports`.

### 4. Sem mexer
- `/comite`, `ComiteGameSession`, `VoteBriefing`, `ReadingChecklist`, `PdfReadingDialog`, `AdminAlcadas`, `Formalizacao` — continuam lendo `credit_proposals` porque é onde o ciclo de votação realmente acontece.
- Tabelas `credit_proposals`, `credit_opinions`, `committee_*`, `approval_levels`, `proposal_history` — preservadas.

## Resultado
- Gate "Parecer de crédito concluído" 100% baseado em `credit_reports`.
- `CedenteDetail` deixa de fazer query desnecessária em `credit_proposals` nas etapas iniciais.
- Nenhuma chamada manual a `ensure_proposal_for_cedente`. A criação da proposta passa a ser exclusivamente reativa via trigger ao mudar `stage` para `comite`.
- Comitê e formalização seguem funcionando inalterados.

## Detalhes técnicos
- Migração SQL única: `DROP FUNCTION IF EXISTS public.ensure_proposal_for_cedente(uuid);`
- Edição em 2 arquivos TS: `CedenteDetail.tsx` e `lib/cedente-stages.ts`.
- Sem mudanças de schema, sem RLS tocada, sem risco para dados existentes.
