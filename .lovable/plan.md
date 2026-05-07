## Objetivo

Adicionar barra de progresso e indicadores de seção (bolinhas ⚪/✅) ao Relatório Comercial, no mesmo padrão do Relatório de Crédito.

## Definição de "seção completa"

Cada uma das 5 seções é considerada completa quando seus campos-chave estão preenchidos:

1. **Cabeçalho da visita** — `data_visita` e `visitante` preenchidos.
2. **Dados do negócio** — `ramo_atividade`, `faturamento_mensal` e `principais_produtos` preenchidos.
3. **Informações adicionais** — `parceiros_financeiros` preenchido **ou** ao menos 1 item em `empresas_ligadas`.
4. **Pleito de crédito** — `limite_global_solicitado` preenchido **e** ao menos 1 modalidade com `ativo: true`.
5. **Parecer comercial** — `parecer_comercial` preenchido (já é obrigatório no save).

## Mudanças em `src/components/cedentes/CedenteVisitReportForm.tsx`

1. Importar `CheckCircle2`, `Circle` de `lucide-react`, `Progress` de `@/components/ui/progress` e `Badge` de `@/components/ui/badge`.
2. Criar helper local `isSectionComplete(form, key)` com as regras acima e `useMemo` para `completas` (0–5).
3. Substituir o cabeçalho atual (linhas 432–458) por um card no mesmo estilo do `CreditReportForm`:
   - Título "Relatório comercial" + subtítulo "Inclui dados da visita, do negócio e o pleito de crédito."
   - Badge "Versão atual: vN" (quando existir) + badges "Somente leitura" / "Editando nova versão".
   - Badge `{completas}/5 seções` à direita.
   - Botões "Alterar relatório" / "Cancelar" / "Gerar PDF" mantidos.
   - `<Progress value={(completas/5)*100} className="h-2" />` abaixo.
4. Em cada `AccordionTrigger` das 5 seções, prefixar o título com `<CheckCircle2 className="h-4 w-4 text-green-600" />` se completa, ou `<Circle className="h-4 w-4 text-muted-foreground" />` caso contrário, mantendo o texto "1. Cabeçalho da visita" etc.

## Escopo

Apenas `src/components/cedentes/CedenteVisitReportForm.tsx`. Sem mudanças de schema, sem novos arquivos.