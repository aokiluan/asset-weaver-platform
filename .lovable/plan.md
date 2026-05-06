## Objetivo

Tornar o relatório comercial **versionado** e **bloqueado para edição direta** depois de salvo. Alterações exigem uma ação explícita ("Alterar relatório") que cria uma **nova versão**, mantendo todas as anteriores consultáveis. Abre caminho também para o fluxo "revalidação de cadastro → comercial cria novo relatório".

## Como vai funcionar (visão do usuário)

1. **Primeiro preenchimento:** igual ao fluxo atual — preenche e clica em **Salvar relatório**. Vira a versão 1, marcada como "atual".
2. **Depois de salvo:** o formulário abre em **modo somente leitura**. Os campos ficam desabilitados e aparece um botão **"Alterar relatório"** no topo.
3. **Ao clicar em "Alterar relatório":** o formulário destrava (continua mostrando os dados da versão atual). Aparece um campo obrigatório **"Motivo da alteração"** e o botão inferior muda para **"Salvar nova versão"**. O usuário também pode **cancelar** e voltar à leitura.
4. **Ao salvar a nova versão:** a versão anterior é arquivada (vira histórico) e a nova passa a ser a "atual" (v2, v3, …).
5. **Histórico de versões:** painel lateral/colapsável "Versões anteriores" listando cada versão com nº, data, autor, motivo. Clicando, abre um **drawer somente leitura** com aquele snapshot. Não dá para editar uma versão antiga, só consultar (e baixar PDF dela).
6. **Revalidação de cadastro:** quando o cedente voltar para o estágio comercial (revalidação), o relatório atual é marcado como "requer revisão" e o comercial é obrigado a criar uma nova versão antes de avançar — mesmo botão "Alterar relatório", só com um aviso visual diferente.

## Mudanças no banco (schema)

Adicionar versionamento sem perder os dados atuais:

- Nova tabela `cedente_visit_report_versions` com **as mesmas colunas** de `cedente_visit_reports` + `versao` (int), `report_id` (FK lógica para `cedente_visit_reports.id`), `motivo_alteracao` (text), `created_by`, `created_at`, `is_current` (bool).
- Em `cedente_visit_reports`, adicionar: `versao_atual` (int, default 1), `precisa_revisao` (bool, default false, para o gatilho de revalidação).
- **Migração de dados:** para cada relatório existente, criar uma linha em `versions` como versão 1, `is_current = true`, sem motivo.
- **Comportamento de save:** salvar nova versão = `INSERT` em `versions` com `versao = atual + 1`, marcar antigas como `is_current = false`, atualizar a linha "espelho" em `cedente_visit_reports` com os campos novos e incrementar `versao_atual`. Mantém a linha principal como ponteiro da versão corrente (sem quebrar nada que já lê de `cedente_visit_reports`, inclusive RLS de outras telas).
- **RLS na nova tabela:** mesma regra de visibilidade dos relatórios (segue cedente). INSERT só para o autor (`created_by = auth.uid()` + papel comercial/admin/gestor). UPDATE/DELETE só admin (versões antigas são imutáveis).
- **Índices:** `(cedente_id, versao desc)` e `(report_id, versao desc)`.

## Mudanças no frontend

Tudo concentrado em `src/components/cedentes/CedenteVisitReportForm.tsx` + 1 componente novo:

- Novo estado `mode`: `"view" | "edit" | "create"`.
  - Sem relatório no banco → `create` (igual hoje).
  - Com relatório → abre em `view`, todos os campos com `disabled` (e selects/checkbox idem).
- Botão **"Alterar relatório"** no topo, ao lado do `DraftIndicator`, visível só em `view` para quem pode editar (comercial dono do registro, gestor, admin — alinhado à RLS atual de UPDATE).
- Em `edit`: campo obrigatório **"Motivo da alteração"** (textarea curta) acima do parecer; botão inferior renomeia para **"Salvar nova versão"**; botão secundário **"Cancelar"** (recarrega versão atual e volta para `view`).
- O `useFormDraft` continua, mas passa a usar key versionada: `visit-report:${cedenteId}:edit:v${versao_atual}` — assim rascunho de "alteração em andamento" não vaza para depois de salvo, e o draft é limpo no save com sucesso.
- Novo bloco colapsável **"Versões anteriores"** listando `versao`, `created_at`, autor (via join no profiles), motivo. Cada item abre um **`Dialog` em modo leitura** reaproveitando o mesmo formulário com `mode="view"` e dados daquela versão (e botão "Baixar PDF desta versão" reaproveitando a função `gerarPdf` já existente, recebendo o snapshot por prop).
- Aviso visual quando `precisa_revisao = true` (banner no topo: "Cadastro em revalidação — crie uma nova versão do relatório antes de avançar").

## Fluxo de revalidação (gatilho)

- Quando o stage do cedente voltar para o estágio comercial após já ter passado dali (ex.: `comite → cadastro/comercial`), um trigger no banco marca `cedente_visit_reports.precisa_revisao = true`.
- O `CedenteStageActions` passa a bloquear o avanço enquanto `precisa_revisao = true` E não houver uma versão nova criada após o `enviado_analise_em` mais recente.
- Ao salvar uma nova versão, o trigger limpa `precisa_revisao`.

## Pontos técnicos a confirmar antes de codar

1. **Edição de modalidades/fotos em versão nova:** as fotos ficam no storage; a nova versão referencia os mesmos `path`s (sem duplicar arquivo). Remoção de foto numa nova versão **não apaga** do storage se a foto ainda existir em alguma versão anterior — a função `removerFoto` precisa virar "remover da versão em edição" e o cleanup do storage só roda para fotos órfãs (job futuro; por ora, manter arquivo).
2. **Tipos do Supabase (`types.ts`)** serão regerados automaticamente após a migração — nada a editar à mão.
3. **PDFs e leitura por outras telas** (crédito, comitê) continuam lendo de `cedente_visit_reports` (sempre a versão atual). Nenhuma quebra esperada.

## Entregáveis

- Migração SQL (nova tabela + colunas + backfill v1 + RLS + trigger de revalidação).
- `CedenteVisitReportForm.tsx` refatorado com modos view/edit/create + motivo + salvar nova versão.
- Novo componente `VisitReportVersionsPanel.tsx` (lista + dialog de leitura).
- Pequeno ajuste em `CedenteStageActions.tsx` para respeitar `precisa_revisao`.
