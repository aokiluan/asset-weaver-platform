# Boletas no sidebar + visualização em funil nos pipelines

## 1. Mover "Boletas" para o sidebar (Relação com Investidores)

**`src/components/AppSidebar.tsx`** — grupo `relacao_investidores`:

```
Pipeline de Investidores  → /investidores/crm
Boletas                   → /investidores/boletas   ← NOVO
Investidores              → /diretorio/investidores
```

Ícone novo: `Receipt` ou `FileText` (Phosphor) com wrapper `thin()`.

A rota `/investidores/boletas` já existe — não há mudança em `App.tsx`. As abas internas em `InvestidoresCRM.tsx` e `InvestidoresBoletas.tsx` (`PageTabs` com tabs `Pipeline` / `Boletas`) podem ser **removidas** já que viram itens de sidebar — ficam só como `<PageTabs title=… tabs={[]} />`, mantendo o cabeçalho e ações.

### Badge de pendência no item "Boletas"

Quando houver pelo menos 1 investidor em `stage = 'boleta_em_andamento'` SEM boleta aberta vinculada, mostrar um indicador no item da sidebar:
- **Sidebar expandido:** `Badge` redondo com a contagem à direita do label (ex.: `2`).
- **Sidebar colapsado:** dot vermelho no canto superior direito do ícone.

**Implementação** (novo hook `src/hooks/useBoletasPendentes.ts`):
1. Query inicial: contar `investor_contacts` em `boleta_em_andamento` que NÃO têm linha em `investor_boletas` com `status NOT IN ('concluida','cancelada')` — usar duas selects e fazer o diff em memória (mesmo padrão de `InvestidoresBoletas.tsx`).
2. Subscription Realtime nas tabelas `investor_contacts` e `investor_boletas` para atualizar a contagem ao vivo.
3. Retornar `{ count: number }`.

`AppSidebar` consome o hook e passa `badge` para `SidebarItem` apenas quando `item.url === '/investidores/boletas'` e `count > 0`. Estende `SidebarItem` com prop opcional `badge?: number`.

> Realtime: `investor_contacts` e `investor_boletas` precisam estar na publication `supabase_realtime`. Se ainda não estiverem, criar migration adicionando.

## 2. Visualização em funil nos pipelines

Adicionar um terceiro modo no `ToggleGroup` de view, ao lado de `kanban` e `list`: ícone `Filter`/`Funnel`.

**Novo componente compartilhado** `src/components/pipeline/FunnelView.tsx`:
- Recebe `stages: Array<{ key, label, count, value, color? }>` e `onStageClick?(key)`.
- Renderiza barras horizontais com largura proporcional à contagem (ou ao valor — toggle interno secundário "por nº" / "por valor").
- Cada barra mostra: nome do estágio, contagem, valor compacto (BRL), e taxa de conversão vs o estágio anterior (%).
- Visual ultra-compacto Nibo: barras h-7, label 12px, números tabulares, cores via tokens `--primary` com opacity decrescente, fundo `bg-muted`.
- Estágios terminais (`isTerminal`) renderizados separados abaixo, em cinza, sem entrar no cálculo de conversão.

**Integração:**
- `src/pages/Pipeline.tsx` (Pipeline de Cedentes): adiciona `funnel` no ToggleGroup e ramo `view === "funnel"` que monta `stages` a partir de `STAGE_ORDER` × `filtered` (cedentes), com valor = `faturamento_medio`.
- `src/pages/investidores/InvestidoresCRM.tsx`: idem com `STAGE_ORDER` de investidores e valor = `ticket`.

Click numa etapa do funil filtra/scrolla — comportamento simples: alterna para `kanban` e foca a coluna correspondente (opcional, fora do MVP).

## Detalhes técnicos

- `STAGE_ORDER` e `STAGE_LABEL` já exportados em `src/lib/cedente-stages.ts` e `src/lib/investor-contacts.ts` — reaproveitar.
- Conversão = `count[i] / count[0]` (do primeiro estágio não-terminal). Mostrar `—` quando `count[0] === 0`.
- Ícone funil: `Funnel` do `@phosphor-icons/react` (já é a fonte de ícones do sidebar) e `Filter` de `lucide-react` para os toggle buttons (já usados em outros lugares).
- Sem mudanças de schema, RLS ou edge functions, exceto a migration opcional de Realtime publication.

## Fora de escopo

- Reordenar/renomear estágios.
- Drill-down ao clicar no funil (apenas troca de view, sem scroll automático).
- Permissões: o item "Boletas" herda as regras já aplicadas ao grupo `relacao_investidores`.
