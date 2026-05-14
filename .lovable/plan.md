## Objetivo

Hoje o diálogo "Adicionar anexo livre" (`UploadAnexoLivreDialog` em `src/pages/DiretorioDetail.tsx`) força todos os arquivos para a categoria fixa `catLivre` (a única com `requer_conciliacao = false`). O upload já passa por `buildDocumentoFileName`, mas como a categoria é sempre a mesma, todos viram `..._outros_..._vNN.ext`.

Você quer que, ao adicionar anexo livre:
1. Cada arquivo seja **classificado em uma categoria do projeto** antes do envio.
2. Cada arquivo seja **renomeado seguindo o padrão global** (`aaaa.mm.dd_categoria_cedente_vNN.ext`) usando a categoria escolhida.

## Mudanças (apenas no diálogo)

### 1. Estado por arquivo
Trocar `files: File[]` por `items: { file: File; categoriaId: string }[]`.
Ao selecionar arquivos no input, cada item começa com `categoriaId = catLivre.id` (default = "Outros / Anexo livre"), permitindo classificar logo em seguida.

### 2. UI: lista com seletor de categoria
Em vez da `<ul>` informativa, renderizar uma lista compacta (tier FORM, h-7) onde cada linha tem:

```
[ícone] nome.pdf · 12.4 KB        [ Select categoria ▼ ]   [x]
```

- `Select` (shadcn) populado com `categorias` (todas as categorias ativas, não só `catLivre`).
- Botão `x` (ghost h-6 w-6) para remover o arquivo da lista.
- Label do bloco: "Arquivos e classificação".
- Texto auxiliar: "Arquivos classificados em categorias do Cadastro entram normalmente no dossiê. Use *Outros / Anexo livre* para itens sem categoria."

### 3. Validação
Botão **Enviar** desabilitado se:
- `items.length === 0`, ou
- algum `item.categoriaId` estiver vazio, ou
- `busy === true`.

### 4. Upload (handleUpload)
- Calcular `nextByCategoria: Record<string, number>` fazendo **um** `select count` agrupado por `categoria_id` para todas as categorias usadas no batch (ou um count por categoria distinta, em paralelo).
- Para cada item:
  - `cat = categorias.find(c => c.id === item.categoriaId)`
  - `versao = nextByCategoria[cat.id]++`
  - `novoNome = buildDocumentoFileName({ originalName: file.name, categoria: cat.nome, cedente: cedente.razao_social, versao })`
  - Insert em `documentos` com `categoria_id = cat.id`.
  - Manter `status: "aprovado"` e `classificacao_status: "sugerido"` (igual ao atual).
- Toast resume: `N anexo(s) adicionado(s) ao dossiê`.

### 5. Props/integração
- `UploadAnexoLivreDialog` passa a receber `categorias: Categoria[]` (além do `catLivre`, que vira apenas o default).
- Atualizar a chamada em `DiretorioDetail` (linha 1060) para passar `categorias={categorias}`.

## Padrão visual (Nibo ultracompacto)

- Dialog `max-w-md` mantido.
- Form tier: `space-y-2.5`, labels `text-[11px] text-muted-foreground`, inputs/selects `h-7 text-[12px]`.
- Lista de arquivos: cada linha `flex items-center gap-2 text-[12px]`, nome truncado, tamanho `text-[10px] text-muted-foreground`.
- Footer mantém `Cancelar` ghost + `Enviar` primário.

## Fora do escopo

- Sem mudanças em schema, RLS, storage, ou no nome do botão "Adicionar anexo livre".
- Sem mexer em `documento-filename.ts` — o padrão já está correto.
- Sem mudar o fluxo de conciliação do Cadastro.
