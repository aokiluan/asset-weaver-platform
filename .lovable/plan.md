## Objetivo

Compactar o diálogo "Adicionar anexo livre" e trocar o campo "Observação (opcional)" (textarea) por um campo "Descrição" (input curto) **por arquivo**, que será incorporado ao nome padronizado do arquivo no upload.

## Mudanças em `src/pages/DiretorioDetail.tsx` (apenas no `UploadAnexoLivreDialog`)

### 1. Header mais enxuto
- `DialogTitle`: manter texto, reduzir para `text-[13px]`.
- `DialogDescription`: encurtar para uma linha só, sem o `<code>` cheio:
  > "Classifique e descreva cada arquivo. Os nomes seguem o padrão do projeto."
  Tamanho `text-[11px] leading-tight`.
- `DialogHeader`: `space-y-0.5` para colar título e descrição.

### 2. Estado por arquivo passa a incluir descrição
- Trocar `items: { file; categoriaId }[]` por `items: { file; categoriaId; descricao: string }[]`.
- Remover `obs` e o textarea inteiro.
- `addFiles` inicia `descricao: ""`.
- Novo helper `setDescricaoAt(i, value)`.

### 3. UI da lista de arquivos (compacta, 2 linhas por item)
Cada `<li>` passa a ter duas linhas internas:

```
[ nome.pdf · 12.4 KB ]                          [ Categoria ▼ ]   [x]
[ Input "Descrição (ex.: contrato aditivo)"  maxLength=40 ]
```

- Linha 1: nome (truncado, `text-[12px]`) + tamanho (`text-[10px]`) à esquerda; `Select` h-7 w-[150px] + botão remover à direita.
- Linha 2: `<Input>` h-7 `text-[11px]` `placeholder="Descrição (curta) — usada no nome do arquivo"` `maxLength={40}`.
- Texto auxiliar abaixo da lista vira uma linha só: "Use Outros / Anexo livre p/ itens sem categoria."

### 4. Validação
`canSubmit` exige também `items.every(it => it.descricao.trim().length > 0)`.

### 5. Renomeação usa a descrição
Padrão final: `aaaa.mm.dd_categoria_cedente_descricao_vNN.ext`.

- Adicionar `descricao` (opcional) em `BuildNameInput` e em `buildDocumentoFileName` (`src/lib/documento-filename.ts`):
  - Se vier `descricao`, slugificar (`slugify(desc, 24)`) e inserir entre `cedente` e `vNN`.
  - Se vazio/undefined, manter o padrão atual (não quebra outros usos).
- No `handleUpload`, passar `descricao: it.descricao` para `buildDocumentoFileName`.
- `nome_arquivo_original` continua = `file.name`.
- `observacoes` no insert passa a guardar a `descricao` (mesma string), assim a busca/listagem ainda mostra o texto.

### 6. Espaçamento Nibo
- `space-y-2` no corpo (em vez de `2.5`).
- Lista `space-y-1`, cada `<li>` `px-2 py-1.5 space-y-1`.

## Fora do escopo

- Sem mudar schema, RLS, storage ou regra de versionamento.
- Sem alterar outros lugares que chamam `buildDocumentoFileName` (a nova prop é opcional).
- Sem mexer no botão de abrir o diálogo nem no fluxo pós-upload.
