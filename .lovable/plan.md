## Aprimoramentos funcionais no CRM de Prospecção

Comparando o artefato de referência com o que já existe, mantendo o visual Nibo. Lista do que vou adicionar:

### 1. Drag-and-drop no Kanban
Hoje o avanço/retrocesso de estágio só acontece pelo painel lateral. Adicionar arrastar-e-soltar de cards entre colunas usando `@dnd-kit/core` (já instalado, usado em `Pipeline.tsx`). Solto numa coluna, faz `update stage` no Supabase com optimistic update e toast de confirmação.

### 2. Sub-labels nos cards de métrica
Hoje cada card mostra só label + valor. Adicionar contexto na linha de baixo:
- **Capital Ativo** → `N contatos`
- **Pipeline** → `N em negociação`
- **Total de Contatos** → `na base`
- **Ticket Médio** → `por contato`

### 3. Indicador de todos os estágios no painel lateral
Hoje o painel tem stepper com bolinhas. Trocar por **chips horizontais com todos os estágios** (chip ativo destacado), igual ao artefato — fica mais legível em 420px e mostra de relance onde está a oportunidade.

### 4. "Próxima ação" em destaque
- Nos cards do Kanban: prefixar com `→` e usar token `text-success` (verde semântico) para diferenciar do nome.
- No painel lateral: usar mesma cor/peso para reforçar que é o call-to-action.

### 5. Botão "Avançar" como ação primária no painel
Hoje os botões Voltar/Avançar têm o mesmo peso (ghost + primary). Manter Avançar primary, mas reforçar que é o caminho feliz: ocupa mais espaço (flex-1 vs flex-shrink no Voltar).

### 6. Atalhos no card do Kanban
Botão pequeno `→` no canto inferior direito do card, que avança 1 estágio sem precisar abrir o painel. Já que adicionar drag-and-drop, isso fica como atalho redundante mas útil em mobile (viewport 775px). **Decisão**: pular esse, o drag cobre mobile com long-press do dnd-kit.

### 7. Auto-stamp do "Último contato"
Quando o usuário move o estágio (drag, atalho do painel, ou edição), atualizar `last_contact_date = today` automaticamente. Marca natural de que houve interação. **Pergunta implícita**: deixo como auto, ou deixo só manual? Vou fazer auto **apenas no avanço de estágio**, não no retrocesso e não em edições manuais.

### 8. Contador + soma na coluna do Kanban
Já tenho contagem e soma. Manter, mas mover a contagem para um badge ao lado do título (mais visível que inline em texto).

### O que NÃO vou adicionar (visual/fora de escopo)
- Cores diferentes por estágio (`STAGE_COLORS`) — fere o design system, fica cinza+primary
- Ícones esotéricos por estágio (◎◑◕●⬡✦) — só ruído visual
- Header "S3 Capital · CRM CAPTAÇÃO DE RECURSOS" — `PageTabs` já cumpre essa função
- Tipografia monoespaçada, gradientes, shadows fortes — Nibo é Inter, sombras sutis

### Arquivos afetados

- `src/pages/investidores/InvestidoresCRM.tsx` — métricas com sub-label, botão Kanban com dnd-kit, drag-and-drop, auto-stamp no avanço
- `src/pages/investidores/InvestorContactDrawer.tsx` — substituir stepper por chips de todos os estágios, destacar próxima ação, auto-stamp no avançar
- `src/lib/investor-contacts.ts` — helper `todayISO()` para o stamp

Sem mudanças de schema nem de RLS.