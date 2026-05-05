## Objetivo

Adicionar ao `FieldAttachments` (já presente nos campos do relatório de crédito que aceitam imagem) um segundo botão **"Capturar do documento"**, que abre os documentos já anexados ao cedente, permite ao analista navegar/zoom e desenhar uma área retangular sobre o documento — esse recorte vira um anexo do campo, com o mesmo fluxo dos uploads atuais.

## Fluxo do usuário

1. No campo, ao lado de "Anexar imagem", aparece "Capturar do documento" (ícone de tesoura/recorte)
2. Abre um Dialog grande (~85vh) dividido em duas colunas:
   - **Esquerda (260px)**: lista dos documentos do cedente (nome + categoria). PDFs e imagens são selecionáveis; outros tipos ficam desabilitados.
   - **Direita**: visualizador do documento selecionado, com paginação ◀ ▶ (PDFs), zoom + / − (50%–300%) e canvas
3. Arrasta com o mouse sobre o documento → desenha retângulo translúcido azul
4. Botão **"Recortar e anexar"** gera PNG da área selecionada, sobe para `report-files` e vira um attachment do campo (legenda automática: `Recorte de <arquivo> (pág. N)`)

## Componentes

**Novo: `src/components/credito/DocumentSnipDialog.tsx`**
- Props: `cedenteId`, `open`, `onOpenChange`, `onCaptured(blob, label)`
- Lista documentos via `supabase.from("documentos").select("id, nome_arquivo, mime_type, storage_path, categoria:documento_categorias(nome)").eq("cedente_id", cedenteId)`
- Signed URL (1h) para `cedente-docs`
- Imagem → `<img>` desenhada num `<canvas>` (source)
- PDF → `pdfjs-dist` (import dinâmico + worker via `?url`) renderiza página atual no canvas source
- Segundo canvas sobreposto (overlay transparente) captura `mousedown/move/up` e desenha retângulo
- "Recortar": canvas auxiliar copia região com `drawImage` e exporta `toBlob("image/png", 0.95)`

**Alterado: `src/components/credito/FieldAttachments.tsx`**
- Adiciona estado `snipOpen` e botão "Capturar do documento" (ícone `Crop`) ao lado do botão de upload
- `onCaptured(blob, label)` reusa exatamente o mesmo upload (path `cedentes/<cid>/credit-report/<fieldKey>/<uuid>.png`) e adiciona `{ path, name, caption: label }` ao array `value`
- Sem mudança de schema, sem mudança de RLS — perfis de crédito já podem ler `documentos` e baixar de `cedente-docs`

## Detalhes técnicos

- Dependência: instalar `pdfjs-dist` (~500KB, lazy)
- Worker do pdf.js: `(await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default`
- Render PDF: `getDocument({url}).promise` → `getPage(n).render({canvasContext, viewport, canvas})`
- Conversão coords mouse→canvas considera ratio `canvas.width / boundingRect.width` para zoom correto
- Reset de seleção/página ao trocar de documento; reset total ao fechar dialog
- Validação mínima: rect ≥ 5×5 px

## Fora do escopo

- Anotações (setas, destaques) sobre a captura
- OCR do recorte
- Captura cross-page
