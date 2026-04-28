# Mover identificação da empresa para a sidebar + tom azul-acinzentado

## 1. `src/components/AppSidebar.tsx`
Reformular o `SidebarHeader` para conter:
- **Expandida**: logo símbolo branco (pequeno, à esquerda) + bloco de duas linhas:
  - Linha 1: "S3 CAPITAL SECURITIZADORA S.A." em `font-display`, peso 600, uppercase, cor sidebar-foreground, com `truncate`
  - Linha 2: "60.353.126/0001-71" em texto pequeno (`text-[11px]`), `tabular-nums`, sidebar-foreground com 60% opacidade
- **Recolhida**: apenas o símbolo centralizado (como hoje)
- Mais respiro vertical (`py-4`) para acomodar bem o bloco de texto

## 2. `src/components/AppLayout.tsx`
Limpar o cabeçalho principal:
- Remover logo, razão social e CNPJ (que migram para a sidebar)
- Manter apenas: `SidebarTrigger` + (à direita) função do usuário, sino, e-mail e botão Sair
- Reduzir altura para `h-12` (era `h-16`)

## 3. `src/index.css` — paleta da sidebar mais azul-acinzentada
Substituir o navy puro por um **slate azulado** (mais cinza, menos saturado), mantendo a hierarquia:
- `--sidebar-background`: `215 25% 18%` (slate azulado escuro, em vez de navy 218 60% 11%)
- `--sidebar-foreground`: `210 15% 85%` (off-white levemente azulado)
- `--sidebar-accent`: `215 20% 26%` (hover/selecionado um pouco mais claro)
- `--sidebar-border`: `215 20% 26%`
- `--sidebar-primary` (item ativo): mantém o **dourado** da marca como destaque

Ajustar também o tema escuro com a mesma família de tons.

## Resultado esperado
Sidebar com fundo **azul-acinzentado sóbrio** (tipo "slate steel"), com o cabeçalho mostrando logo símbolo + razão social + CNPJ — exatamente o bloco de identificação da empresa que estava no header principal. Header principal fica limpo, só com trigger e ações do usuário.
