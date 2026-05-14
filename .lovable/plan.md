
## Objetivo

1. **Operação → Pipeline de Cedentes**: alinhar visual e UX ao CRM de prospecção (`InvestidoresCRM`), que já é o padrão Nibo ultracompacto consolidado.
2. **Pente fino geral**: remover descrições/subtítulos verbosos espalhados pelos módulos anteriores (Cedentes, Diretório, Financeiro, Comitê, Formalização, BI, Gestão, Admin, Leads), aplicando o padrão "clean e objetivo" do CRM novo.

Nada de mudanças de regra de negócio — só apresentação.

---

## Parte 1 — Pipeline de Cedentes (`src/pages/Pipeline.tsx`)

Hoje o Pipeline já é compacto, mas é "cru" comparado ao CRM de investidores. Vou trazer os mesmos componentes/padrões:

- **Header (PageTabs)**: remover a `description` "Arraste os cards entre estágios. Duplo-clique abre o cedente." (poluição visual, padrão dos demais módulos será sem descrição).
- **Faixa de métricas no topo** (mesmo `MetricCard` do CRM de investidores, p-2.5, label 10px uppercase, valor 16px):
  - Total de cedentes
  - Em negociação (não-terminais)
  - Faturamento total na esteira (soma `faturamento_medio`)
  - Ticket médio
- **Filtros** em linha logo abaixo das métricas, no mesmo estilo dos chips do CRM (Button ghost/secondary h-7 text-[12px]): por setor (chips dinâmicos a partir dos cedentes carregados) + alternância Kanban/Lista (`ToggleGroup` h-7 com ícones `LayoutGrid`/`ListIcon`).
- **Colunas Kanban**: trocar pela mesma estrutura de `KanbanColumn` do CRM:
  - Largura `w-[220px]`, header fora do card (label + Badge h-4 px-1.5 com contagem + total à direita).
  - Drop area `rounded-md p-1 min-h-[80px]`, `ring-2 ring-primary` em hover, terminal com borda tracejada e `bg-muted/20`.
  - Cards `p-2.5 rounded-md border bg-card` com nome 12px, secundárias 10px, ticket à direita.
- **Vista Lista**: implementar `ListView` espelhando o do CRM (Table com colunas: Razão social, CNPJ, Setor, Faturamento, Estágio-badge, ações Ver/Editar). Mesmas alturas (`h-7`) e tipografia.
- **Confirmação de movimentação**: reaproveitar o mesmo padrão do `ConfirmStageMoveDialog` (criar `ConfirmCedenteStageMoveDialog` com a mesma estética) ao arrastar entre estágios — atualmente o Pipeline move sem confirmação.
- **DragOverlay**: idêntico ao do CRM (largura 220px, sombra elegante).
- Manter toda a lógica atual de `supabase.from("cedentes").update({stage})`, navegação, etc.

Resultado: Pipeline e CRM de prospecção visualmente indistinguíveis em estrutura.

---

## Parte 2 — Pente fino nos módulos anteriores

### 2.1 Remover descrições do `PageTabs` em todas as páginas

A `description` no `PageTabs` é o maior ofensor (texto miúdo cinza embaixo do título sem agregar valor para quem já conhece o módulo). Remover de:

- `src/pages/Pipeline.tsx`
- `src/pages/Investidores.tsx`
- `src/pages/Diretorio.tsx`
- `src/pages/BI.tsx`
- `src/pages/gestao/GestaoDiario.tsx`
- `src/pages/gestao/GestaoComercial.tsx`
- `src/pages/gestao/GestaoFinanceiro.tsx`
- `src/pages/gestao/GestaoOperacional.tsx`

Manter `description` apenas onde é dado dinâmico útil:
- `src/pages/InvestidorDetail.tsx` (nome fantasia)
- `src/pages/DiretorioDetail.tsx` (razão social do cedente)

### 2.2 Páginas Admin — remover subtítulos `<p className="text-muted-foreground">…</p>`

Cada tela admin tem um título + parágrafo descritivo. Vou remover o `<p>` e manter só o `<h1>`:

- `src/pages/admin/AdminPipeline.tsx` ("Configure as colunas do funil comercial.")
- `src/pages/admin/AdminCategorias.tsx` ("Tipos de documento aceitos…")
- `src/pages/admin/AdminAlcadas.tsx` ("Faixas de valor…")
- `src/pages/admin/AdminEquipes.tsx`
- `src/pages/admin/AdminDatasets.tsx`, `AdminPermissoes.tsx`, `AdminRelatorios.tsx`, `AdminDashboardWidgets.tsx` — verificar e remover o subtítulo onde existir.

### 2.3 Demais subtítulos avulsos

- `src/pages/Leads.tsx`: remover "Cedentes e investidores no pipeline comercial." (linha 110).
- `src/pages/Index.tsx`: revisar bloco "Dashboard Executivo" — checar se há subtítulo redundante para remover.

### 2.4 Padronização leve de títulos

Onde o título já está em `text-[20px] font-medium tracking-tight`, manter (já é Nibo). Apenas:

- `src/pages/Formalizacao.tsx` (linha 291) e `src/pages/Comite.tsx` (linha 126) usam `text-[18px]` — alinhar para `text-[20px] font-medium tracking-tight` para uniformidade com o restante.
- `src/pages/NotFound.tsx`: `text-xl` → `text-[14px] text-muted-foreground` (padrão Nibo).

### 2.5 Atualizar memória do projeto

Adicionar à `mem://index.md` em **Core**:
> Páginas: `<PageTabs>` SEM `description`, exceto quando o subtítulo for dado dinâmico (nome do registro). Nunca usar `<p className="text-muted-foreground">` como subtítulo decorativo abaixo do `<h1>`.

---

## Fora de escopo

- Não mudar lógica de drag-and-drop, queries, RLS ou endpoints.
- Não mexer em wizard de boleta, geração de PDFs ou edge functions.
- Não tocar em componentes de detalhe que já estão Nibo (cards de form/view internos).

## Detalhes técnicos

- Os componentes `MetricCard`, `KanbanColumn` e `ListView` do `InvestidoresCRM.tsx` serão **replicados** (não extraídos para módulo compartilhado nesta passada) dentro de `Pipeline.tsx` para manter o blast radius pequeno. Extração para `src/components/crm/*` pode virar refactor futuro se você quiser.
- O `ConfirmStageMoveDialog` existente é específico de `InvestorStage`. Vou criar um irmão `ConfirmCedenteStageMoveDialog` em `src/components/cedentes/`.
- Toda alteração textual usa apenas tokens semânticos já existentes — sem novas variáveis CSS.
