
## Objetivo

No relatório estruturado de crédito (`CreditReportForm`, aba "Análise de crédito"), permitir que o analista anexe **imagens** (prints de Serasa, BACEN SCR, balanço, Google Maps, redes sociais, etc.) em qualquer campo, complementando ou substituindo o texto.

## Como vai funcionar para o usuário

Cada campo do formulário (textarea, input ou select) ganha um botão discreto **"Anexar imagem"** ao lado do label. Ao clicar:

1. Abre seletor de arquivo (aceita PNG/JPG/WEBP, múltiplas imagens)
2. Upload imediato para o storage (bucket `report-files`, já existente)
3. Aparece uma tira de miniaturas abaixo do campo, com:
   - clique para abrir em tamanho grande (lightbox)
   - botão `x` para remover
   - legenda opcional editável

O analista pode então:
- Preencher só o texto (como hoje)
- Preencher só imagens (ex.: print do Serasa fala por si)
- Misturar os dois

As imagens contam para "seção completa" — se a seção tem só campo obrigatório de texto vazio mas tem imagens anexadas, a seção é considerada preenchida.

## Onde os dados ficam armazenados

Não precisa nova tabela. As 8 seções já são `jsonb`. Adicionamos uma chave reservada `__attachments` dentro de cada seção:

```json
{
  "serasa_pj": "Sem apontamentos",
  "__attachments": {
    "serasa_pj": [
      { "path": "<cedente_id>/credit-report/<uuid>.png", "name": "serasa.png", "caption": "Consulta 02/05" }
    ],
    "bacen_scr": [...]
  }
}
```

Vantagens: zero migração, mantém histórico junto do dado, RLS já cobre via `credit_reports`.

Os arquivos vão para o bucket privado **`report-files`** (já existe), em `cedentes/<cedente_id>/credit-report/<uuid>.<ext>`. Acesso via signed URL (1h) gerado on-demand.

## Componentes a criar / alterar

**Novo:** `src/components/credito/FieldAttachments.tsx`
- Recebe `cedenteId`, `sectionKey`, `fieldKey`, `value: Attachment[]`, `onChange`
- Renderiza botão de upload + grid de thumbnails + lightbox (Dialog) + remoção
- Faz upload via `supabase.storage.from('report-files').upload(...)`
- Gera signed URLs com cache local

**Alterado:** `src/components/credito/CreditReportForm.tsx`
- `FieldRenderer` recebe `cedenteId` e renderiza `<FieldAttachments>` abaixo do controle
- Helpers `getAttachments(section, fieldKey)` e `setAttachments(section, fieldKey, list)` que leem/gravam em `section.__attachments[fieldKey]`
- Pareceres em camadas (parecer_comercial, regional, compliance, analista, pontos_positivos, pontos_atencao, conclusao) também ganham anexos — guardados num novo campo top-level `attachments_top: jsonb` no `credit_reports` (default `{}`)

**Alterado:** `src/lib/credit-report.ts`
- `isSectionComplete` considera completo se houver pelo menos 1 anexo no campo obrigatório

**Migração:** adicionar coluna `attachments_top jsonb not null default '{}'::jsonb` em `credit_reports` (para os campos de parecer fora das 8 seções).

**Storage:** o bucket `report-files` já existe e é privado. Adicionar policies SQL para permitir aos perfis de crédito (`analista_credito`, `gestor_credito`, `gestor_risco`, `admin`) `INSERT/SELECT/DELETE` em objetos sob `cedentes/`. SELECT estendido para quem pode ver o cedente (via `can_view_cedente`).

## Detalhes técnicos

- Limite por arquivo: 5 MB; tipos aceitos: `image/png`, `image/jpeg`, `image/webp`
- Compressão client-side opcional (canvas → webp 0.85) se > 1.5 MB
- Signed URL com `createSignedUrl(path, 3600)` — cacheado em estado do componente
- Drag & drop opcional (nice-to-have, fácil com input hidden)
- O `useFormDraft` continua salvando o JSON no localStorage normalmente — anexos já ficam no storage após upload, então o draft só precisa lembrar dos paths

## Fora do escopo

- OCR automático das imagens (poderia vir depois via edge function + Lovable AI)
- Anotações sobre a imagem (setas, destaques)
- Substituição do PDF do parecer comercial (já existe noutro fluxo)
