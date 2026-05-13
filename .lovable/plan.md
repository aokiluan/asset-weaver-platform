## Objetivo

Trazer 3 features do kanban Comercial do projeto `s3capital-painel` para o nosso CRM de Prospecção, mantendo o design system Nibo ultracompacto (sem cores novas, sem libs novas).

## 1. Registrar Contato (histórico de interações)

Hoje só existe `last_contact_date` como data solta. Criaremos um histórico real.

**Banco** — nova tabela `investor_contact_interactions`:
- `id`, `contact_id` (FK → `investor_contacts`), `user_id`
- `interaction_date` (date, default today)
- `channel` enum: `telefone | email | whatsapp | presencial | reuniao | outro`
- `summary` (text, obrigatório curto — "com quem falou / o que rolou")
- `notes` (text, opcional)
- `created_at`
- RLS por `user_id = auth.uid()` (mesmo padrão das demais)

**Trigger** ao inserir interação: atualiza `investor_contacts.last_contact_date` para `interaction_date` se for mais recente.

**UI** — novo `RegistrarContatoDialog.tsx`:
- Campos: data, canal (select), resumo (input curto), notas (textarea)
- Botões: Cancelar (ghost) + Salvar (primary), padrão h-7
- Pontos de entrada:
  - Ícone `Phone` no card do Kanban (já tem espaço, hoje sem ação)
  - Botão "Registrar contato" no QuickView e no Drawer

## 2. Confirmação de movimentação no Kanban

Hoje o drag-end aplica a mudança direto. Vamos interceptar:

- `KanbanView` mantém o optimistic move suspenso até confirmação
- Novo `ConfirmStageMoveDialog.tsx`:
  - Texto: "Mover **{nome}** de **{de}** para **{para}**?"
  - Aviso quando `isAdvance` for true: "O último contato será atualizado para hoje."
  - Cancelar / Confirmar
- Aplica-se também ao botão Avançar/Voltar do Drawer (mesma confirmação)
- Cancelar = nenhuma chamada ao Supabase, nenhum optimistic update

## 3. Visualização rápida (ícone do olho)

- Adiciona botão `Eye` (h-6 w-6, ícone 3) no canto superior direito do `KanbanCard`, ao lado do nome
- Abre `QuickViewDialog.tsx` (Dialog compacto, ~`max-w-md`):
  - Cabeçalho: nome + badges (tipo, estágio)
  - Grid 2 colunas: Telefone / Ticket
  - Estágio Atual + Próxima Ação (text-primary)
  - Últimas 3 interações (data + canal + resumo) lidas de `investor_contact_interactions`
  - Footer: "Registrar Contato" (primary) + "Abrir detalhes" (ghost, abre o Drawer atual) + "Fechar"
- Clique simples no card continua abrindo o Drawer completo (manter); o olho é atalho

## Arquivos

**Migration** (nova): `investor_contact_interactions` + enum + trigger + RLS

**Novos componentes** (`src/pages/investidores/`):
- `RegistrarContatoDialog.tsx`
- `ConfirmStageMoveDialog.tsx`
- `QuickViewDialog.tsx`

**Lib** (`src/lib/investor-contacts.ts`):
- Adicionar tipo `InvestorInteraction` e `INTERACTION_CHANNEL_LABEL`

**Edits**:
- `InvestidoresCRM.tsx`: integrar confirmação no `onDragEnd` e abrir QuickView pelo `Eye`; passar callback de Registrar Contato para o card
- `InvestorContactDrawer.tsx`: usar mesma confirmação no Avançar/Voltar; mostrar lista de interações; botão "Registrar contato"

## Fora de escopo
- Editar/excluir interações (só criar nesta iteração)
- Notificações ou lembretes
- Mudanças visuais no design system

Posso seguir para implementação?