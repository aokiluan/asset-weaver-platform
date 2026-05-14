## Objetivo

Quando uma boleta for **concluída** (todos assinaram via Autentique), o contato deve avançar **automaticamente** no kanban de `boleta_em_andamento` → `investidor_ativo`. Além disso, **travar** a movimentação manual para `investidor_ativo` no kanban — só o trigger de assinatura concluída pode promover.

## Mudanças

### 1. Auto-promoção do contato (backend)

Hoje o contato só é movido para `investidor_ativo` no antigo `handleConcluir` (botão removido). O avanço precisa acontecer no mesmo ponto onde a boleta vira `concluida`:

- **`supabase/functions/sync-autentique-status/index.ts`**: quando `allSigned` → após o `update` em `investor_boletas`, fazer também:
  ```ts
  const { data: boleta } = await supabase
    .from("investor_boletas")
    .select("contact_id")
    .eq("id", tracking.boleta_id).maybeSingle();
  if (boleta?.contact_id) {
    await supabase.from("investor_contacts")
      .update({ stage: "investidor_ativo", last_contact_date: new Date().toISOString().slice(0,10) })
      .eq("id", boleta.contact_id);
  }
  ```
- **`supabase/functions/autentique-webhook/index.ts`**: replicar a mesma lógica dentro de `markFinishedIfNeeded` (buscar `contact_id` a partir do `boleta_id` e atualizar o contato).
- Redeploy das duas functions.

### 2. Travar movimento manual no kanban (frontend)

Em **`src/pages/investidores/InvestidoresCRM.tsx`**, dentro de `requestStageMove`:

- Bloquear qualquer destino `investidor_ativo` por drag/seta:
  ```ts
  if (newStage === "investidor_ativo") {
    toast.info("O investidor é promovido automaticamente quando a boleta é concluída.");
    return;
  }
  ```
- Também bloquear movimentos *saindo* de `investidor_ativo` manualmente (estágio é resultado de processo, não deve ser desfeito por arrasto). Manter apenas movimentos para estágios terminais (`perdido`/etc.) se desejado — proposta: bloquear totalmente saída manual.

Em **`KanbanColumn`** (mesmo arquivo): quando `stage === "investidor_ativo"`, marcar como não-droppable visualmente (já temos `terminal` flag — adicionar `locked` similar) para o usuário entender que essa coluna não aceita drop manual.

### 3. Limpeza

- Em **`src/pages/investidores/BoletaWizardSheet.tsx`**, remover a função `handleConcluir` (lines ~218–240) que ainda referencia `pagamento_enviado`/move manual — é código morto após a remoção da etapa 4.

## Resultado

- Concluir assinatura → boleta `concluida` + contato `investidor_ativo` automaticamente, em ambos os caminhos (polling e webhook).
- Kanban: coluna `Investidor Ativo` recusa drop manual com aviso. Promoção/demoção só ocorre via trigger de assinatura.
