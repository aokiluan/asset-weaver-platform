
# Fase 1 — Fundação: Papéis, Sidebar e Esteira do Cedente

Foco: arrumar a espinha dorsal do sistema. Sem IA, sem Serasa, sem CRDC, sem comitê funcional ainda — isso vem nas próximas fases. O que esta fase entrega é: papéis novos funcionando, menu novo, esteira de 6 estágios com regras de avanço, e uma tela de cedente que já comporta documentos obrigatórios + relatório de visita + pleito de limite.

---

## 1. Novos papéis (roles)

Hoje existem: `admin`, `gestor_comercial`, `comercial`, `analista_credito`, `gestor_risco`, `comite`, `financeiro`.

Vamos para a lista que você pediu:

| Papel | Função |
|---|---|
| `admin` | mantém |
| `gestor_comercial` | mantém |
| `comercial` | mantém |
| `analista_credito` | mantém |
| `gestor_credito` | **novo** (substitui `gestor_risco` no fluxo de crédito) |
| `financeiro` | mantém |
| `gestor_financeiro` | **novo** |
| `relacao_investidor` | **novo** |
| `gestor_relacao_investidor` | **novo** |
| `analista_cadastro` | **novo** (responsável pela etapa "Cadastro" da esteira) |
| `comite` | mantém (membro votante) |

Observação: vou manter `gestor_risco` no enum por compatibilidade com dados existentes, mas ele deixa de ser usado em UI nova. Quem quiser pode migrar usuários `gestor_risco` → `gestor_credito` depois.

Também vou criar o papel **`analista_cadastro`** que você descreveu no fluxo (valida docs e devolve para o comercial ou manda para crédito) — ele não estava na sua lista mas é necessário pelo fluxo que você desenhou.

---

## 2. Sidebar reorganizada

Estrutura nova:

```text
GESTÃO
  └─ Dashboard Comercial
  └─ Dashboard Operacional
  └─ Dashboard Financeiro
  └─ Dashboard Diário

OPERAÇÃO
  └─ Leads
  └─ Pipeline (kanban comercial)
  └─ Cedentes (esteira de 6 estágios)
  └─ Crédito (fila de propostas)
  └─ Comitê (placeholder Fase 2)
  └─ Formalização (placeholder Fase 3)

CONFIGURAÇÕES
  └─ Usuários & Papéis
  └─ Alçadas
  └─ Estágios do Pipeline
  └─ Categorias de Documento
  └─ Datasets / Uploads / Widgets (BI)
```

Visibilidade por papel: cada item da sidebar só aparece pra quem tem o papel certo (ex: `Comitê` só pra `comite` e `admin`, `Financeiro` só pra `financeiro`/`gestor_financeiro`/`admin`, etc).

A sidebar atual já tem agrupamento colapsável e fixar/desafixar — vou só reorganizar os grupos e adicionar os novos itens.

---

## 3. Esteira do cedente (6 estágios)

Substituir o `cedente_status` atual (`prospect`, etc) por um enum novo `cedente_stage`:

```text
novo → cadastro → analise → comite → formalizacao → ativo
                                                   ↘ inativo
```

E em qualquer estágio o cedente pode ser **devolvido** (ex: cadastro devolve pro comercial). Isso é uma transição reversa, não um novo estágio.

### Gates (condicionantes entre estágios)

| Transição | Quem aciona | Gates obrigatórios |
|---|---|---|
| `novo` → `cadastro` | comercial | docs obrigatórios anexados + relatório de visita preenchido + pleito de limite informado |
| `cadastro` → `analise` | analista_cadastro | todos os docs marcados como "validado"; se algum "rejeitado", devolve pra `novo` com pendências |
| `analise` → `comite` | analista_credito | parecer de crédito criado e marcado como "concluído" *(formulário guiado vem na Fase 2 — por ora é um textarea + recomendação)* |
| `comite` → `formalizacao` | sistema | todos os votos do comitê registrados e resultado = aprovado *(comitê real vem na Fase 2 — por ora é um botão "registrar decisão")* |
| `formalizacao` → `ativo` | analista_cadastro | minuta gerada e marcada como "assinada" *(geração PDF vem na Fase 3)* |
| qualquer → `inativo` | gestor_comercial / admin | livre, com motivo |

Cada transição é registrada em `cedente_history` (novo, espelho do que `proposal_history` já faz pra propostas).

### UI da esteira

