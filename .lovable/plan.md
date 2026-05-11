## Fluxo do cedente reprovado em comitê

Hoje, ao reprovar, a função `committee_close_if_complete` apenas marca a proposta como `reprovado` e gera a ata, mas o `cedentes.stage` continua em `'comite'` — o cedente fica "preso". Vamos definir um fluxo claro de arquivamento + reapresentação.

### 1. O que acontece automaticamente quando o comitê reprova

Ao fechar a sessão com decisão `reprovado`:

- `credit_proposals.stage` → `'reprovado'` (já existe).
- Ata é gerada normalmente, registrada no histórico (`cedente_history.evento = 'ata_comite'`).
- **Novo:** `cedentes.stage` → `'inativo'` automaticamente (espelho do que já é feito para `aprovado → formalizacao`).
- **Novo:** registro extra em `cedente_history` com evento `'reprovado_comite'` contendo `minute_id`, `proposal_id` e número do comitê — para destacar visualmente no histórico (separado do `'ata_comite'`).
- O kanban / pipeline passa a mostrar o cedente na coluna **Inativo**, fora da esteira ativa.

### 2. Reapresentação ao comitê (com justificativa)

Permitido a `admin`, `credito` e `comite`. Fluxo:

1. Na aba **Comitê** (ou na tela de detalhe do cedente inativo por reprovação), aparece o botão **"Reapresentar ao comitê"**.
2. Abre dialog exigindo:
   - Justificativa da reapresentação (textarea obrigatória, mín. 30 caracteres).
   - O que mudou desde a última votação (campo livre opcional, mas sugerido).
3. Ao confirmar:
   - Move `cedentes.stage` de `'inativo'` → `'analise'` (volta para Crédito revisar parecer antes de submeter de novo).
   - Cria nova `credit_proposals` (não reaproveita a reprovada) já vinculada ao cedente, com a justificativa em `observacoes` e referência à proposta anterior em `detalhes`.
   - Registra `cedente_history` com evento `'reapresentacao_comite'` (justificativa + id da proposta anterior + id da nova proposta).
   - A justificativa é persistida e aparece na próxima ata gerada (campo "Motivo da reapresentação").
4. A partir daí o fluxo segue normal: Crédito revisa → envia para Comitê → nova rodada gera **nova ata numerada** (a anterior continua íntegra no histórico).

### 3. UI / UX

- **Stepper do cedente:** quando `stage = 'inativo'` por reprovação de comitê, mostrar badge vermelho "Reprovado em comitê" sobre o passo Comitê (sem criar novo stage; apenas indicador derivado do último evento de histórico).
- **Aba Comitê do cedente:** ao invés do painel de votação, exibir card resumo da última ata (decisão, data, número, link para PDF) + CTA "Reapresentar ao comitê".
- **Página `/comite` (sidebar):**
  - Filtro adicional "Reprovados" (lista cedentes com última ata reprovada e botão de reapresentação rápida).
  - Histórico mostra todas as atas (aprovadas e reprovadas) com badge de decisão.
- **Histórico do cedente (`CedenteHistoryTab`):** adicionar ícones/labels para os novos eventos `reprovado_comite` e `reapresentacao_comite`.

### 4. Arquivos impactados

**Banco (`supabase/migrations/...`):**
- Atualizar `committee_close_if_complete` para, no caso `reprovado`, mover `cedentes.stage` para `inativo` e inserir o evento `reprovado_comite`.
- Nova função `reapresentar_proposta_comite(_cedente_id uuid, _justificativa text, _mudancas text)` (SECURITY DEFINER) que valida role, cria a nova `credit_proposals` ligada à anterior, move o cedente para `analise` e registra histórico.
- Ajuste em `credit_proposals`: adicionar coluna `proposta_anterior_id uuid` (nullable, FK lógica) e `motivo_reapresentacao text` para alimentar a próxima ata.
- RLS: garantir que apenas `admin`/`credito`/`comite` podem invocar a RPC.

**Frontend:**
- `src/lib/cedente-stages.ts`: helper `isReprovadoEmComite(cedente)` (lê último evento) — sem alterar `STAGE_ORDER`.
- `src/components/cedentes/CedenteStageStepper.tsx`: badge "Reprovado em comitê" sobre o passo Comitê quando aplicável.
- `src/components/credito/ComiteGameSession.tsx` (ou nova `ComiteResultadoCard.tsx`): card de resultado + CTA reapresentação quando sessão encerrada.
- Novo `src/components/credito/ReapresentarComiteDialog.tsx`.
- `src/pages/Comite.tsx`: aba/filtro "Reprovados" + lista com ação de reapresentar.
- `src/components/cedentes/CedenteHistoryTab.tsx`: renderizar os dois novos eventos.
- `src/lib/comite-ata-pdf.ts`: incluir bloco "Motivo da reapresentação" quando a proposta tiver `motivo_reapresentacao` preenchido.

### 5. Fora de escopo

- Não criamos novo `cedente_stage` "reprovado" (a etapa terminal é `inativo`, conforme decisão).
- Notificações por e-mail ficam para próxima rodada.
- Limite de quantas reapresentações são permitidas (por enquanto, ilimitado, mas todas ficam rastreadas no histórico).
