## Novo módulo: Relação com Investidores

Adiciona um módulo independente, com a primeira tela "CRM de Prospecção". Mantém o padrão Nibo ultracompacto, `PageTabs`, tokens semânticos e componentes shadcn já usados. Sem novas libs.

### 1. Banco (migration)

Tabela `public.investor_contacts`:

- `id uuid pk default gen_random_uuid()`
- `name text not null`
- `type text not null check in ('assessoria','investidor_pf','investidor_pj','institucional')`
- `stage text not null default 'prospeccao' check in ('prospeccao','apresentacao','due_diligence','proposta','fechamento','ativo')`
- `ticket numeric`
- `contact_name text`
- `phone text`
- `last_contact_date date`
- `next_action text`
- `notes text`
- `user_id uuid not null default auth.uid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` + trigger `update_updated_at_column`

RLS habilitada com 4 políticas (`select/insert/update/delete`) onde `user_id = auth.uid()`. Sem dependência de roles — escopo estritamente por usuário, conforme pedido.

Novo módulo no menu: chave `relacao_investidores`. Backfill: ativar para `admin` automaticamente via `can_access_module` (já trata admin). Para usuários comuns, ativar manualmente em Permissões (já existente).

### 2. Navegação

`src/components/AppSidebar.tsx` — novo grupo:

```text
Relação com Investidores  (key: relacao_investidores, ícone Handshake/Briefcase thin)
  └─ CRM de Prospecção  → /investidores/crm
```

`src/App.tsx` — nova rota protegida por `<RoleGuard moduleKey="relacao_investidores">` apontando para `pages/investidores/InvestidoresCRM.tsx`. Index do módulo redireciona para `crm`.

### 3. Tela `InvestidoresCRM.tsx`

Layout com `PageTabs` (title "Relação com Investidores", uma aba "CRM de Prospecção"), seguido de:

**Métricas (4 Cards p-2.5 densos)** — `Capital Ativo`, `Pipeline`, `Total de Contatos`, `Ticket Médio`. Função `fmtCompactBRL(v)`:

- ≥ 1.000.000 → `R$ 1,5M`
- ≥ 1.000 → `R$ 500k`
- senão → `R$ 250`

**Toolbar** — toggle Kanban/Lista (`ToggleGroup` shadcn) + filtro por tipo (`Tabs` ou chips: Todos/Assessoria/PF/PJ/Institucional) + botão `+ Novo contato` (h-7).

**Kanban** — 6 colunas na ordem: Prospecção, Apresentação, Due Diligence, Proposta, Fechamento, Ativo. Cards mostram nome, badge de tipo, ticket compacto, próxima ação (`text-[11px] text-muted-foreground`). Sem drag-and-drop nesta primeira versão — avanço/retrocesso pelo painel de detalhes (mantém escopo simples e consistente com pedido). Coluna usa `overflow-x-auto` para caber em viewport mobile.

**Lista** — `Table` shadcn com colunas Nome, Tipo, Estágio (badge), Ticket, Contato, Último Contato, Próxima Ação, ação editar (`Pencil` icon-only h-7 w-7). Linha clicável abre o painel.

**Painel lateral** — `Sheet` (right, w-[420px]). Conteúdo:

- Stepper horizontal compacto dos 6 estágios (bolinhas + linha, igual padrão `CedenteStageStepper` mas reduzido)
- Bloco view denso (label text-[10px] / valor text-[12px], `space-y-2`) com todos os campos
- Footer: `‹ Voltar etapa` (ghost, disabled no primeiro), `Avançar etapa ›` (primary, disabled no último), `Editar`, `Excluir` (destructive ghost)

**Modal Add/Edit** — `Dialog` shadcn com form (react-hook-form + zod). Campos: Nome/Empresa, Nome do Contato, Telefone, Ticket (CurrencyInput existente), Último Contato (`Input type=date`), Tipo (Select), Estágio (Select), Próxima Ação, Notas (Textarea). Footer Nibo: Cancelar ghost + Salvar primary, ambos h-7.

### 4. Detalhes técnicos

Arquivos novos:

- `supabase/migrations/<ts>_investor_contacts.sql`
- `src/pages/investidores/InvestidoresCRM.tsx`
- `src/pages/investidores/InvestidorContactDrawer.tsx`
- `src/pages/investidores/InvestidorContactFormDialog.tsx`
- `src/lib/investor-contacts.ts` (enums, labels, ordem de estágios, `fmtCompactBRL`)

Arquivos editados:

- `src/App.tsx` — rota nova
- `src/components/AppSidebar.tsx` — grupo novo
- `src/hooks/useModulePermissions.ts` — adicionar `"relacao_investidores"` ao `ModuleKey`

Tudo em pt-BR, valores monetários compactos, persistência via Supabase, RLS por `user_id`.

### Pontos de atenção

- O escopo "só vê os próprios" significa que admin não vê de todos por essa RLS; se quiser admin ver tudo depois, adicionamos política extra com `has_role(auth.uid(),'admin')`. Hoje fica fiel ao pedido.
- Sem drag-and-drop no Kanban v1 (avanço pelo painel). Posso adicionar depois se quiser.