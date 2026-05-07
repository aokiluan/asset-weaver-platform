## Objetivo

Consolidar o padrão visual "Nibo ultracompacto" como **regra oficial do projeto**, sem tocar em nenhuma lógica/funcionalidade. Apenas tipografia, espaçamento, densidade e tokens visuais.

O trabalho tem 3 camadas: (1) memória, (2) parametrização nos primitivos, (3) auditoria + sugestões para o resto da aplicação.

---

## Camada 1 — Memória do projeto (regra automática)

Criar `mem://design/nibo-compact` documentando o padrão. A partir desse momento, qualquer tela/componente novo já nasce no padrão sem você precisar repetir.

Conteúdo da memória (resumo):

- **Tipografia**: base `12px`; títulos de página `20px medium`; tabs `14px`; labels `xs`; microcopy `11px muted`. Sempre Inter. Nunca serif.
- **Cores**: brand `#0080FF`, foreground `#232E3D`, muted `#6B7785`, border `#E1E6EC`, surface secundária `#EEF2F6`, accent `#EAF4FF`.
- **Densidade**: botão `h-7` default, input `h-7`, ícones `size-3.5`, raio `0.375rem`, sombra quase nula.
- **Cards**: padding interno `p-4` (não `p-6`), header `p-4 pb-2`, título `text-[14px] font-semibold`.
- **Form**: `space-y-0.5` entre label/input, `space-y-3` entre campos, `space-y-4` entre seções.
- **Layout de página**: sempre `PageTabs` no topo + container `max-w-7xl`.
- **Footer de form**: `flex items-center justify-between gap-3 flex-wrap` com `DraftIndicator` + ações.

Adicionar referência no `mem://index.md` (Core).

---

## Camada 2 — Parametrizar primitivos (defaults compactos)

Ajustar **apenas estilos default** dos componentes shadcn que hoje estão "grandes demais" para o padrão. Nenhuma API quebra; tudo continua aceitando `className` para override pontual.

| Componente | Hoje | Novo default |
|---|---|---|
| `CardHeader` | `p-6 space-y-1.5` | `p-4 pb-2 space-y-1` |
| `CardTitle` | `text-2xl font-semibold` | `text-[14px] font-semibold tracking-tight` |
| `CardDescription` | `text-sm` | `text-[11px]` |
| `CardContent` | `p-6 pt-0` | `p-4 pt-0` |
| `CardFooter` | `p-6 pt-0` | `p-4 pt-0` |
| `FormItem` | `space-y-0.5` | mantém (já compacto) |
| `Separator` em forms | espessura padrão | mantém, mas com `my-3` recomendado |

Efeito: **todas as telas existentes ficam automaticamente mais densas**, sem refactor manual e sem mudar comportamento.

Casos onde algum card precisa de respiro maior (ex: hero de dashboard) podem usar `className="p-6"` pontualmente.

---

## Camada 3 — Auditoria visual de todo o projeto

Após aplicar Camadas 1 e 2, faço uma varredura por área e entrego um **relatório de sugestões de ajuste visual** (sem aplicar ainda — você decide o que mexer). Cobertura:

**Formulários**
- `CreditReportForm`, `CedenteVisitReportForm`, `CedenteFormDialog`, `CedenteNovoSheet`, `LeadFormDialog`, `SocioFormCard`, `EnviarAnaliseDialog`
- Conferir: tamanhos de título, padding de cards internos, gaps entre seções, footers padronizados

**Listagens / tabelas**
- `Pipeline`, `Leads`, `Cedentes`, `Formalizacao`, `Financeiro`, `Comite`
- Conferir: altura de linha, tamanho de fonte na tabela, padding de células, badges, headers

**Dashboards**
- `BI`, `BIIndicadores`, `GestaoComercial`, `GestaoDiario`, `GestaoFinanceiro`, `GestaoOperacional`, `Index`
- Conferir: KPIs, padding de widgets, títulos, escala de gráficos

**Admin**
- `AdminUsuarios`, `AdminAlcadas`, `AdminCategorias`, `AdminDatasets`, `AdminEquipes`, `AdminPipeline`, `AdminRelatorios`, `AdminDashboardWidgets`
- Conferir: forms de configuração e tabelas

**Cedente Detail (kanban / tabs internos)**
- `CedenteDetail`, `DocumentosUploadKanban`, `ConciliacaoDocumentosSheet`, `CedenteRepresentantesTab`, `CedenteStageStepper`, `ComiteGameSession`, `VoteBriefing`, `ReadingChecklist`

Para cada área entrego: arquivo, ponto desviado, mudança sugerida (1 linha cada). Você aprova lote a lote.

---

## Garantias

- **Zero mudança funcional**: nada de handlers, queries, schemas, rotas, validações, lógica de salvamento. Só classes Tailwind, tokens CSS e defaults de componente.
- **Reversível**: mudanças são em primitivos isolados; rollback fácil.
- **Override sempre disponível**: telas que precisem de exceção continuam podendo passar `className`.

---

## Detalhes técnicos

Arquivos editados na Camada 2:
- `src/components/ui/card.tsx` — defaults de header/title/description/content/footer
- `mem://design/nibo-compact` — novo arquivo de memória
- `mem://index.md` — adicionar regra core e referência

Sem mudanças em: `index.css` (já está bom), `tailwind.config.ts` (já está bom), `button.tsx`/`input.tsx`/`label.tsx`/`textarea.tsx` (já compactos), `PageTabs.tsx` (já é a referência).

A Camada 3 é **somente leitura + relatório** — não edita nada antes da sua aprovação.