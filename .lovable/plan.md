## Padrão de renomeação dos documentos

Quando um documento for **categorizado** (manualmente ou pela IA), o `nome_arquivo` exibido e o `storage_path` no bucket serão renomeados para:

```
aaaa.mm.dd_<nome-da-categoria>_NN.<ext>
```

- `aaaa.mm.dd` — data em que o documento foi vinculado à categoria (data atual no momento da categorização).
- `<nome-da-categoria>` — nome da categoria com acentos removidos, espaços virando `-`, em minúsculas (ex.: "Contrato Social" → `contrato-social`).
- `NN` — sufixo sequencial por **categoria daquele cedente**, começando em `01`. Cada novo documento naquela mesma categoria recebe o próximo número (`02`, `03`, ...), preservando o histórico de revalidações.
- `.ext` — extensão original.

Exemplo:
```
2026.05.04_contrato-social_01.pdf
2026.08.12_contrato-social_02.pdf   ← revalidação posterior
2026.11.30_contrato-social_03.pdf
```

### Regras de comportamento

1. **Sequência por categoria + cedente**: `NN = (qtd de documentos já existentes naquela categoria daquele cedente) + 1`. O número nunca é reaproveitado; mesmo se um documento for excluído, o próximo continua incrementando.
2. **Quando renomear**:
   - Ao **categorizar pela primeira vez** (manual via drag/move, ou ao aceitar a sugestão da IA).
   - Ao **mover** um documento entre categorias (recebe novo número da categoria de destino; o número antigo da categoria de origem fica vago — não é reaproveitado).
   - Ao **descategorizar** (voltar para "sem categoria"): o arquivo volta para o nome original do upload, sem número.
3. **Documentos já existentes**: não serão renomeados retroativamente. Apenas movimentações futuras passam a seguir o novo padrão.
4. **Bandeja de entrada (sem categoria)**: arquivos recém-enviados continuam exibindo o nome original até serem categorizados.

### Implementação técnica

Arquivo: `src/components/cedentes/DocumentosUploadKanban.tsx`

1. Criar helper `slugifyCategoria(nome)`:
   - Remove acentos (`normalize("NFD").replace(/[\u0300-\u036f]/g, "")`)
   - Lowercase, troca não-alfanuméricos por `-`, colapsa `--`, trim de `-`.

2. Criar função `renameDocumentoToPattern(doc, categoriaId)`:
   - Busca a categoria pelo `id` em `categorias` (já carregadas no componente).
   - Conta documentos existentes daquele `cedente_id` + `categoria_id` na tabela `documentos` (com `.select("id", { count: "exact", head: true })`); o próximo `NN` = `count + 1`, formatado com `String(n).padStart(2, "0")`.
   - Monta `novoNome = ${aaaa}.${mm}.${dd}_${slug}_${NN}.${ext}` (ext extraída do `nome_arquivo` atual).
   - Monta `novoPath = ${cedente_id}/${Date.now()}-${rand}-${novoNome}` (mantém prefixo único para evitar colisão no bucket).
   - Faz `supabase.storage.from("cedente-docs").move(doc.storage_path, novoPath)`.
   - Em sucesso, retorna `{ nome_arquivo: novoNome, storage_path: novoPath }`; em falha, loga e retorna `null` (a categorização ainda procede com o nome antigo).

3. Modificar `moveManyTo(ids, categoriaId)` (linhas 257–267):
   - Se `categoriaId` for `null` (descategorizar): para cada doc, renomear de volta ao nome original. Como o nome original não está armazenado separadamente, adicionar coluna **`nome_arquivo_original`** na tabela `documentos` (ver migração abaixo) preenchida no upload; ao descategorizar, restaurar `nome_arquivo` para esse valor e renomear no storage.
   - Se `categoriaId` for uma categoria: para cada doc, chamar `renameDocumentoToPattern` e fazer `update` individual em `documentos` setando `categoria_id`, `categoria_sugerida_id: null`, `nome_arquivo`, `storage_path`.
   - Trocar o `update` em massa por um loop (necessário porque cada doc terá um `NN` diferente).

4. No `uploadFiles` (linhas 193–242): salvar `nome_arquivo_original = file.name` no `insert`.

5. A IA (`classify-documento` edge function) apenas sugere — não renomeia. A renomeação ocorre quando o usuário **aceita** a sugestão (que internamente chama `moveTo`).

### Migração de banco

```sql
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS nome_arquivo_original text;

-- backfill: para registros existentes, considerar o nome atual como o original
UPDATE public.documentos
  SET nome_arquivo_original = nome_arquivo
  WHERE nome_arquivo_original IS NULL;
```

### Observações

- O `storage.move` mantém o conteúdo intacto e atualiza apenas a chave; signed URLs antigos param de funcionar, mas o componente sempre gera novo signed URL no download.
- Como o `storage_path` mantém o prefixo `${Date.now()}-${rand}-`, não há risco de colisão mesmo que dois documentos acabem com o mesmo `aaaa.mm.dd_categoria_NN`.
- O nome **exibido** ao usuário (`nome_arquivo`) é o nome limpo no padrão; o `storage_path` guarda o prefixo técnico.
