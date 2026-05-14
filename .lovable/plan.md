
## Objetivo

Espelhar 1:1 o CRM de Prospecção (investidores) no Pipeline da Operação (cedentes), trazendo as mesmas features de **visualização rápida** e **registro de contato**, e travar o **drag-and-drop por permissão de etapa** (mesma regra da esteira de crédito do cedente).

---

## Parte 1 — Features de CRM no Pipeline de Cedentes

Hoje o Pipeline só tem cards arrastáveis. Vou paritar com o CRM de investidores:

### 1.1 QuickView (ícone 👁 no card)
Novo `CedenteQuickViewDialog` (espelho de `QuickViewDialog`):
- Header: razão social + Badges de **estágio** e **setor**.
- Bloco KV (`grid grid-cols-2 p-2.5`): CNPJ, Faturamento médio, Cidade/UF, Limite aprovado.
- Bloco "Próxima ação" (se preenchida) destacado em primary.
- Bloco "Histórico de contatos" — últimas 3 entradas de `cedente_contact_activities` (data · canal + descrição), com border-l-2 igual investidores.
- Footer: **Abrir cadastro** (navega para `/cedentes/:id`) + **Registrar contato**.

### 1.2 Registrar contato (ícone 📞 no card)
Novo `RegistrarContatoCedenteDialog` (espelho de `RegistrarContatoDialog`):
- Campos: Data (max=hoje), Canal (Select: Ligação, WhatsApp, E-mail, Reunião, Visita, Nota, Tarefa), Resumo (Input), Notas (Textarea).
- Salva em `cedente_contact_activities`.
- Atualiza `cedentes.last_contact_date` se a data nova for mais recente.
- Toast + reload da lista.

### 1.3 Card do kanban
Trazer para `KanbanCard` do Pipeline a mesma estrutura visual do CRM:
- Top-right: botão 👁 (QuickView).
- Bottom-right: botão 📞 (Registrar contato).
- Próxima ação truncada em `text-primary text-[11px]` se existir.
- Linha inferior: Badge setor à esquerda, faturamento à direita (já está assim, só adicionar ações).

### 1.4 Métricas extras
Manter as 4 atuais (Cedentes Ativos, Em Negociação, Faturamento Esteira, Ticket Médio). Sem mudança.

### 1.5 ListView
Adicionar coluna **Último contato** e **Próxima ação** (truncadas), espelhando ListView do CRM.

---

## Parte 2 — Permissão por estágio no drag-and-drop

A esteira de crédito (componente `CedenteStageActions`) já avalia (a) `STAGE_PERMISSIONS[from]` por role e (b) gates de pendências. No Pipeline o usuário hoje arrasta livremente.

Vou aplicar a regra **A** no Pipeline (permissão por role):

- Novo helper em `src/lib/cedente-stages.ts`:
  ```ts
  export function canMoveStage(
    roles: AppRole[],
    isOwner: boolean,
    from: CedenteStage,
    to: CedenteStage,
  ): { ok: boolean; reason?: string }
  ```
  - Admin/Gestor Geral sempre `ok`.
  - Para retroceder/devolver para `novo`: qualquer role não-comercial pode (igual `to-comercial` do StageActions).
  - Para avançar: usuário precisa ter algum role em `STAGE_PERMISSIONS[from]`. Owner do cedente em `novo` pode enviar para `cadastro` (override que já existe no StageActions).
  - Se `to` não for vizinho linear (avanço/retrocesso de 1 step) ou retorno-ao-novo, retorna `ok=false` com motivo "Movimento não permitido por aqui — abra o cedente".

