# Alerta de renovação cadastral semestral

Cedentes ativos precisam ter o cadastro revisado a cada **6 meses** (compliance/KYC). Hoje não há nenhum controle disso — depois que o contrato é assinado, ninguém é avisado de que os dados envelheceram.

## Solução proposta — simples, baseada em uma única coluna

Tudo gira em torno de uma data: **`cadastro_revisado_em`** em `cedentes`. Não precisa de tabela nova, job agendado nem cron — o status é **calculado em tempo real** a partir dessa data.

### Regras de status (computadas no front)

| Meses desde a última revisão | Status | Cor |
|---|---|---|
| < 5 meses | **Em dia** | verde (sem alerta) |
| ≥ 5 e < 6 meses | **Vence em breve** | âmbar |
| ≥ 6 meses | **Renovação vencida** | vermelho |
| `cadastro_revisado_em` nulo | herda de `minuta_assinada_em` (data da assinatura conta como primeira revisão) |

Função utilitária pura em `src/lib/cadastro-renovacao.ts` exportando `computeRenovacao(date)` que devolve `{ status, mesesRestantes, vencidoEm }` — usada em qualquer tela.

### Banco (migration única)

- Adicionar `cadastro_revisado_em timestamptz` em `public.cedentes` (nullable).
- Adicionar `cadastro_revisado_por uuid` (quem confirmou a revisão).
- **Backfill:** `UPDATE cedentes SET cadastro_revisado_em = minuta_assinada_em WHERE minuta_assinada = true` para que cedentes já ativos tenham um marco inicial.
- RPC `marcar_cadastro_revisado(_cedente_id uuid, _observacao text)`:
  - Permite `admin`, `formalizacao`, `cadastro`, `gestor_geral`.
  - Atualiza as duas colunas com `now()` e `auth.uid()`.
  - Insere evento `'cadastro_revisado'` em `cedente_history` com a observação.

Sem cron, sem trigger pesado — o cálculo é trivial em SQL/JS quando precisar.

### UI — onde o alerta aparece

**1. Página `/formalizacao` — aba "Contratos assinados"**

Adicionar **coluna nova "Renovação"** (entre Status e Ações) com badge:
- 🟢 `Em dia · 4 meses`
- 🟡 `Vence em 18d`
- 🔴 `Vencida há 12d`

Ordenação padrão: cedentes vencidos primeiro, depois "vence em breve", depois "em dia".

Na linha vencida/atenção, o botão **Ações** ganha um ícone secundário **"Marcar revisado"** (`RotateCcw`) que dispara a RPC e recarrega.

**2. StatCards do topo da Formalização**

Trocar/adicionar um card destacado quando houver pendências:
- "Renovações vencidas: **N**" (vermelho se N>0)

Isso já entrega o alerta visual logo que o usuário entra na página.

**3. Sidebar**

Adicionar um pequeno badge numérico ao lado do item **"Formalização"** quando houver renovações vencidas (`N`). Reusa a mesma query rápida (`count` em `cedentes` onde `minuta_assinada = true AND cadastro_revisado_em < now() - interval '6 months'`). Pequeno hook compartilhado em `useRenovacaoCount()`.

**4. Página do cedente (`/cedentes/:id`, aba Formalização)**

Banner topo da aba:
- 🔴 "Renovação cadastral vencida há Xd. **[Marcar como revisado]**"
- 🟡 "Próxima renovação em Xd. **[Marcar como revisado]**"
- (silencioso quando em dia)

O botão abre um pequeno dialog com textarea opcional (observação) → chama a RPC.

### Por que essa solução é a mais simples e robusta

- **Uma coluna, um cálculo** — sem cron, sem worker, sem fila de notificações. O alerta "se calcula sozinho" toda vez que a tela renderiza.
- **Histórico já vem de graça** via `cedente_history` (cada revisão vira um evento `cadastro_revisado`, visível na timeline do cedente).
- **Backfill automático** garante que cedentes antigos não apareçam todos como "vencidos" no primeiro deploy — começam a contar a partir da assinatura.
- **Escalável** — mais tarde dá para plugar em cima:
  - e-mail/notificação 30 dias antes de vencer (edge function diária),
  - bloqueio automático para passar para `inativo` após X dias vencidos,
  - dashboard de compliance.

### Arquivos

**Migration**
- `supabase/migrations/<timestamp>_add_renovacao_cadastral.sql` — colunas + backfill + RPC `marcar_cadastro_revisado`.

**Novos**
- `src/lib/cadastro-renovacao.ts` — função `computeRenovacao()` + tipos.
- `src/hooks/useRenovacaoCount.ts` — hook leve com count para sidebar.
- `src/components/cedentes/MarcarRevisadoDialog.tsx` — dialog com observação opcional.

**Editar**
- `src/pages/Formalizacao.tsx` — nova coluna, novo StatCard, ordenação, botão "Marcar revisado".
- `src/components/AppSidebar.tsx` — badge no item Formalização.
- `src/pages/CedenteDetail.tsx` (aba Formalização) — banner contextual + botão.
- `src/components/cedentes/CedenteHistoryTab.tsx` — render do evento `cadastro_revisado`.

### Fora de escopo (para depois, se você quiser)

- Notificações por e-mail.
- Mudança automática de stage para "inativo" quando muito vencido.
- Periodicidade configurável por cedente/setor (hoje fixa em 6 meses, mas o número fica num único lugar — `RENOVACAO_MESES = 6` — fácil de virar setting).
