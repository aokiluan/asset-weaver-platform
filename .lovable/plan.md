## Objetivo

Substituir a etapa 3 (Assinatura) do wizard de boleta — hoje um upload manual de PDF — pela mesma integração com **Autentique** do projeto Invest Fácil: gera o **Boletim de Subscrição** + **Certificado de Debêntures**, envia em um único envelope com 3 signatários (2 diretores + investidor) e acompanha o status em tempo real até a conclusão.

## Pré-requisito

Adicionar o secret **`AUTENTIQUE_API_KEY`** (token Bearer da API v2 do Autentique). Você precisa fornecer esse valor antes de prosseguir — sem ele as edge functions não funcionam.

## Fluxo na etapa 3 do wizard

```text
[Preview Boletim] [Preview Certificado]
        ↓
[Enviar para assinatura]   ← chama edge function
        ↓
"Aguardando assinatura"    ← polling 15s + signers list (✓/⏳)
        ↓ (todos assinaram)
[✓ Assinado]  → status boleta = "assinada", current_step = 4 (auto)
```

Sem upload manual. Continua sendo possível "Voltar". Autosave permanece ativo nas etapas 1–2.

## Banco de dados (migration)

Nova tabela `public.signature_tracking`:

- `boleta_id` (FK → `investor_boletas.id`, on delete cascade)
- `autentique_document_id` (text, único)
- `document_name` (text)
- `status` (text: `pending` | `in_progress` | `finished`)
- `signers` (jsonb: `[{ name, email, publicId, signed }]`)
- `finished_at` (timestamptz, nullable)
- `created_at`, `updated_at`

RLS: usuários autenticados leem/escrevem tracking de boletas que eles enxergam (mesma política do `investor_boletas`). Service role livre (edge functions usam service role).

## Edge functions (3)

Adaptadas do projeto Invest Fácil — substituem `operationId` por `boletaId` e leem dados direto do banco.

1. **`send-to-autentique`** (público, sem JWT)
   - Input: `{ boletaId }`
   - Carrega `investor_boletas` + `investor_series` + `dados_investidor`.
   - Gera HTML do Boletim + Certificado (lib portada — ver abaixo) e combina em um único arquivo.
   - Cria documento via GraphQL `createDocument` no Autentique com 3 signers (Everaldo, Luan, investidor).
   - Insere registro em `signature_tracking` e atualiza `investor_boletas.status = 'aguardando_assinatura'`.

2. **`sync-autentique-status`** (público)
   - Input: `{ boletaId }`. Consulta documento no Autentique, faz merge dos signers, atualiza tracking. Se todos assinaram: `status='finished'`, `boleta.status='assinada'`, `boleta.contrato_assinado_em=now()`, `current_step=4`.

3. **`autentique-webhook`** (público, sem JWT)
   - Recebe eventos `document.finished`, `document.updated`, `signature.accepted` e atualiza tracking + boleta da mesma forma. URL precisa ser cadastrada no painel do Autentique.

## Frontend — arquivos novos

- **`src/lib/boleta-document-templates.ts`** — porta de `document-templates.ts` adaptada à nova fonte de dados (`InvestorBoleta` + `BoletaDadosInvestidor` + `InvestorSeries`):
  - Lê série/indexador/prazo/spread direto de `investor_series` (não mais hardcoded CDI+1,5%/2,0%).
  - Quantidade de debêntures = `floor(valor / 1000)`.
  - Mantém layout/HTML idênticos (Times New Roman, A4, tabelas com bordas).

- **`src/lib/signature-tracking.ts`** — porta direta (troca `operation_id` por `boleta_id`).

## Frontend — alteração em `BoletaWizardSheet.tsx`

Substituir o conteúdo atual de `step === 3` por um componente `<BoletaSignatureStep boleta={…} dados={…} series={…} onSigned={…} />` com 4 estados (`preview` | `sending` | `pending` | `signed`):

- **preview**: cards de Boletim e Certificado com botões "Visualizar" (Dialog com iframe srcDoc) e "Baixar HTML"; lista os 3 signatários; botão primário "Enviar para assinatura".
- **sending**: spinner.
- **pending**: alerta âmbar "Aguardando assinatura" + lista de signers com ✓/⏳ + polling a cada 15s via `sync-autentique-status`.
- **signed**: avança automaticamente para step 4 (Pagamento) após 2s.

Ao reabrir uma boleta com tracking existente, o componente faz `getLatestSignatureTracking(boleta.id)` no mount e já entra no estado correto — não reenvia documento.

## Hardcoded vs configurável

Mantenho os 2 diretores **hardcoded** no edge function (Everaldo/Luan, mesmos CPFs/emails do Invest Fácil), igual à versão original. Se quiser depois movemos para uma tabela `signatarios_padrao` no admin — fora do escopo desta etapa.

## Endereço da emissora no Boletim

Hardcoded igual ao Invest Fácil (S3 Capital Securitizadora, Avenida Júlio Diniz 257, Campinas-SP). Posso parametrizar depois se for outra emissora.

## Não muda

- Etapas 1, 2 e 4 do wizard.
- Autosave, CEP autocomplete, séries do admin, listagem de boletas.
- Step 4 (Pagamento) continua com upload manual de comprovante — só a Assinatura passa a ser via Autentique.

## Webhook

Após o deploy, copio a URL pública do `autentique-webhook` e te envio para você cadastrar no painel do Autentique (Configurações → Webhooks). Sem o webhook a sincronização só ocorre via polling.

## Próximo passo

Aprove o plano e me forneça o `AUTENTIQUE_API_KEY` para eu pedir o secret e executar.