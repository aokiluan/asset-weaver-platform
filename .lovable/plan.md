## Objetivo

Simplificar o diálogo "Adicionar anexo livre": remover o seletor de categoria por arquivo (todos vão direto para **Outros / Anexo livre**) e manter o campo **Descrição** sempre visível em cada item — a descrição continua sendo usada no nome padronizado.

## Mudanças (apenas em `UploadAnexoLivreDialog`, `src/pages/DiretorioDetail.tsx`)

### 1. Estado por arquivo
- Trocar `items: { file; categoriaId; descricao }[]` por `items: { file; descricao }[]`.
- Remover `setCategoriaAt` e `defaultCatId`.
- Remover prop `categorias` da assinatura (manter apenas `catLivre`).
- Atualizar a chamada do diálogo (linha ~1061) removendo `categorias={categorias}`.

### 2. UI compacta — uma linha por arquivo
Cada `<li>` (`px-2 py-1.5 space-y-1`) tem:

```
[ nome.pdf · 12.4 KB ]                                          [x]
[ Input "Descrição (curta) — usada no nome do arquivo"  maxLength=40 ]
```

- Sem `Select` de categoria.
- Botão `x` ghost h-6 w-6 alinhado à direita da linha 1.
- `Input` da descrição sempre visível (linha 2), `h-7 text-[11px]`.
- Texto de ajuda abaixo da lista: remover (não faz mais sentido falar de "Outros / Anexo livre" se é o único destino).

### 3. Validação
`canSubmit = items.length > 0 && items.every(it => it.descricao.trim().length > 0) && !busy && !!userId`.

### 4. Upload
- Sem cálculo `nextByCat` por categoria — apenas uma contagem na categoria `catLivre`.
- Se `!catLivre`, exibir toast de erro e abortar.
- Para cada item: `versao = next++`, `categoria_id = catLivre.id`, `categoria = catLivre.nome` no `buildDocumentoFileName({ ..., descricao: it.descricao.trim() })`.
- `observacoes` recebe a descrição.

### 5. Header (mantido como está)
Já está compacto (`text-[13px]` título, `text-[11px]` descrição).

## Fora do escopo

- Sem mexer em `documento-filename.ts` (já aceita `descricao` opcional).
- Sem mudanças em schema/RLS/storage.
- Outros chamadores de `buildDocumentoFileName` permanecem inalterados.
