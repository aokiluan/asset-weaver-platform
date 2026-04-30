
# Redesign visual estilo Nibo

Trocar o tema atual ("Navy Trust" + dourado) por um tema **azul corporativo limpo** inspirado no Nibo, mantendo TODA a estrutura funcional, rotas, componentes, tabelas e formulários intactos. A mudança é puramente de **design system + ajustes finos de layout**.

## 1. Novo design system (`src/index.css` + `tailwind.config.ts`)

Substituir os tokens HSL atuais pela paleta Nibo:

| Token | Valor | Uso |
|---|---|---|
| `--background` | `210 20% 97%` (#F5F7FA) | fundo geral da app |
| `--card` | `0 0% 100%` | cards, tabelas, modais |
| `--foreground` | `220 26% 14%` (#1F2937) | texto principal |
| `--muted-foreground` | `220 9% 46%` (#6B7280) | texto secundário |
| `--border` / `--input` | `220 13% 91%` (#E5E7EB) | bordas suaves |
| `--primary` | `218 73% 52%` (#2D6CDF) | ações primárias, links, item ativo |
| `--primary-hover` | `220 71% 42%` (#1E4DB7) | hover de primary |
| `--accent` | `212 100% 65%` (#4DA3FF) | destaques, foco, badges informativos |
| `--success` | `142 71% 45%` (#22C55E) | valores positivos, status ok |
| `--warning` | `38 92% 50%` (#F59E0B) | alertas |
| `--destructive` | `0 84% 60%` (#EF4444) | erros, valores negativos |
| `--ring` | `218 73% 52%` | focus ring azul |
| `--radius` | `0.625rem` | cantos um pouco mais suaves |

**Sidebar (variante "clara estilo Nibo")**:
- `--sidebar-background`: `0 0% 100%` (branco) com borda direita `#E5E7EB`
- `--sidebar-foreground`: `220 15% 30%`
- `--sidebar-accent` (hover): `210 40% 96%` (cinza-azulado bem claro)
- `--sidebar-accent-foreground`: `218 73% 52%` (texto azul no hover)
- Item **ativo**: fundo `#EAF1FE` (azul-claro 8%), texto e ícone em `--primary`, borda esquerda 3px em `--primary`

Remover tokens dourados (`--gold`, `--gold-soft`, `--gradient-gold`, `--shadow-gold`) — ainda mapeados no Tailwind mas re-apontados para `accent` para não quebrar nada que ainda use `bg-gold` durante a transição.

**Tipografia**: manter `Inter` como `--font-sans`. Trocar `--font-display` (Cormorant serif → Inter semibold). Remover uso de `font-display` em headings; títulos passam a ser `Inter 600/700`.

**Sombras**:
- `--shadow-card`: `0 1px 2px hsl(220 13% 20% / 0.04), 0 1px 3px hsl(220 13% 20% / 0.06)` (sutil)
- `--shadow-elegant`: removida/aliasada para card

**Dark mode**: ajustado proporcionalmente (azul escuro `218 35% 12%` de fundo, primary mais claro `212 100% 65%`).

## 2. AppLayout (`src/components/AppLayout.tsx`)

- Topbar: altura mantida (h-16), fundo branco, borda inferior `--border`. Adicionar **campo de busca global** centralizado (placeholder "Buscar em todos…") com ícone de lupa, estilo pill com fundo `--muted` — só visual, sem lógica.
- Logo + nome da empresa à esquerda (mantido), com tipografia `text-[14px] font-semibold` e CNPJ em `text-[12px] text-muted-foreground`.
- Ícone de notificação ganha bolinha vermelha (`--destructive`) quando houver — placeholder visual.
- Avatar circular com iniciais do usuário ao lado do email (substitui o texto puro).

## 3. AppSidebar (`src/components/AppSidebar.tsx`)

- Fundo branco (via novos tokens), largura expandida `248px` (era 240).
- Cabeçalho da sidebar: trocar "Painel de Gestão" por logo pequeno + nome da empresa truncado (estilo Nibo).
- Labels de grupo (`Gestão`, `Operação`, `Configurações`): `text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`, sem ícone à esquerda (ou ícone bem discreto).
- Item ativo: fundo `bg-primary/8`, texto `text-primary`, borda esquerda de 3px em `--primary` (via pseudo elemento ou `border-l-[3px]`), ícone na cor primária.
- Item hover: `bg-muted`, texto `text-foreground`.
- Aumentar altura dos itens para `h-10`, gap entre ícone/texto para `gap-3`, fonte `text-[13.5px]`.

## 4. Componentes base (`src/components/ui/*`)

Sem reescrever — apenas garantir que os tokens novos cobrem o uso atual. Pequenos ajustes:

- **Button** variant `default` (primary): já usa `bg-primary` → fica azul automaticamente.
- **Card**: garantir `border` + `shadow-sm` (já é o padrão shadcn).
- **Input**: focus ring em `--primary` (azul) já vem do `--ring`.
- **Table**: ajustar `<thead>` para fundo `bg-muted/40`, texto `text-[12px] font-semibold uppercase tracking-wide text-muted-foreground`; linhas com `hover:bg-muted/50`; bordas `border-border`. Editar `src/components/ui/table.tsx`.
- **Badge**: variantes `success`, `warning`, `destructive` ganham versões soft (fundo claro + texto colorido) para status financeiros.

## 5. Cards de KPI / dashboards existentes

Sem alterar lógica. Apenas garantir:
- Padding `p-5` ou `p-6`, borda `border border-border`, sombra `shadow-card`.
- Título do KPI: `text-[13px] text-muted-foreground font-medium`.
- Valor: `text-2xl font-semibold tabular-nums text-foreground`.
- Variação (Δ%): pill `text-[12px]` em `success`/`destructive` soft.

(Aplicado nos componentes de dashboard que já existem em `src/pages/gestao/*` — apenas troca de classes utilitárias quando necessário, sem refatorar lógica.)

## 6. Telas com tabela financeira (Cedentes, Pipeline, Financeiro)

Aplicar padrão Nibo:
- Container externo com `bg-card rounded-lg border shadow-card`.
- Linha de filtros no topo: input de busca pill + selects compactos.
- Valores monetários sempre `tabular-nums text-right`.
- Status como badges soft.

Sem mudar colunas, dados ou comportamento.

## Escopo do que NÃO muda

- Rotas, hooks, integração Supabase, lógica de formulários, autosave, RLS, edge functions.
- Estrutura de pastas e nomes de componentes.
- Funcionalidades de qualquer tela.

## Detalhes técnicos

Arquivos editados:
- `src/index.css` — substituição completa de `:root` e `.dark` com nova paleta.
- `tailwind.config.ts` — manter mapeamento atual; `gold` reaponta para `accent` (compat).
- `src/components/AppLayout.tsx` — busca global + avatar.
- `src/components/AppSidebar.tsx` — estilo claro estilo Nibo, item ativo com barra azul.
- `src/components/ui/table.tsx` — header e hover.
- `src/components/ui/badge.tsx` — variantes soft (success/warning/destructive).

Após as edições, validar visualmente em: `/`, `/cedentes`, `/cedentes/:id`, `/pipeline`, `/gestao/financeiro`, `/financeiro` e Configurações para garantir contraste e legibilidade.

## Resultado esperado

Interface visualmente alinhada ao Nibo: fundo cinza-claro, sidebar branca com item ativo em azul, topbar branca com busca central, cards brancos com sombra sutil, tabelas limpas, paleta azul corporativa, tipografia Inter consistente — sem nenhuma quebra funcional.
