## Objetivo

Remover a obrigatoriedade de "criar proposta" para preencher o relatório estruturado de crédito. O `CreditReportForm` (8 seções) deve aparecer **direto** na aba **Análise de crédito** do cedente, vinculado ao próprio cedente.

## Mudanças

### 1. Banco — `credit_reports` passa a ser 1:1 com cedente

Migração:
- `proposal_id` deixa de ser `NOT NULL` (passa a ser opcional, só preenchido quando houver uma proposta vinculada).
- Remove o `UNIQUE` rígido em `proposal_id` e recria como índice **parcial** (`WHERE proposal_id IS NOT NULL`) — isso evita conflito quando vários cedentes ainda não têm proposta.
- Cria `UNIQUE INDEX` em `cedente_id` — garante 1 relatório por cedente e habilita `upsert(..., onConflict: "cedente_id")`.

RLS atual já cobre o caso (políticas baseadas em role, não em proposta) — nada a alterar.

### 2. UI — `CedenteDetail.tsx` (aba "Análise de crédito")

Substituir o estado vazio "Criar proposta" pelo `CreditReportForm` renderizado direto:

```text
┌─ Aba: Análise de crédito ──────────────────────────────┐
│  [Relatório estruturado de crédito · 0/8 seções]       │
│  ▸ 1. Identificação                                    │
│  ▸ 2. Descrição da empresa                             │
│  ▸ … (8 acordeões)                                     │
│  [Pareceres em camadas + conclusão]                    │
│  [Salvar relatório]                                    │
│                                                         │
│  ── Quando existir proposta vinculada ──────────────── │
│  [Card: Proposta ativa #123 · Estágio: comitê]         │
│  [Sub-aba: Comitê] (só aparece se alçada = comitê)     │
└────────────────────────────────────────────────────────┘
```

- Remover botão "Criar proposta" e o `ProposalFormDialog` da aba.
- Remover sub-aba "Pareceres" (já fica no próprio formulário).
- Manter sub-aba "Comitê" só quando houver proposta com `approver = "comite"` (gameficação continua dependendo da proposta porque ela carrega a alçada/quórum).

### 3. `CreditReportForm.tsx`

Tornar `proposalId` opcional:
- Assinatura: `{ cedenteId: string; proposalId?: string | null }`.
- Carregamento: busca por `cedente_id` (não mais por `proposal_id`).
- Upsert: usa `onConflict: "cedente_id"` e só inclui `proposal_id` no payload se existir.

## Arquivos afetados

- **migration nova**: torna `proposal_id` nullable + índices únicos parciais
- **src/components/credito/CreditReportForm.tsx**: query/upsert por `cedente_id`, `proposalId` opcional
- **src/pages/CedenteDetail.tsx**: aba "Análise de crédito" renderiza o form direto; mantém comitê condicional; remove `ProposalFormDialog` desta aba

## O que NÃO muda

- A esteira de Crédito (`/credito`) e a criação de propostas por lá continuam funcionando normalmente.
- Quando uma proposta é criada para o cedente, o relatório existente passa a ser exibido também na tela da proposta (mesma linha, vinculada por `cedente_id`).
- Comitê gameficado continua exigindo proposta (porque depende de alçada/quórum).