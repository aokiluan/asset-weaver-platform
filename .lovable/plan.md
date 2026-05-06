## Migração dos ícones do Sidebar para Phosphor Icons

Trocar a família de ícones usada no `AppSidebar` de **Lucide** para **Phosphor Icons** com peso `thin`, que reproduz com fidelidade o traço fino, arredondado e elegante da imagem de referência.

O restante do app continua com Lucide (sem impacto). Se depois você gostar do resultado, podemos estender a troca para o resto da aplicação em um segundo momento.

### Etapas

1. **Instalar dependência**
   - `@phosphor-icons/react`

2. **Atualizar `src/components/AppSidebar.tsx`**
   - Substituir os imports de `lucide-react` pelos equivalentes de `@phosphor-icons/react`.
   - Aplicar `weight="thin"` como padrão em todos os ícones do sidebar (incluindo o ícone de menu, pin, chevron).
   - Manter o tamanho atual (`h-4 w-4`).

3. **Reverter override global do Lucide**
   - Em `src/index.css`, remover (ou voltar para `1.5`) a regra `svg.lucide { stroke-width: 0.75 }`, já que o sidebar não usará mais Lucide e o resto do app fica com aparência normal de novo.

### Mapeamento de ícones (Lucide → Phosphor)

| Lucide              | Phosphor              |
|---------------------|-----------------------|
| LayoutDashboard     | SquaresFour           |
| Users               | Users                 |
| KanbanSquare        | Kanban                |
| Settings            | Gear                  |
| Building2           | Buildings             |
| Gavel               | Gavel                 |
| ListChecks          | ListChecks            |
| Tags                | Tag                   |
| Wallet              | Wallet                |
| Database            | Database              |
| FileSpreadsheet     | MicrosoftExcelLogo / FileXls |
| LayoutGrid          | SquaresFour           |
| BarChart3           | ChartBar              |
| Briefcase           | Briefcase             |
| Pin / PinOff        | PushPin / PushPinSlash|
| ChevronDown         | CaretDown             |
| Menu                | List                  |
| TrendingUp          | TrendUp               |
| Activity            | Pulse / Activity      |
| CalendarDays        | CalendarBlank         |
| Vote                | UsersThree (ou Scales)|
| FileSignature       | FilePlus / NotePencil |

### Detalhes técnicos

- A API do Phosphor aceita `className`, `size` e `weight`. Como já controlamos tamanho via Tailwind (`h-4 w-4`), basta passar `weight="thin"`.
- Para evitar repetição, criar um pequeno wrapper local no `AppSidebar` que injeta `weight="thin"` por padrão, mantendo a tipagem `React.ComponentType<{ className?: string }>` que o componente já espera.
- Sem mudanças em layout, espaçamentos, cores ou comportamento — apenas a família visual dos ícones.

### Fora do escopo

- Trocar ícones em outras telas (cedentes, comitê, dialogs, etc.) — fica para um próximo passo se você aprovar o resultado no sidebar.
