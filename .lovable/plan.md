## Objetivo

Garantir que cada perfil (`admin`, `comercial`, `cadastro`, `credito`, `comite`, `formalizacao`, `financeiro`, `gestor_geral`) acesse e atue exatamente nas etapas certas da esteira do cedente — em **3 camadas**: (1) navegação/rotas, (2) ações na UI (botões/forms), (3) RLS no banco. Hoje as três camadas existem mas estão **desalinhadas em vários pontos** (ver achados).

---

## 1. Matriz canônica (proposta — valide antes de eu codar)

### Etapas do cedente
`novo → cadastro → analise → comite → formalizacao → ativo` (+ `inativo`)

### Quem **avança** cada etapa (botão "Enviar para…")

| De → Para | Papéis autorizados |
|---|---|
| novo → cadastro | comercial (dono), admin |
| cadastro → analise | cadastro, admin |
| analise → comite | credito, admin |
| comite → formalizacao | (automático após decisão do comitê) |
| formalizacao → ativo | formalizacao, admin |
| qualquer → novo (devolver) | cadastro, credito, comite, formalizacao, admin |
| `gestor_geral` | mesmas permissões de admin para mover |

> Mudança vs. hoje: hoje `cadastro` pode mandar p/ Comercial, e `to-cadastro` permite `comercial+cadastro+admin` mesmo a partir de "analise/comite". Vou normalizar para a matriz acima.

### Quem **edita dados** do cedente por etapa

| Etapa | Quem edita dados básicos / docs / visita / pleito |
|---|---|
| novo | comercial dono + gestor da equipe + admin |
| cadastro | cadastro + admin (comercial vira read-only) |
| analise | credito + admin (parecer); demais read-only |
| comite | comite + admin (voto/checklist); demais read-only |
| formalizacao | formalizacao + admin (minuta, anexo assinado) |
| ativo / inativo | só admin (correções pontuais) |

> Mudança vs. hoje: a RLS de `cedentes` permite que cadastro/credito/comite/formalizacao editem em **qualquer** etapa. Vamos restringir por etapa via policy + função `can_edit_cedente(stage, user)`.

### Acesso a páginas (sidebar + RoleGuard)

