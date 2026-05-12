## Aposentar o campo `status` (legado) do Cedente

O campo `cedentes.status` (`prospect | em_analise | aprovado | reprovado | inativo`) é legado e duplica o `stage` da esteira (`novo → cadastro → analise → comite → formalizacao → ativo / inativo`), causando confusão (ex.: badge "Prospect" na lista). Esta entrega remove o campo de vez, deixando o `stage` como fonte única de verdade.

### Escopo

**Frontend**
- `src/pages/Cedentes.tsx`
  - Remover tipo, `STATUS_LABEL`, `STATUS_VARIANT`, filtro por status, badge na linha selecionada e KPI "Aprovados" baseado em `status === 'aprovado'`.
  - Substituir o filtro "Status" por filtro por `stage` (usar `STAGE_LABEL` de `cedente-stages.ts`).
  - KPI "Aprovados" passa a contar `stage === 'ativo'` (cedentes operacionais). KPI "Limite total" passa a somar `limite_aprovado` de `stage === 'ativo'`.
  - Badge ao lado do nome usa `STAGE_LABEL[stage]` com cor de `STAGE_COLORS`.
- `src/pages/CedenteDetail.tsx`
  - Remover `status` do tipo e do bloco "Status" do header (já existe stepper com o `stage`).
  - Remover o `status: "aprovado"` em fluxo de aprovação automática de documento (linha 670) — usar só `documentos.status`.
- `src/components/cedentes/CedenteFormDialog.tsx`
  - Remover campo Select de status, defaults, watcher e payload de upsert.
- Verificar `Diretorio.tsx`, `DiretorioDetail.tsx`, `Pipeline.tsx`, dashboards de gestão e `cedentes-import.ts` para qualquer leitura de `status` do cedente — substituir por `stage` ou remover.

**Banco**
- Migration:
  1. `ALTER TABLE public.cedentes DROP COLUMN status;`
  2. `DROP TYPE public.cedente_status;` (se não for mais referenciado por outras tabelas — checar antes; se referenciado, manter o tipo e só dropar a coluna).
- Não há RLS, função, trigger ou view conhecidos que dependam desse campo (RLS de cedentes usa `stage` e `owner_id`).

### Validação pós-mudança
- Filtro de etapa funciona na lista de Cedentes.
- KPIs de "Aprovados" e "Limite total" somam corretamente sobre `stage = 'ativo'`.
- Form de cadastro/edição salva sem erro (nenhum payload referenciando `status`).
- `CedenteDetail` carrega sem o bloco "Status" e sem regressão no stepper.
- `bun run build` limpo (tipos do `types.ts` regerados automaticamente após a migration).

### Fora de escopo
- Mudanças em `documentos.status` (esse é outro domínio, permanece).
- Renomear `stage` ou alterar a esteira.
- Tela dedicada de Revalidação (assunto separado, já em discussão).