Na página `/cedentes/:id`, adicionar uma **barra de progresso horizontal** com os 6 estágios. O estágio atual fica destacado, os concluídos com check, os bloqueados em cinza. Embaixo, um card "**Para avançar pro próximo estágio você precisa de:**" listando os gates pendentes em vermelho e os atendidos em verde. Botão "**Avançar para [próximo estágio]**" só fica habilitado quando todos os gates verdes.

---

## 4. Tela do cedente (operação comercial)

Reformular `/cedentes/:id` em **abas**:

1. **Resumo** — dados cadastrais + barra da esteira + gates
2. **Documentos** — upload por categoria, status (pendente/validado/rejeitado), observações do validador
3. **Relatório de visita** — formulário estruturado (data, participantes, contexto, percepções, pontos de atenção, recomendação) — modelo padrão
4. **Pleito de crédito** — valor solicitado, prazo, finalidade, garantias *(vira a base da `credit_proposal` quando for pra análise)*
5. **Histórico** — timeline de todas as transições + quem fez

Categorias de documentos obrigatórios: já existe a tabela `documento_categorias` com flag `obrigatorio`. Vou usar isso. O admin configura quais são obrigatórios em `Configurações > Categorias`.

---

## 5. Fora do escopo desta fase (vai para próximas)

Pra deixar explícito o que **não** estou entregando agora:

- Assistente de IA pra validar documentos (Fase 4)
- Formulário guiado de parecer de crédito + IA (Fase 2/4)
- Integração Serasa (Fase 4, depende de contrato)
- Ambiente de comitê assíncrono completo + notificações + ata em PDF + gamificação (Fase 2 e 5)
- Geração da minuta em PDF + integração CRDC (Fase 3)
- Dashboards de Gestão com dados reais (Fase 2 — por ora ficam placeholders na sidebar)
- Separação cedente vs investidor (módulo investidor inteiro fica pra depois)

---

## Detalhes técnicos (pra referência)

**Banco de dados (migrations):**
- adicionar valores ao enum `app_role`: `gestor_credito`, `gestor_financeiro`, `relacao_investidor`, `gestor_relacao_investidor`, `analista_cadastro`
- criar enum `cedente_stage` (`novo`, `cadastro`, `analise`, `comite`, `formalizacao`, `ativo`, `inativo`)
- adicionar coluna `cedentes.stage cedente_stage NOT NULL DEFAULT 'novo'`
- criar tabela `cedente_visit_reports` (1 por cedente, campos do relatório de visita)
- criar tabela `cedente_history` (espelho de `proposal_history`)
- criar trigger `log_cedente_stage_change` (espelho do trigger de proposta)
- atualizar funções `has_role` / RLS pra reconhecer os novos papéis
- novas RLS policies pra `cedente_visit_reports` e `cedente_history`

**Frontend:**
- `src/components/AppSidebar.tsx`: nova estrutura de 3 grupos (Gestão / Operação / Configurações) + filtragem por papéis novos
- `src/components/cedentes/CedenteStageBar.tsx`: barra visual da esteira + lista de gates
- `src/components/cedentes/CedenteVisitReportForm.tsx`: formulário do relatório de visita
- `src/pages/CedenteDetail.tsx`: refatorar pra abas (Tabs do shadcn já está disponível)
- `src/lib/cedente-stages.ts`: configuração centralizada dos estágios + função `canAdvance(cedente)` que retorna `{ allowed: bool, missingGates: string[] }`
- páginas placeholder pra Comitê e Formalização (só "Em breve" + lista do que vai vir)
- páginas placeholder pros 4 dashboards de Gestão

**O que já existe e vou reaproveitar:**
- `documentos` + `documento_categorias` (upload já funciona)
- `credit_proposals` (vira o registro do pleito)
- `committee_votes` + `credit_opinions` (ficam pra Fase 2)
- estrutura de `RoleGuard`, `useAuth.hasRole`, `AppLayout`
- bucket de storage `cedente-docs`

**Estimativa de arquivos:** ~1 migration grande, ~8 arquivos novos no frontend, ~5 arquivos editados.

---

## O que acontece quando você aprovar

Eu entro em modo de execução e:

1. Crio a migration com os enums, tabelas, triggers e RLS
2. Atualizo a sidebar com a nova estrutura
3. Crio o sistema de gates (`canAdvance`) e a barra visual da esteira
4. Refatoro a tela do cedente em abas (Resumo / Documentos / Visita / Pleito / Histórico)
5. Crio as páginas placeholder dos dashboards e do Comitê/Formalização
6. Atualizo as RLS pra reconhecer os papéis novos

No fim te mostro como testar (criar um cedente, anexar docs, preencher visita, tentar avançar de estágio e ver os gates funcionando).

Aprova esse plano da Fase 1?
