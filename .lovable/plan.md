# Reestruturação da navegação — módulo Operação

Objetivo: reorganizar apenas a navegação e a localização de telas. Nenhuma lógica de dados, schema, RLS, permissões ou regras de workflow será alterada. Todas as páginas, componentes, queries e edge functions hoje existentes continuam intactos — apenas mudam de "ponto de entrada" no menu/URL.

## 1. Sidebar — estado final

Grupo **OPERAÇÃO** (`src/components/AppSidebar.tsx`):

```
OPERAÇÃO
  Pipeline de Cedentes   → /pipeline
  Cedentes               → /cedentes        (hub unificado)
  Esteira de Crédito     → /esteira         (novo)
  Comitê                 → /comite
  Formalização           → /formalizacao
```

Grupo **DIRETÓRIO** passa a conter apenas:

```
DIRETÓRIO
  Pasta de Investidores  → /diretorio/investidores
```

(O item "Pasta de Cedentes" some daqui — seu conteúdo é absorvido pelo hub Cedentes.)

## 2. Cedentes — hub central unificado

A página `/cedentes` (`src/pages/Cedentes.tsx`) passa a ser o hub central do cedente, fundindo:

- a tela atual de Cedentes (lista + painel resumo + KPIs);
- o conteúdo da atual `/diretorio` — renovação, contagem de documentos, última ata, filtros por stage/renovação (`src/pages/Diretorio.tsx`);
- o acesso aos documentos do cedente (atual `/diretorio/:id`, `src/pages/DiretorioDetail.tsx`) — agora aberto **a partir do próprio registro do cedente**, dentro do hub, e não mais por item separado de navegação.

Forma proposta no hub:
- Coluna esquerda: lista de cedentes (já existe), com filtros adicionais herdados do diretório (stage e renovação como chips).
- Coluna direita (painel do cedente selecionado): além do resumo atual, ganha um bloco/aba "Documentos" que renderiza o conteúdo hoje em `DiretorioDetail` (visão de pasta: documentos por categoria, renovação, atas, etc.). O componente é reaproveitado e embutido — a rota `/diretorio/:id` deixa de ser usada como destino primário.

Botões do painel:
- "Abrir cadastro completo" passa a navegar para `/esteira/:id` (ver item 3).
- "Histórico" idem (`/esteira/:id?tab=historico`).

## 3. Esteira de Crédito — nova página

Nova rota `/esteira` e `/esteira/:id` (`src/pages/Esteira.tsx` + `src/pages/EsteiraDetail.tsx`):

- `/esteira` (lista): visão de fila/esteira dos cedentes em fluxo (kanban/tabela simples por stage). Pode reusar o mesmo data-fetch atual de Cedentes filtrando os stages do workflow (cadastro, análise, comitê, formalização). Sem nova lógica — apenas um agrupamento visual já disponível.
- `/esteira/:id`: **absorve integralmente o conteúdo de `CedenteDetail`** (atual `src/pages/CedenteDetail.tsx`, hoje acessado pelo botão "Abrir cadastro completo"). Reaproveita o componente sem alterar tabs, gates, stepper, ações de avanço, parecer, comitê, formalização ou histórico.

Implementação enxuta: renomear `CedenteDetail` para `EsteiraDetail` (ou criar wrapper que reexporta), e criar `Esteira.tsx` listando cedentes em workflow.

## 4. Rotas e redirects (`src/App.tsx`)

Novas/alteradas:
- `/esteira` → `Esteira` (novo)
- `/esteira/:id` → `EsteiraDetail` (conteúdo do antigo `CedenteDetail`)
- `/cedentes/:id` → **redirect** para `/esteira/:id` (compatibilidade com links existentes; "Abrir cadastro completo")
- `/diretorio` → **redirect** para `/cedentes` (Pasta de Cedentes virou parte do hub)
- `/diretorio/:id` → **redirect** para `/cedentes` (acesso a docs agora dentro do painel do cedente)

Mantidas sem alteração:
- `/pipeline`, `/cedentes/novo`, `/cedentes/:id/editar`, `/comite`, `/formalizacao`
- `/diretorio/investidores`, `/diretorio/investidores/:id`

## 5. Ajustes pontuais de links internos

Procurar e atualizar referências a `/diretorio/:id` e `/cedentes/:id` em componentes onde fizer sentido apontar diretamente para `/esteira/:id` (ex.: `CedenteQuickViewDialog`, kanban de pipeline, breadcrumbs em `CedenteDetail`/`EsteiraDetail`). Onde houver dúvida, manter `/cedentes/:id` — o redirect garante o destino certo.

## Detalhes técnicos

- Arquivos a editar: `src/components/AppSidebar.tsx`, `src/App.tsx`, `src/pages/Cedentes.tsx`.
- Arquivos a criar: `src/pages/Esteira.tsx`, `src/pages/EsteiraDetail.tsx` (este pode ser apenas `export { default } from "./CedenteDetail"` para zero risco; ou renomear o arquivo).
- Arquivo a embutir como subcomponente do hub Cedentes: extrair o "miolo" de `src/pages/DiretorioDetail.tsx` para um componente reutilizável (`src/components/cedentes/CedenteDocumentosPanel.tsx`) consumido pelo painel direito de `Cedentes.tsx`. A página `DiretorioDetail` permanece no repositório apenas como arquivo legado até confirmação, mas deixa de ser rota ativa.
- Nada muda em: schemas Supabase, RLS, hooks (`useAuth`, `useModulePermissions`), `RoleGuard`, edge functions, `cedente-stages.ts`, `documento-filename.ts`, dialogs de upload, stepper, gates de avanço.
- `useModulePermissions`: o `moduleKey` continua `operacao` para todos os itens novos do grupo; `Pasta de Investidores` continua sob `diretorio`.

## Fora de escopo

- Alterar workflow de stages, gates, RLS ou qualquer regra de negócio.
- Redesenhar `CedenteDetail`/Esteira (apenas muda de nome/rota).
- Remover fisicamente arquivos legados (`Diretorio.tsx`, `DiretorioDetail.tsx`) — ficam órfãos das rotas, podem ser limpos numa passada futura.
