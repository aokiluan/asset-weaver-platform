## Esteira mini-kanban no topo do cedente, espelhando o Pipeline (CRM)

Adicionar uma faixa horizontal compacta logo abaixo do cabeçalho do cedente, mostrando todas as etapas da esteira **lendo a mesma fonte de verdade do kanban grande de `/pipeline`** (`STAGE_ORDER`, `STAGE_LABEL`, `STAGE_COLORS`). A etapa atual fica destacada; anteriores aparecem como concluídas; futuras ficam apagadas. Apenas o usuário com permissão para movimentar a etapa atual consegue interagir; para os demais é puramente informativa.

### Parametrização única (fonte de verdade)

Hoje as etapas vivem em `src/lib/cedente-stages.ts` mas as cores estão duplicadas dentro de `Pipeline.tsx`. Vou centralizar tudo lá para que o mini-kanban e o kanban grande sempre fiquem em sincronia:

**Em `src/lib/cedente-stages.ts`** (acrescentar):
- `STAGE_COLORS: Record<CedenteStage, string>` — movido de `Pipeline.tsx`.
- `STAGE_PERMISSIONS: Record<CedenteStage, AppRole[]>` — quem pode **enviar a partir** desta etapa (matriz abaixo).
- Tipo `AppRole` já existe em `RoleGuard.tsx`; vou exportá-lo de um único lugar (`src/lib/roles.ts`) e reaproveitar em ambos.

`Pipeline.tsx` passa a importar `STAGE_COLORS` do mesmo módulo (sem mudança visual).

### Matriz de permissões por transição

| De → Para | Quem pode mover | Gate (já existente) |
|---|---|---|
| novo → cadastro | comercial (owner), gestor_comercial, admin | checklist do `EnviarAnaliseDialog` |
| cadastro → análise | analista_cadastro, gestor_comercial, admin | sem doc reprovado + obrigatórios aprovados |
| análise → comitê | analista_credito, gestor_credito, admin | parecer concluído (`hasParecer`) |
| comitê → formalização | comite, gestor_credito, gestor_risco, admin | decisão registrada (`comiteDecidido`) |
| formalização → ativo | financeiro, gestor_financeiro, admin | minuta assinada (`minutaAssinada`) |

Devolver/voltar continua só pelos botões "Devolver…" existentes — a esteira só **avança**, evitando cliques destrutivos acidentais.

### Layout (ASCII)

```text
 ●━━━━━━━●━━━━━━━○━━━━━━━○━━━━━━━○━━━━━━━○
 Novo    Cadastro  Análise   Comitê   Formaliz.  Ativo
 ✓        ●(atual)  ↑clicável  bloq.    bloq.     bloq.
```

- `✓` etapas concluídas — bolinha na cor da etapa, opacidade 50%.
- `●` etapa atual — bolinha cheia na cor da etapa + label em negrito.
- Próxima etapa: clicável **se** o usuário tem permissão **e** os gates estão atendidos.
  - Sem permissão → tooltip "Apenas [papel] pode avançar para [etapa]".
  - Faltam gates → tooltip lista as pendências.
- Demais etapas futuras: cinza fraco, sem cursor.
- Conector entre pontos colorido até a etapa atual; cinza depois.
- Altura total ~48px, sem fundo próprio, integrado ao card do cabeçalho.

### Implementação

**Novo componente** `src/components/cedentes/CedenteStageStepper.tsx`:
- Props: `stage: CedenteStage`, `gateInfo: { hasVisitReport, hasPleito, obrigatoriosFaltando, docsRejeitados, hasParecer, comiteDecidido, minutaAssinada }`, `isOwner: boolean`, `onAdvance(target: CedenteStage): void`.
- Calcula próxima etapa via `nextStage()` (já existe em `cedente-stages.ts`).
- Calcula gate via `evaluateGates()` (já existe).
- Calcula `canMove` cruzando `useAuth().hasRole` com `STAGE_PERMISSIONS[stage]` + `isOwner` para `novo`.
- Renderiza `<ol>` horizontal com `flex` + linha conectora via spans absolutos. Tooltips do shadcn.

**Integração em `CedenteDetail.tsx`**:
- Inserir o stepper no card do cabeçalho, abaixo do nome/CNPJ.
- Centralizar handlers das transições:
  - `novo → cadastro` → abre o `EnviarAnaliseDialog` existente.
  - `cadastro → análise` → reaproveita lógica de `RevisarCadastroActions.aprovar` (extrair função `aprovarCadastro` num util ou manter dentro do componente).
  - `análise → comitê`, `comitê → formalização`, `formalização → ativo` → diálogo simples de confirmação (`AlertDialog`) listando o gate atendido + `supabase.from("cedentes").update({ stage: <next> })` + toast + `load()`.
- Remover do header os botões redundantes "Enviar para análise" e "Aprovar cadastro" (a esteira passa a ser o ponto único de avanço). Mantemos apenas "Devolver ao comercial" no header quando `stage === 'cadastro'`.
- O `Badge` solto de stage no cabeçalho fica redundante e pode ser removido (a etapa atual já está clara na trilha).

**Refator em `Pipeline.tsx`**:
- Remover `STAGE_COLORS` local e importar de `@/lib/cedente-stages`.
- (Opcional, fora de escopo curto) usar `STAGE_PERMISSIONS` para bloquear drag-and-drop também no kanban grande quando o usuário não tem permissão para a transição. **Sugiro fazer junto** — fica realmente espelhado.

**Sem mudanças no banco**: as RLS já restringem `update` em `cedentes`. A UI apenas espelha quem realmente consegue executar o `UPDATE`.

### Visual / minimalismo

- Pontos: 10px de diâmetro; conector: 2px de altura.
- Cores via `STAGE_COLORS` (mesmas do pipeline grande), com opacidade reduzida para etapas concluídas/futuras.
- Sem ícones por etapa — só o ponto + label `text-xs`. Mantém a tela limpa.

### Fora de escopo

- Drag-and-drop dentro do mini-kanban (intencional: clique só na próxima etapa).
- Notificação ao próximo responsável.
- Mudança visual no `/pipeline` global além do refactor de cores e (opcional) bloqueio por permissão.
