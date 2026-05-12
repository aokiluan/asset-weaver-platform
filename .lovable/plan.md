## Melhorias no Diretório (Dossiê) — UX tipo "pasta de arquivos"

Quatro frentes na tela `/diretorio/:id` (aba **Documentos**) + uma normalização global de nomenclatura de arquivos.

---

### 1. Ordenação por coluna (à esquerda de "Arquivo")

- Cada `<th>` da tabela vira clicável (Arquivo, Categoria, Origem, Status, Tamanho, Data, Por).
- Ao clicar: alterna `asc` / `desc` e mostra ícone `ChevronUp` / `ChevronDown` ao lado do label.
- Ao lado de **Arquivo** especificamente, um botão extra com ícone `ArrowUpDown` que abre menu rápido com presets:
  - Nome (A→Z / Z→A)
  - Data (mais recente / mais antigo) — **default**
  - Tamanho (maior / menor)
  - Categoria (A→Z)
- Estado guardado em `useState` local (sem persistir).

### 2. Filtros + colunas visíveis (canto direito)

Dois botões à direita do "Adicionar anexo livre":

- **Filtrar** (`Filter` icon) → `Popover` com:
  - Categoria (multi-select usando `Command`)
  - Origem (Cadastro / Anexo livre)
  - Status (aprovado / pendente / reprovado)
  - Período (data de upload — `from / to`)
  - Botão "Limpar filtros"
  - Badge no botão indicando nº de filtros ativos
- **Colunas** (`Columns3` icon) → `DropdownMenu` com checkboxes para mostrar/ocultar cada coluna. Default: todas visíveis exceto "Por" em viewports estreitos. Preferência salva em `localStorage` (`diretorio.colunas`).

### 3. Renomeação global de arquivos (padrão `aaaa.mm.dd_categoria_cedenteAbreviado_versao01`)

**Padrão final**: `2026.05.12_contrato-social_abc-manut_v01.pdf`

Regras de slug:
- `categoria`: slug do `documento_categorias.nome` (lowercase, sem acentos, espaços→`-`, máx 30 chars).
- `cedenteAbreviado`: primeiras 2 palavras significativas do `razao_social` (ignora LTDA/SA/ME/EIRELI), slugificadas, máx 18 chars.
- `versao`: `v` + `NN` zero-padded. Calculada por `(cedente_id, categoria_id)` — próximo número = `count + 1` no momento do upload. Para anexos livres, conta dentro de "outros".
- Extensão original preservada.

**Onde aplicar (uploads novos)** — gerar nome com helper único `buildDocumentoFileName()` em `src/lib/documento-filename.ts`:
- `src/components/cedentes/DocumentosUploadKanban.tsx` (uploads do Cadastro)
- `src/pages/DiretorioDetail.tsx` (anexo livre)
- `src/components/credito/DocumentSnipDialog.tsx` (recortes)

O `nome_arquivo` salvo no banco passa a ser o nome padronizado (`storage_path` continua incluindo timestamp/uuid para evitar colisão).

**Renomeação retroativa** (arquivos já existentes):
- Migration adicional: backfill SQL atualiza apenas `documentos.nome_arquivo` (não mexe em `storage_path` para não quebrar links). Calcula o novo nome via função SQL usando `cedentes.razao_social` + `documento_categorias.nome` + ROW_NUMBER por (cedente, categoria) ordenado por `created_at`.
- Mantém uma coluna nova `nome_arquivo_original` (texto, nullable) preservando o nome antigo, exibida como tooltip ao passar o mouse.

### 4. UX de "pasta de arquivos do computador"

Mudanças na aba **Documentos** para se aproximar do Finder/Explorer:

**a) Toggle de visualização** (canto superior direito da aba): `LayoutList` (lista — atual) | `LayoutGrid` (ícones grandes).
- **Grid**: cards com ícone grande do tipo de arquivo (PDF/IMG/DOC), nome em 2 linhas, badge categoria, data pequena.
- **Lista**: tabela atual já existente.

**b) Agrupamento por categoria (toggle "Agrupar por")** com seções colapsáveis:
- Cabeçalho da seção mostra nome da categoria, contagem e ícone `Folder`.
- Default: agrupado. Toggle "Sem grupos" mostra tudo achatado.

**c) Ações por arquivo** (substitui o botão único de download):
- Linha inteira clicável → preview rápido em `Sheet` lateral (PDF inline via signed URL, imagem inline, outros mostram metadata + botão baixar).
- Menu de contexto (`DropdownMenu` com botão `MoreVertical`): Abrir, Baixar, Copiar nome, Copiar link, Mover para categoria…, Renomear, Excluir (apenas anexos livres do próprio usuário).
- Suporte a `Cmd/Ctrl+clique` para multi-seleção; barra inferior aparece com ações em lote (baixar como ZIP, mover, excluir).

**d) Drag & drop direto na área da tabela**:
- Soltar arquivos em qualquer ponto da aba abre o diálogo "Adicionar anexo livre" pré-preenchido com o(s) arquivo(s).
- Indicador visual de overlay tracejado durante o drag.

**e) Breadcrumb tipo path** no topo da aba: `Diretório / ABC Manutenção / Documentos` (cada nível navegável).

**f) Atalhos de teclado** (quando a aba está focada):
- `/` foca busca
- `Esc` limpa seleção
- `Cmd/Ctrl+A` seleciona todos visíveis
- `Enter` abre o item focado

**g) Busca rápida no topo da aba** (`Input` com ícone `Search`) — filtra por nome do arquivo em tempo real (combina com filtros do item 2).

---

### Detalhes técnicos

**Arquivos novos**:
- `src/lib/documento-filename.ts` — `slugify()`, `abreviarRazaoSocial()`, `buildDocumentoFileName({ cedente, categoria, versao, ext })`.
- `src/components/diretorio/DocumentosToolbar.tsx` — busca + filtros + colunas + view toggle + agrupar.
- `src/components/diretorio/DocumentosTable.tsx` — tabela com sort headers + multi-seleção.
- `src/components/diretorio/DocumentosGrid.tsx` — vista em grid.
- `src/components/diretorio/DocumentoPreviewSheet.tsx` — preview lateral.
- `src/components/diretorio/DocumentoRowMenu.tsx` — menu de contexto.

**Arquivos editados**:
- `src/pages/DiretorioDetail.tsx` — usa novos componentes, mantém data fetching.
- `src/components/cedentes/DocumentosUploadKanban.tsx` e `src/components/credito/DocumentSnipDialog.tsx` — usam `buildDocumentoFileName()` ao salvar.

**Migrations**:
1. `ALTER TABLE documentos ADD COLUMN nome_arquivo_original text` (nullable).
2. Backfill: copia `nome_arquivo` → `nome_arquivo_original` e gera novo `nome_arquivo` padronizado.

**Storage**: `storage_path` permanece com timestamp/uuid (não renomeamos os blobs no bucket — só o display name no banco). Isso evita signed URLs quebrados e mantém RLS.

**Segurança**: nenhum impacto — todas as operações continuam respeitando as policies atuais de `documentos` e `cedente-docs`.

**Padrão visual**: tudo segue o tier ultracompacto Nibo (h-7, text-[12px], `space-y-3`).

---

### Fora de escopo (v1)

- Renomeação retroativa dos blobs no bucket de storage (mantemos paths originais).
- Versionamento real de documentos (substituir/comparar versões) — só o sufixo `vNN` no nome.
- Compartilhamento externo / links públicos.
- Download em ZIP no servidor (a v1 baixa um a um; ZIP fica para depois).
