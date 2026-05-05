## Objetivo

Refinar o visual da aplicação para se aproximar do Nibo (referência da imagem): tipografia mais limpa, cores mais claras e neutras, espaçamentos mais arejados, hierarquia visual mais sutil, cantos suaves e sombras quase imperceptíveis.

## O que muda (todo via tokens — sem refatorar componentes)

### 1. `src/index.css` — design tokens

**Cores (Nibo):**
- Fundo geral: `#F7F9FB` (era `#F5F7FA`) — quase branco, levemente mais frio
- Texto: `#232E3D` (mais escuro, alto contraste como Nibo)
- Cinza secundário: `#6B7785` (era `#6B7280`)
- Bordas: `#E1E6EC` (mais finas e suaves)
- **Primary**: `#0080FF` (mais saturado/claro que o atual `#2D6CDF`) — exatamente o azul Nibo
- Hover do primary: `#006FD6`
- Accent (hover sidebar/links): `#EAF4FF` (azul muito claro, como o Nibo)
- Sucesso: `#28A745` (verde Nibo do "Primeiros Passos")
- Erro: `#DC3545`

**Forma:**
- `--radius: 0.375rem` (era 0.625) — cantos suaves Nibo
- Sombras quase nulas: `0 1px 2px rgba(0,0,0,0.04)`

**Tipografia:**
- Mantém Inter, mas adiciona feature settings + tracking levemente negativo
- Pesos: ajusta para Nibo usar muito normal/medium (400/500), raramente 600

### 2. `src/components/AppSidebar.tsx` — refinamentos

- Aumenta padding lateral dos itens (mais arejado, como Nibo)
- Item ativo: fundo `--sidebar-accent` claro (azul muito claro) + texto azul, **sem barra lateral** (Nibo não usa)
- Header da seção (`FINANCEIRO`, `OPERAÇÃO`): cinza mais claro, tracking maior, peso normal
- Tamanho do texto dos itens: 13px (era 13.5)
- Largura expandida: 240px (mais próximo do Nibo)

### 3. `src/components/PageTabs.tsx` — header de página

- Título: `text-[20px] font-medium` (mais leve, era `text-2xl font-semibold`)
- Linha de tabs: spacing maior entre tabs (`gap-6`), texto `text-[14px] font-normal`, ativa com `font-medium` + underline mais grosso
- Sublinhado da tab ativa: 2px sólido azul primary

### 4. `src/components/AppLayout.tsx`

- Padding global maior (`px-8 py-6` em vez de `px-6 py-4`) — mais respiração

### 5. Cards genéricos (`Card` shadcn)

- Sem mudança de classe — só herda os novos tokens (border mais suave, radius menor, sombra mais sutil)

## O que NÃO muda

- Estrutura de componentes
- Fluxos / lógica
- Layout dos formulários (apenas herdam novos tokens)
- Dark mode (vamos ajustar tokens correspondentes para ficar coerente, mas sem mudar comportamento)

## Como vai parecer

- Sidebar branca pura, item ativo com fundo azul claríssimo e texto azul (sem barra lateral)
- Cabeçalho das páginas mais leve, menos "pesado" no topo
- Tudo com cantos um pouco menos arredondados (mais "técnico" como Nibo)
- Cards com bordas quase invisíveis e zero sombra perceptível
- Mais espaço entre elementos
