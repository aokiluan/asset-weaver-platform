## Padronização do design ultracompacto em todo o projeto

### Padrão alvo (já aplicado no Relatório de crédito)
- `Input`: `h-7`, `text-[12px]`, `px-2.5`
- `Textarea`: `text-[12px]`, `min-h-[60px]`
- `Select`: `h-7`, `text-[12px]` (já é o default global)
- `Label`: `text-xs`

### Estratégia: alterar os componentes globais
Em vez de aplicar `className` em centenas de lugares, atualizo os defaults dos primitivos do design system:

1. **`src/components/ui/input.tsx`** — default vira `h-7 text-[12px] px-2.5` (hoje é `h-10 text-base px-3`).
2. **`src/components/ui/textarea.tsx`** — default vira `text-[12px] min-h-[60px]` (hoje `text-base min-h-[80px]`).
3. **`src/components/ui/label.tsx`** — default vira `text-xs` (hoje `text-sm`).
4. **`src/components/ui/button.tsx`** — ajuste do size `default` para combinar com inputs `h-7`: trocar para `h-8 px-3 text-xs` (hoje `h-10 px-4 py-2`). `sm` e `lg` permanecem.

Como o relatório de crédito já passava classes explícitas (`h-7 text-[12px] px-2.5`), removo essas overrides redundantes para evitar duplicação.

### Páginas/áreas que serão impactadas (todas ganham o visual compacto)
- Login / Auth
- Diálogos: novo cedente, lead, sócio, conciliação, comitê
- Relatório de visita (comercial)
- Tabs de cedente, representantes, documentos
- Admin (usuários, equipes, alçadas, categorias, datasets, pipeline, relatórios, dashboard widgets)
- Pipeline, Leads, Financeiro, Formalização, Gestão, BI, Configurações

### Ajustes pontuais previstos
- **`Auth.tsx`**: inputs de login ficam pequenos demais para a primeira impressão. Aplicar `className="h-10 text-sm"` localmente para preservar o tamanho confortável só no login.
- **`CurrencyInput`** (`src/components/ui/currency-input.tsx`): se herda do Input, herda o novo padrão automaticamente — verificar.
- **Headers de tabelas / botões grandes (`size="lg"`)**: não são afetados.

### Não muda
- Componentes de overlay (Dialog, Sheet, Drawer, Tooltip, Popover): estrutura permanece.
- Cores, raios, sombras, espaçamentos de cards.
- Lógica de qualquer feature.

### Risco
Mudança visual ampla. Layouts construídos assumindo `h-10` podem ficar com mais espaço vertical sobrando, mas nada quebra funcionalmente. Vou revisar o login após aplicar e ajustar páginas onde a redução prejudicar legibilidade (caso surjam).

### Arquivos editados (estimativa)
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/button.tsx`
- `src/components/credito/CreditReportForm.tsx` (limpar overrides redundantes)
- `src/pages/Auth.tsx` (preservar tamanho confortável no login)
