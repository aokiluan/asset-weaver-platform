## Objetivo

Eliminar a 4ª etapa (upload de comprovante de pagamento) e fazer com que a boleta seja **concluída automaticamente** assim que todos os signatários assinarem no Autentique.

## Alterações

### 1. `src/lib/investor-boletas.ts`
- `BOLETA_STEPS`: remover `{ id: 4, label: "Pagamento" }`. Wizard passa a ter 3 passos: **Dados → Série e valor → Assinatura**.
- `isInProgressStatus`: passa a considerar apenas `aguardando_assinatura` (e `assinada` como estado transitório curto). `pagamento_enviado` deixa de ser usado em novas boletas (mantido no enum por compatibilidade com dados antigos).

### 2. `src/pages/investidores/BoletaWizardSheet.tsx`
- Remover todo o bloco `step === 4` (FileUploader de comprovante + botões "Concluir e marcar como Ativo" / "Apenas concluir").
- Remover estados/handlers obsoletos: `comprovantePath`, `uploadFile('comprovante')`, `handleConcluir`. Manter `contratoPath` apenas se ainda referenciado pelo SignatureStep (não é).
- `handleNext`: cap em `Math.min(s + 1, 3)`.
- Footer: botão "Próximo" deixa de aparecer quando `step === 3` (assinatura controla o avanço).
- Stepper passa a renderizar 3 bolinhas.

### 3. `src/pages/investidores/SignatureStep.tsx`
Quando `tracking.status === 'finished'`:
- Estado `signed` agora é **terminal**, não chama mais `onAdvance` automático.
- Renderizar:
  - Mensagem "Boleta concluída — todos os signatários assinaram".
  - Botão **Fechar** que dispara `onSaved()` + fecha o sheet (props nova `onClose`).
  - (Opcional) botão para marcar contato como `investidor_ativo`.
- O avanço de status da boleta é feito pelo backend (`sync-autentique-status`), não pelo client.

### 4. Edge function `supabase/functions/sync-autentique-status/index.ts`
Quando `allSigned` virar `true`, em vez de marcar `status='assinada'` + `current_step=4`, marcar **direto como concluída**:
```ts
await supabase.from("investor_boletas").update({
  status: "concluida",
  contrato_assinado_em: new Date().toISOString(),
  concluida_em: new Date().toISOString(),
  current_step: 3,
}).eq("id", tracking.boleta_id);
```

### 5. Edge function `autentique-webhook`
Mesma alteração da #4 — qualquer caminho que detectasse `allSigned` deve concluir a boleta.

### 6. Bug paralelo (erro 500 atual `Autentique [200]`)
Logar `result.errors` em `send-to-autentique` antes de lançar, para identificar a causa real (provavelmente signatário inválido / e-mail repetido). Retornar a mensagem do Autentique no payload de erro para aparecer no toast do frontend.

## Notas

- Boletas legadas que estiverem em `current_step=4` ou `status='pagamento_enviado'` continuam abrindo (o wizard cai no step 3 já que passamos a limitar).
- Não removo as colunas `comprovante_path` / `pagamento_enviado_em` da tabela — só deixo de usá-las (evita migração destrutiva). Se quiser, posso fazer migration removendo depois.