- No `Pipeline.tsx`:
  - **Antes de abrir o AlertDialog de confirmação**, chamar `canMoveStage`. Se falhar, exibir `toast.error(reason)` e abortar (sem confirmar).
  - **No card**, calcular `canDragFromStage(roles, isOwner, currentStage)` (existe pelo menos uma transição permitida?). Se `false`, aplicar:
    - `cursor-not-allowed`, `opacity-60`, `aria-disabled`.
    - Não anexar `useDraggable` listeners (impede arrasto).
    - Tooltip no card: "Você não tem permissão para mover desta etapa".
  - **Gates de pendências** (docs, parecer, etc.) NÃO são avaliados no Pipeline — esses continuam só dentro do detalhe do cedente. O toast deixa isso claro: "Para conferir pendências, abra o cedente".

- Owner: como a tabela `cedentes` traz `owner_id`, já temos o dado para o override em `novo`.

---

## Parte 3 — Banco de dados

Migração única:

```sql
-- 1) Tipo de atividade (espelho do investor_activity_type)
create type public.cedente_activity_type as enum
  ('ligacao','whatsapp','email','reuniao','visita','nota','tarefa');

-- 2) Tabela de atividades de contato com cedentes
create table public.cedente_contact_activities (
  id uuid primary key default gen_random_uuid(),
  cedente_id uuid not null,
  user_id uuid not null default auth.uid(),
  type cedente_activity_type not null,
  description text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index on public.cedente_contact_activities (cedente_id, occurred_at desc);

alter table public.cedente_contact_activities enable row level security;

create policy "Visibilidade segue cedente"
on public.cedente_contact_activities
for select to authenticated
using (exists (
  select 1 from cedentes c
  where c.id = cedente_id and can_view_cedente(auth.uid(), c.owner_id)
));

create policy "Quem vê pode registrar contato"
on public.cedente_contact_activities
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from cedentes c
    where c.id = cedente_id and can_view_cedente(auth.uid(), c.owner_id)
  )
);

create policy "Autor edita o próprio registro"
on public.cedente_contact_activities
for update to authenticated
using (user_id = auth.uid() or has_role(auth.uid(), 'admin'));

create policy "Autor remove o próprio registro"
on public.cedente_contact_activities
for delete to authenticated
using (user_id = auth.uid() or has_role(auth.uid(), 'admin'));

-- 3) Campos auxiliares no cedente para paridade com InvestorContact
alter table public.cedentes
  add column if not exists last_contact_date date,
  add column if not exists next_action text;
```

`next_action` é editável no Drawer do cedente (próxima passada de UI) — por ora exposto como leitura no QuickView. Se vazio, esconde o bloco.

---

## Parte 4 — Arquivos

Criar:
- `src/lib/cedente-activities.ts` — types + labels.
- `src/components/cedentes/CedenteQuickViewDialog.tsx`
- `src/components/cedentes/RegistrarContatoCedenteDialog.tsx`

Editar:
- `src/lib/cedente-stages.ts` — exportar `canMoveStage`, `canDragFromStage`.
- `src/pages/Pipeline.tsx` — fetch ampliado (`owner_id`, `last_contact_date`, `next_action`), botões 👁/📞 no card, integração dos dialogs, checagem de permissão antes de mover, card disabled quando sem permissão, ListView com colunas extras.

Sem mudanças em:
- `CedenteStageActions` (esteira interna do cedente continua igual).
- Schemas `investor_*` (já parametrizados).
- Geração de PDF, edge functions, wizard de boleta.

---

## Detalhes técnicos

- Para o filtro "anyTransitionAllowedFrom(stage)" verificar: avanço linear (`STAGE_PERMISSIONS[stage]`) **ou** retroceder ao `novo` (qualquer role não-comercial diferente de `comercial`). Em estágios terminais (`ativo`, `inativo`) nunca é permitido mover via Pipeline.
- O drag-and-drop usa `useDraggable`; para travar, condicionalmente NÃO aplicar `{...listeners} {...attributes}` no card. Mantém click/double-click ativos.
- Chamadas `supabase.from("cedente_contact_activities")` precisam aguardar regen de tipos — usar `as any` se necessário até o auto-update.
- `last_contact_date` é date (sem TZ), igual `investor_contacts.last_contact_date`.
