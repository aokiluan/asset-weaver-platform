## Diagnóstico

A lógica de download dos PDFs assinados **já está implementada** em `sync-autentique-status` e `autentique-webhook` (consulta GraphQL `files { signed, pades }` → upload no bucket `investor-boletas` → registro em `signature_tracking.signed_files`).

Porém, a boleta do Marcos (única `concluida` hoje) tem `signed_files: []`. Motivo: ela foi marcada como concluída **manualmente via SQL** no backfill anterior, sem passar pela função que baixa os arquivos. Por isso a pasta do investidor no diretório está vazia.

## Plano

1. **Reexecutar a sincronização para a boleta existente**
   - Invocar `sync-autentique-status` com `{ boletaId: "fbd7bb52-86ee-4b48-9417-876d3e83a3b9" }`.
   - A função vai consultar a Autentique pelo `autentique_document_id` já salvo (`e1db12acbf85…`), baixar `signed` e `pades`, gravar em `investor-boletas/{investidor_id}/{boleta_id}/...pdf` e atualizar `signed_files`.
   - Conferir logs para garantir que a Autentique devolveu URLs (documentos antigos podem ter URLs expiradas; nesse caso reusamos `original` como fallback).

2. **Tornar o fluxo idempotente / resiliente**
   - Em `promoteBoletaToInvestidor` (ambas as functions), se `signed_files` já estiver vazio mas a boleta já foi promovida, permitir reprocessar só a etapa 4 (download + upload) sem duplicar investidor.
   - Adicionar fallback: se `files.signed` vier nulo, tentar `files.pades`; se ambos vierem nulos, logar `autentique_no_files` para diagnóstico.
   - Salvar também `autentique_url` original em `signed_files[].source_url` para auditoria.

3. **Botão "Rebaixar arquivos" no `BoletaConcluidaSheet`** (apenas UI + invoke da function existente)
   - Quando `signed_files` estiver vazio, mostrar botão "Buscar arquivos assinados" que chama `sync-autentique-status` e recarrega o sheet.
   - Útil para boletas legadas e como recuperação manual em caso de falha de webhook.

4. **Validação**
   - Após passo 1, verificar:
     - `signature_tracking.signed_files` populado.
     - Objetos visíveis em `storage.objects` no bucket `investor-boletas`.
     - PDFs aparecem no `BoletaConcluidaSheet` e em `InvestidorDetail` → seção "Boletas e documentos assinados".

## Detalhes técnicos

- Bucket `investor-boletas` já existe (privado) com RLS adequada — sem mudança de schema.
- Sem nova migration: apenas edição das duas edge functions e do `BoletaConcluidaSheet.tsx`.
- A consulta GraphQL atual é compatível com a API v2 da Autentique; nenhum novo secret necessário (`AUTENTIQUE_API_KEY` já configurado).
