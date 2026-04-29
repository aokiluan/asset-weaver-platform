## Upload em lote + classificação automática por IA

### Fluxo do usuário

1. Usuário arrasta vários arquivos (ou clica para selecionar) em uma **dropzone única no topo** da aba Documentos.
2. Cada arquivo aparece como um **card na "Fila de não classificados"** com nome, tamanho, miniatura/ícone e badge de status: `Enviando → Analisando → Sugerido: <Categoria>`.
3. A IA lê o conteúdo de cada arquivo e sugere uma categoria. O card mostra a sugestão com botão **"Aceitar"** (move para a categoria) ou o usuário pode arrastar manualmente para outra dropzone.
4. Abaixo da fila ficam **dropzones empilhadas, uma por categoria** (Contrato Social, Cartão CNPJ, etc.). Cada dropzone lista os documentos já classificados ali e aceita drop dos cards pendentes.

```text
┌─────────────────────────────────────────────┐
│  📁 Arraste arquivos aqui ou clique         │
│     (PDF, JPG, PNG até 20MB)                │
└─────────────────────────────────────────────┘

🕓 Fila (3)
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ contrato.pdf   │ │ cartao.jpg     │ │ extrato.pdf    │
│ Sugerido:      │ │ Analisando...  │ │ Sugerido:      │
│ Contrato Soc.  │ │                │ │ Comprovante    │
│ [Aceitar][↓]   │ │                │ │ [Aceitar][↓]   │
└────────────────┘ └────────────────┘ └────────────────┘

📂 Contrato Social  ─────────────── (drop aqui)
   • doc-anterior.pdf  [aprovado]

📂 Cartão CNPJ  ──────────────────── (drop aqui)
   (vazio)

📂 Comprovante de Endereço ─────── (drop aqui)
   ...
```

### Mudanças técnicas

**1. Banco — campo de sugestão**
- Adicionar `categoria_sugerida_id uuid` e `classificacao_status text` (`pendente`/`analisando`/`sugerido`/`erro`) em `documentos`. Permite distinguir "ainda na fila" de "classificado".

**2. Edge function `classify-documento`**
- Input: `{ documento_id }`
- Baixa o arquivo do bucket `cedente-docs` (signed URL ou via service role)
- Para PDF: extrai texto das primeiras páginas (usar pdf parsing leve via fetch + biblioteca compatível com Deno, ou enviar PDF inteiro para Lovable AI que aceita anexos)
- Envia conteúdo + lista de categorias disponíveis ao **Lovable AI Gateway** (`google/gemini-3-flash-preview`) usando **tool calling** para garantir saída estruturada `{ categoria_id, confianca, motivo }`
- Atualiza `documentos.categoria_sugerida_id` e `classificacao_status='sugerido'`
- Trata erros 429/402 e marca `classificacao_status='erro'`

**3. Frontend — `CedenteDetail.tsx` (aba Documentos)**
- Substituir o seletor de categoria + botão único pelo novo componente `DocumentosUploadKanban`:
  - **Dropzone múltipla** usando input `multiple` + handlers nativos `onDragOver/onDrop` (sem libs novas)
  - Loop: faz upload de cada arquivo (status `enviando`), insere row em `documentos` sem `categoria_id`, dispara `supabase.functions.invoke("classify-documento", { documento_id })`
  - Cards arrastáveis com HTML5 drag-and-drop nativo (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)
  - Drop em uma categoria → `update documentos set categoria_id=..., categoria_sugerida_id=null` 
  - Botão "Aceitar sugestão" → mesma ação usando o id sugerido
- Lista existente (tabela com revisão/download/delete) permanece **abaixo** da área kanban, sem mudança.

**4. Realtime opcional (simples)**
- Após disparar o classify, fazer polling leve a cada 2s nos docs com status `analisando` até resolver, ou simplesmente recarregar quando a function retorna. Vou usar a segunda abordagem para manter simples.

### Custo / observações
- Cada arquivo gera 1 chamada à IA (~1-2 centavos de crédito Lovable AI). Erros de rate limit (429) e de crédito (402) viram toasts informando o usuário.
- Funciona bem para PDF com texto e imagens (Gemini é multimodal). PDFs 100% escaneados também funcionam pois o Gemini faz OCR nativo.
- Sem libs novas no frontend — uso HTML5 drag-and-drop nativo.
