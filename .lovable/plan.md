
## Objetivo

1. **Excluir** as páginas/rotas `/credito`, `/credito/:id` e `/cadastro/fila` (e seus links no menu lateral).
2. **Manter todo o trabalho dentro do `CedenteDetail`** — cada perfil atua na aba que lhe cabe.
3. **Habilitar a aba "Comitê"** automaticamente quando o cedente chega ao estágio `comite`, sem depender de criar proposta manualmente.

---

## O que sai

### Arquivos deletados
- `src/pages/Credito.tsx`
- `src/pages/CreditoDetail.tsx`
- `src/pages/cadastro/FilaCadastros.tsx`
- `src/components/credito/ProposalFormDialog.tsx` (não usado em nenhum outro lugar)

### Rotas removidas em `src/App.tsx`
- `/credito` e `/credito/:id`
- `/cadastro/fila`
- Imports correspondentes.

### Sidebar (`src/components/AppSidebar.tsx`)
Remover do grupo **Operação**:
- Item "Crédito" (`/credito`)
- Item "Análise de cadastro" (`/cadastro/fila`)

Mantém: CRM, Cedentes, Comitê, Formalização.

### Compatibilidade de URL
Adicionar um redirect simples para quem tinha link antigo:
- `/credito` → `/cedentes`
- `/credito/:id` → `/cedentes` (não dá pra resolver o cedente sem query, então redireciona para a lista)
- `/cadastro/fila` → `/cedentes`

---

## Habilitar o Comitê dentro do cedente

Hoje a aba "Comitê" mostra "ainda não disponível" porque depende de uma `credit_proposal` existir, e ninguém cria proposta (já que o fluxo é guiado pelo `cedente.stage`).

### Solução: provisionar a proposta automaticamente

**Migration (uma)** com:

1. Função `public.ensure_proposal_for_cedente(_cedente_id uuid)` — `SECURITY DEFINER`:
   - Se já existir `credit_proposal` para o cedente, retorna o id da mais recente.
   - Caso contrário, cria com:
     - `valor_solicitado = COALESCE(cedente.limite_aprovado, cedente.faturamento_medio, 0)`
     - `stage = 'comite'`
     - `created_by = auth.uid()`
   - O trigger existente `set_proposal_approval_level` define a alçada automaticamente.
   - Restrição: só executa se `can_view_proposal(auth.uid(), _cedente_id)` for verdadeiro.

2. Trigger em `cedentes`: quando `stage` muda para `'comite'`, chamar a função (cria proposta se ainda não há).

### Alterações em `src/pages/CedenteDetail.tsx` — aba Comitê

Substituir o estado vazio atual por lógica em três casos:

```
cedente.stage NÃO chegou em 'comite'  →  mensagem clara:
   "O comitê é habilitado quando o cedente avança para a etapa 'Comitê'.
    Etapa atual: {STAGE_LABEL[stage]}."
    (sem botão de ação, é só informativo)

cedente.stage = 'comite' E latestProposal = null
   →  chama RPC `ensure_proposal_for_cedente(cedente.id)` no useEffect
   →  recarrega e renderiza <ComiteGameSession />

cedente.stage = 'comite' E latestProposal existe
   →  renderiza <ComiteGameSession /> (comportamento atual)
```

Como o trigger garante a proposta no momento do avanço de stage, a chamada RPC é apenas um fallback para cedentes que já estão em `comite` antes desta mudança.

### Pequeno ajuste na aba "Análise de crédito"
Como o `ProposalFormDialog` será removido, o cabeçalho "Proposta de crédito vinculada" continua aparecendo (read-only) e o `CreditReportForm` segue funcionando exatamente como hoje. Sem botão de criar proposta — a proposta nasce automaticamente no avanço para `comite`.

---

## Permissões por aba (mantém a esteira por perfil dentro do cedente)

Sem mudança de RLS. O que a UI já faz, e continua fazendo:

| Aba | Quem age |
|---|---|
| Documentos | comercial/owner envia; analista_cadastro/gestor_comercial/admin revisa |
| Relatório comercial | comercial/owner/gestor_comercial/admin |
| Análise de crédito | analista_credito, gestor_credito, gestor_risco, admin |
| Comitê | comite vota; gestor_credito/gestor_risco/admin gerenciam sessão |

A página `/comite` (lista) continua existindo como **fila** e seus cards já apontam para `/cedentes/:id?tab=comite`.

---

## Arquivos que mudam

- **Deletar**: `src/pages/Credito.tsx`, `src/pages/CreditoDetail.tsx`, `src/pages/cadastro/FilaCadastros.tsx`, `src/components/credito/ProposalFormDialog.tsx`.
- **Editar**: `src/App.tsx` (remover rotas + adicionar redirects), `src/components/AppSidebar.tsx` (remover dois itens), `src/pages/CedenteDetail.tsx` (lógica nova da aba Comitê).
- **Migration nova**: função `ensure_proposal_for_cedente` + trigger em `cedentes`.

## Resultado

- Menu lateral fica mais limpo: sem "Crédito" e sem "Análise de cadastro".
- Tudo acontece em **uma única tela** (`CedenteDetail`), aba a aba.
- Aba **Comitê** abre sozinha assim que o cedente entra em `stage='comite'` — sem mensagem de "indisponível" para esse caso.