| Página | Vê |
|---|---|
| /pipeline (CRM leads) | comercial, gestor_geral, admin |
| /cedentes, /cedentes/:id | todos os papéis operacionais (read conforme RLS atual) |
| /comite | comite, credito, admin, gestor_geral |
| /formalizacao | formalizacao, cadastro, admin, gestor_geral |
| /financeiro | financeiro, admin |
| /gestao/* | todos autenticados (já é) |
| /configuracoes/*, /bi/* | admin |

> Mudança vs. hoje: `gestor_geral` não está em várias rotas/sidebar. Vou incluir.

---

## 2. Achados da auditoria (o que está desalinhado hoje)

**Rotas / Sidebar**
- `gestor_geral` não aparece em `/comite`, `/formalizacao`, `/financeiro` nem na sidebar (somente quando também tiver outro papel).
- "CRM" e "Cedentes" aparecem para todos — ok, mas **Leads** consome `pipeline_stages` e a RLS de `leads` exclui `comercial` quando não é dono → comercial sem leads próprios vê página vazia sem aviso.

**Ações de etapa (`CedenteStageActions`)**
- `to-comercial` é mostrado para `formalizacao` voltar ao início, mas role list não inclui `formalizacao`.
- `to-cadastro` aceita `comercial+cadastro+admin` independentemente da etapa de origem (deveria ser só `cadastro/admin` quando vier de `analise/comite`).
- `to-comite` só aparece para `credito/admin`, mas `gestor_geral` não consegue destravar fluxo travado.
- Não há transição explícita `comite → formalizacao` (hoje depende da página `Comite` mudar o stage); preciso confirmar que isso ocorre ao registrar a decisão.
- Não há transição `formalizacao → ativo` em `CedenteStageActions` — só na página `Formalizacao` (botão "Ativar"), e está liberado para `formalizacao/cadastro/admin` (cadastro não deveria ativar).

**Edição de dados (RLS `cedentes` UPDATE)**
- Política atual permite `cadastro/credito/comite/formalizacao` editarem **tudo em qualquer etapa**. Sem trava por `stage`. Vou criar `public.can_edit_cedente(_user, _stage)` SECURITY DEFINER e refazer a policy.
- Mesmo problema em `cedente_representantes`, `documentos`, `cedente_visit_reports` (versões), `credit_reports` — preciso amarrar edição à etapa atual do cedente.

**Comitê / Crédito**
- `committee_votes` insert exige `comite|admin` ✅; mas `credit_opinions` permite `credito|admin` em qualquer momento (mesmo após `comite`). Vou restringir a `stage = analise` (proposta) ou sempre, conforme você decidir.
- Encerrar/revelar sessão de comitê: `committee_sessions` UPDATE permite `admin/comite/credito/gestor_geral` — ok, mas **mover o cedente p/ formalização** após decisão precisa ser garantido por trigger (hoje é client-side).

**Formalização**
- `Formalizacao.tsx` permite "Anexar contrato" e "Ativar" para `cadastro` — deveria ser só `formalizacao/admin`.
- O botão de upload depende da existência de uma categoria de doc específica; já corrigimos a categoria, mas vou tornar o gate explícito (mensagem clara se faltar config).

**Financeiro**
- Página guardada por `admin|financeiro` ✅. Sem ações sensíveis hoje além de visualização — manter.

**Admin / Configurações**
- `gestor_geral` não acessa `/configuracoes/*` nem `/bi/*` — ok se for intencional. **Confirmar.**

---

## 3. Plano de correção (em ondas, cada uma testável)

### Onda A — Navegação e rotas
1. Adicionar `gestor_geral` nas listas de papéis das rotas `/comite`, `/formalizacao`, `/financeiro` e nos itens da sidebar.
2. Mostrar item "Comitê"/"Formalização" também para `gestor_geral`.
3. Em `/leads` (CRM) sem itens visíveis, exibir empty-state explicando o filtro por owner.

### Onda B — Ações de etapa (UI)
4. Reescrever a tabela `TRANSITIONS` em `CedenteStageActions.tsx` para refletir a matriz canônica acima (incluindo `gestor_geral` em todas).
5. Mover o botão **"Ativar cedente"** de `Formalizacao.tsx` para também aparecer em `CedenteDetail` quando `stage='formalizacao'` e gates ok; restringir a `formalizacao|admin|gestor_geral`.
6. Garantir que ao registrar decisão final do comitê o stage avança automaticamente para `formalizacao` (verificar `ComiteGameSession` — provavelmente já faz, só auditar).

### Onda C — RLS de edição por etapa (banco)
7. Criar função `public.can_edit_cedente(_user uuid, _stage cedente_stage)` retornando true conforme a tabela "Quem edita dados" acima.
8. Substituir a policy `Editar cedentes` para usar essa função.
9. Aplicar a mesma regra (via subquery no stage do cedente) em `cedente_representantes`, `documentos`, `cedente_visit_reports`, `cedente_visit_report_versions`, `credit_reports`, `credit_report_versions`.
10. `credit_opinions` e `committee_votes`: amarrar INSERT à etapa correta da proposta.

### Onda D — Verificação
11. Smoke-test com cada papel (lista no relatório final): logar como cada perfil de teste e validar que vê/age só onde deve.
12. Entregar uma **matriz final** (tabela CSV em `/mnt/documents/`) com papel × ação × resultado esperado vs. real.

---

## 4. Pontos que preciso que você confirme antes de eu começar

1. **Matriz canônica acima** está correta? (especialmente: `comercial` perde edição quando sai de `novo`; `cadastro` não ativa cedente).
2. **Trava de edição por etapa**: confirmado que sim — vou aplicar conforme a tabela "Quem edita dados".
3. **`gestor_geral` em Configurações/BI**: deve continuar restrito a admin? (default: sim).
4. **`comite → formalizacao`**: deve ser 100% automático após decisão (sem botão manual)? (default: sim).

Assim que você validar (ou ajustar) esses 4 pontos, eu executo as ondas A→D em sequência, com migração de RLS isolada para você revisar antes de aprovar.