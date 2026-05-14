## Objetivo

Quando uma boleta for **concluída**:
1. **Consultar info da boleta** na seção "Concluídas recentes" (hoje aparece "—" porque o nome do contato não é carregado, e o card não abre nada).
2. **Auto-criar Investidor** no Diretório → Pasta de Investidores, vinculado à boleta, com os PDFs assinados disponíveis para download.

## Mudanças

### 1. Schema (migração)

- Em `investor_boletas`, adicionar `investidor_id uuid` (FK lógica para `investidores.id`, nullable). Permite linkar boleta ↔ investidor após conclusão.
- Em `signature_tracking`, adicionar `signed_files jsonb default '[]'::jsonb` para armazenar `[{name, storage_path, signed_at}]` com os PDFs salvos do Autentique.
- Storage: usar bucket existente `investidor-boletas` com layout `{investidor_id}/{boleta_id}/{tipo}.pdf`. Adicionar policies (SELECT/INSERT) para usuários autenticados via service role nas funções e via RLS para SELECT (autor da boleta + admin/financeiro).

### 2. Edge functions — promover a investidor + baixar PDFs

Em **`sync-autentique-status`** e **`autentique-webhook`**, dentro do bloco `allSigned`/`markFinishedIfNeeded` (após marcar boleta `concluida` e contato `investidor_ativo`):

a) **Buscar PDFs assinados** via GraphQL Autentique:
```graphql
document(id: ...) { name files { signed pades } }
```
Para cada arquivo (boletim + certificado), `fetch(signedUrl)` → `arrayBuffer` → `supabase.storage.from('investidor-boletas').upload('<investidor_id>/<boleta_id>/<slug>.pdf', bytes, { contentType: 'application/pdf', upsert: true })`.

b) **Upsert em `investidores`** usando `dados_investidor` da boleta:
- `cnpj` = `cpf_cnpj` (limpo). Como `cnpj` é UNIQUE, fazer `upsert({...}, { onConflict: 'cnpj' })`.
- `tipo_pessoa` = `'pj'` se 14 dígitos, `'pf'` se 11.
- `razao_social` = nome, `email`, `telefone`, endereço, etc.
- `valor_investido` = soma dos valores de boletas concluídas do mesmo CNPJ.

c) **Vincular**: `update investor_boletas set investidor_id = <id>` para a boleta atual.

d) **Salvar paths** em `signature_tracking.signed_files`.

(Compartilhar lógica em helper `promoteToInvestidor(supabase, boletaId, autentiqueDocId, apiKey)` ou duplicar curto entre os dois arquivos — Edge Functions não compartilham módulos facilmente, então duplico um trecho enxuto.)

### 3. Frontend

**`src/pages/investidores/InvestidoresBoletas.tsx`** (página atual com seção quebrada):
- Carregar contatos referenciados pelas boletas concluídas em fetch separado (sem filtro de stage):
  ```ts
  const ids = [...new Set(boletas.map(b => b.contact_id))];
  supabase.from('investor_contacts').select('*').in('id', ids);
  ```
- Tornar cards de "Concluídas recentes" clicáveis → abrir um novo `BoletaConcluidaSheet` (read-only) com:
  - Dados da boleta (série, valor, prazo, taxa, datas).
  - Dados do investidor cadastrado (link para `/diretorio/investidores/{investidor_id}`).
  - Lista de **PDFs assinados** (do `signature_tracking.signed_files`), com botão "Baixar" via `supabase.storage.from('investidor-boletas').createSignedUrl(path, 60)`.

**`src/pages/InvestidorDetail.tsx`**:
- Adicionar nova seção "Boletas e documentos assinados": query `investor_boletas` por `investidor_id`, listar com link para download dos PDFs (via `signed_files` do tracking associado).

### 4. Backfill da boleta já concluída (Marcos)

Após o deploy, rodar uma função one-shot (chamada manual ao endpoint `sync-autentique-status` com o `boletaId` da Marcos) para gerar o investidor + baixar os PDFs já assinados, ou um SQL/insert criando o investidor manualmente caso a chamada Autentique falhe (documento já pode ter expirado o link de download — a API retorna `null` em `files.signed` se removido). Plano principal: invocar a edge function; fallback: criar registro mínimo em `investidores` apenas com nome/CNPJ a partir de `dados_investidor` e marcar `signed_files=[]`.

## Resultado

- Card de "Concluídas recentes" mostra nome + abre sheet com detalhes e PDFs assinados.
- Investidor aparece automaticamente em `/diretorio/investidores`, com a pasta contendo as boletas e PDFs.
- Boletas ficam vinculadas ao investidor para futuras consultas.

## Arquivos

- **Migração**: nova (add `investidor_id` em boletas, `signed_files` em tracking, policies do bucket).
- `supabase/functions/sync-autentique-status/index.ts` (edit).
- `supabase/functions/autentique-webhook/index.ts` (edit).
- `src/pages/investidores/InvestidoresBoletas.tsx` (edit + sheet read-only).
- `src/pages/investidores/BoletaConcluidaSheet.tsx` (novo).
- `src/pages/InvestidorDetail.tsx` (edit — seção de boletas/PDFs).
- Backfill: chamada à edge function para a boleta Marcos.
