## Alinhar ações e transformar visualização rápida em preview real do arquivo

### Problema atual
1. **Botões desalinhados**: como o ícone de download só aparece para `documento`/`ata`, em linhas de `parecer`/`renovação` o ícone do olho fica centralizado, quebrando o alinhamento vertical da coluna.
2. **Visualização rápida mostra metadados**, não o arquivo. Hoje o `Sheet` à direita só renderiza o PDF/imagem real para `documento`. Para `ata`/`parecer` mostra um cartão com infos + botão "Baixar". O usuário quer ver o conteúdo do arquivo de fato.

### O que muda

**1. Alinhar os botões na coluna Ações** (`src/pages/DiretorioDetail.tsx`, função `ArquivosTable`)
- Cada linha sempre renderiza dois "slots" de ícone com largura fixa, na ordem `[olho][download]`.
- Quando a ação não existe para aquele tipo (ex.: download para `renovação`/`parecer`), o slot vira um espaçador invisível (`<span class="inline-block w-6 h-6" />`) para preservar o alinhamento.
- Remove o `<div class="flex justify-end">` que comprime para um único item.

**2. Visualização rápida = preview real do arquivo**
A `openPreview(a)` passa a obter um **blob/URL** do arquivo conforme o tipo, e o `<Sheet>` exibe sempre um `<iframe>` (ou `<img>` se for imagem):

| Tipo | Como gerar a URL para o iframe |
|---|---|
| `documento` | já funciona — `createSignedUrl` no storage. |
| `ata` | refatorar `comite-ata-pdf.ts`: extrair a montagem do `AtaData` de `downloadAtaById` em `loadAtaData(minuteId)`; criar `generateAtaPdfBlobById(minuteId)` que devolve `{ blob, url }` usando `doc.output("bloburl")`. `downloadAtaById` continua existindo (chama `loadAtaData` + `doc.save`). |
| `parecer` (crédito) | `generateCreditReportPdf(a.raw, cedente.razao_social, "blob")` — já suporta `mode: "blob"`. |
| `parecer` (visita/comercial) | `generateVisitReportPdf(a.raw, cedente.id, \`v${a.raw.versao}\`, "blob")` — já suporta `mode: "blob"`. |
| `renovação` | não existe arquivo físico → **esconder o botão de olho** nessa linha (slot vira espaçador) e manter o link "Ver no histórico do cedente" disponível na própria linha do dossiê do cedente, não aqui. |

- O `Sheet` deixa de ter os ramos `tipo === "ata" / "parecer" / "renovacao"` com cards de metadados. Vira uma única área:
  ```
  if previewUrl ausente -> spinner
  else if mime image/* -> <img>
  else -> <iframe class="w-full h-full">
  ```
- O `SheetHeader` mantém nome + badge de tipo + tamanho/data (info contextual fica no header, não no corpo).
- O footer ganha sempre os botões "Abrir em nova aba" e "Baixar" (este último só quando faz sentido — `documento`/`ata`/`parecer`).
- Aumentar a largura: `sm:max-w-2xl` → `sm:max-w-4xl` para que o PDF caiba confortavelmente.
- Ao gerar URLs de blob via `URL.createObjectURL`, fazer `URL.revokeObjectURL(previewUrl)` no `onOpenChange(false)` e quando `previewArq` mudar, evitando vazamento.

**3. Limpeza**
- Remove imports e componentes não usados após a simplificação do Sheet (cartões de metadados, `Link` para cedente, etc., se ficarem órfãos).
- Mantém o tooltip "Visualização rápida" no botão do olho.

### Arquivos editados
- `src/pages/DiretorioDetail.tsx` — alinhamento dos botões + nova lógica de preview no Sheet + revoke de blob URLs.
- `src/lib/comite-ata-pdf.ts` — extrair `loadAtaData` e adicionar `generateAtaPdfBlobById`.

### O que NÃO muda
- Schema, fetches, montagem de `arquivos[]`, filtros, ordenação, colunas configuráveis, upload de anexo livre, geração de PDFs (mesmas funções, só novo modo `blob` para ata).
