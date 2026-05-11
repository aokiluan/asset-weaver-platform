
# Plano: Seção "Diretório" (dossiê por cedente)

## Objetivo

Criar uma seção `/diretorio` no sidebar que funciona como "pasta no computador" de cada cedente, consolidando, ao longo do tempo, **toda a documentação histórica** (cadastro, renovações, atas, pareceres, anexos livres) — sem interferir na fila operacional do perfil Cadastro.

## Resolvendo o conflito de uploads (decisão)

Hoje todo upload em `documentos` cai na fila de conciliação do Cadastro (porque tem `status='pendente'` + `categoria_id` obrigatória). Se o comercial/formalização anexar algo "extra" (foto, e-mail, ata externa), polui a fila.

**Solução:** criar uma categoria especial **"Outros / Anexos gerais"** com flags:
- `obrigatorio = false`
- novo campo `requer_conciliacao = false` em `documento_categorias`

Documentos nessa categoria:
- Entram normalmente em `documentos` (mesma tabela, mesma storage, mesmas RLS)
- São **filtrados fora** do Kanban de conciliação do Cadastro
- Já nascem com `status = 'aprovado'` (não precisam de revisão)
- Aparecem normalmente no Diretório, marcados visualmente como "Anexo livre"

Vantagem: zero migração de dados, zero duplicação de lógica. Só um filtro a mais no kanban e uma flag na categoria.

## Estrutura da seção Diretório

### Sidebar
Novo item no grupo "Operação", abaixo de "Cedentes":
- Label: **Diretório**
- Ícone: `FolderOpen` (Phosphor, weight thin)
- Roles: mesmas de `/cedentes` (visibilidade controlada via `can_view_cedente`)

### Tela `/diretorio` (lista de cedentes)
Tabela enxuta no padrão Nibo ultracompacto, com:
- Razão social / CNPJ / Stage atual
- Nº de documentos
- Última renovação cadastral (badge 🟢🟡🔴 reusando `computeRenovacao`)
- Última ata
- Botão "Abrir dossiê" → navega para `/diretorio/:cedenteId`

Filtros: busca por razão/CNPJ, filtro por stage, filtro por status de renovação.

### Tela `/diretorio/:cedenteId` (dossiê)
Layout com `<PageTabs>` no topo (4 abas):

```text
+------------------------------------------------------------+
| [Cedente XYZ - CNPJ ...] [stage] [renovação 🟡 vence em 12d]|
+------------------------------------------------------------+
| Documentos | Renovações | Atas de comitê | Pareceres       |
+------------------------------------------------------------+
```

**Aba 1 — Documentos (default)**
- Lista única consolidando TODOS os uploads de `documentos` daquele cedente
- Agrupada por categoria, ordenada por data desc
- Colunas: nome, categoria (badge), origem (Cadastro / Anexo livre), status (aprovado/pendente/recusado), data, quem subiu, ações (download/visualizar)
- Botão "Adicionar anexo livre" no topo → upload direto na categoria "Outros / Anexos gerais", sem entrar na fila

**Aba 2 — Renovações cadastrais**
- Timeline lendo `cedente_history` onde `evento = 'cadastro_revisado'`
- Mostra data, responsável, observação
- Linha do estado atual no topo (badge 🟢🟡🔴)

**Aba 3 — Atas de comitê**
- Lista de `committee_minutes` daquele cedente
- Colunas: nº comitê, data, decisão (aprovado/reprovado), valor, alçada
- Ação: baixar PDF (já existe `comite-ata-pdf.ts`)

**Aba 4 — Pareceres e relatórios**
- Duas sub-listas:
  - **Relatórios de crédito**: versões de `credit_report_versions` (data, versão, recomendação, autor)
  - **Pareceres comerciais (visita)**: versões de `cedente_visit_report_versions`
- Ação: baixar PDF (reusar `credit-report-pdf.ts` e `visit-report-pdf.ts`)

## Detalhes técnicos

### Migração (DB)

```sql
-- 1. Nova flag na tabela de categorias
ALTER TABLE public.documento_categorias
  ADD COLUMN requer_conciliacao boolean NOT NULL DEFAULT true;

-- 2. Cria categoria "Outros / Anexos gerais"
INSERT INTO public.documento_categorias (nome, descricao, obrigatorio, requer_conciliacao, ordem)
VALUES ('Outros / Anexos gerais',
        'Documentos complementares ao dossiê do cedente (não entram na fila de conciliação)',
        false, false, 999);
```

Sem mudança em `documentos`, sem nova tabela, sem mexer em RLS.

### Filtro no Kanban de conciliação (Cadastro)
Em `DocumentosUploadKanban.tsx` / `ConciliacaoDocumentosSheet.tsx`:
```ts
.eq('categoria.requer_conciliacao', true) // ou filtrar client-side
```

### Upload "anexo livre" no Diretório
Reutiliza o storage `cedente-docs` e a tabela `documentos`, forçando:
- `categoria_id` = id da categoria "Outros / Anexos gerais"
- `status = 'aprovado'`
- `classificacao_status = 'manual'`

### Rotas (App.tsx)
```tsx
<Route path="/diretorio" element={<Diretorio />} />
<Route path="/diretorio/:id" element={<DiretorioDetail />} />
```
RoleGuard com mesmas roles de `/cedentes`.

### Arquivos a criar/editar
**Novos:**
- `src/pages/Diretorio.tsx` (lista)
- `src/pages/DiretorioDetail.tsx` (dossiê com PageTabs)
- `src/components/diretorio/DiretorioDocumentosTab.tsx`
- `src/components/diretorio/DiretorioRenovacoesTab.tsx`
- `src/components/diretorio/DiretorioAtasTab.tsx`
- `src/components/diretorio/DiretorioParecaresTab.tsx`
- `src/components/diretorio/UploadAnexoLivreDialog.tsx`
- `supabase/migrations/<timestamp>_diretorio.sql`

**Editar:**
- `src/App.tsx` (rotas)
- `src/components/AppSidebar.tsx` (item "Diretório" no grupo Operação)
- `src/components/cedentes/DocumentosUploadKanban.tsx` (filtrar `requer_conciliacao = true`)
- `src/components/cedentes/ConciliacaoDocumentosSheet.tsx` (mesmo filtro)

## Fora de escopo desta v1
- Notificações (já decidido)
- Versionamento de documentos individuais (manter histórico simples por upload)
- Comparação visual entre versões de cadastro/renovação
- Busca full-text no conteúdo dos PDFs
- Compartilhamento externo do dossiê (link público)

## Próximos passos sugeridos (futuro)
- "Snapshot do dossiê" (PDF consolidado para auditoria/regulador)
- Marcação de documentos como "vigente" vs "histórico" automaticamente por categoria
