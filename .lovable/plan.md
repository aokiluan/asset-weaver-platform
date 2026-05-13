## Objetivo
Hoje o sidebar usa `hidden md:flex`/`hidden md:block`, então some abaixo de 768px. Em telas comprimidas (ex.: 537px do preview) o usuário fica sem navegação. Ajustar para que o sidebar apareça sempre — em telas estreitas ele aparece em modo colapsado (somente ícones, 60px), e o usuário pode expandir manualmente clicando no botão de menu/pin como já existe.

## Mudanças (apenas `src/components/AppSidebar.tsx`)

1. **Spacer (div fantasma que reserva largura)**
   - Remover `hidden md:block` → sempre visível.
   - Largura: sempre `COLLAPSED_W` em mobile (sem expandir empurrando o conteúdo); em ≥md continua respeitando `pinned`.

2. **`<aside>` do sidebar**
   - Remover `hidden md:flex` → sempre `flex`.
   - Em telas <md, forçar largura colapsada (60px) e ignorar hover-expand para não cobrir o conteúdo. Expansão fica disponível apenas via clique no botão de menu (ainda funcional, abre como overlay com sombra, igual ao comportamento atual de hover não-pinado).
   - Manter os mesmos tokens de cor (`bg-sidebar`, etc.) — sem mudanças visuais de design system.

3. **Header do AppLayout**
   - Sem alterações funcionais, mas o spacer do sidebar agora ocupa 60px em mobile, então o header/main já se ajustam naturalmente via flex.
   - A busca global continua `hidden md:block` (sem espaço em mobile, ok).

## Não muda
- Nenhuma regra de papéis/permissões.
- Nenhum token de design (cores, tipografia, espaçamento) é alterado.
- Comportamento desktop (≥768px) idêntico ao atual: hover expande, pin fixa.

## Resultado esperado
Em 537px o usuário verá a barra lateral colapsada de 60px com ícones de cada grupo/rota; pode tocar no ícone de menu para expandir temporariamente como overlay e navegar.
