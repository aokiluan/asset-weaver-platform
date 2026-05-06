## Objetivo

Adicionar um botão **"Gerar PDF"** no dialog "Versão N" de `VisitReportVersionsPanel.tsx`, para baixar o PDF daquela versão específica do relatório comercial.

## Mudanças

### 1. Extrair `gerarPdf` para módulo reutilizável
Hoje a função vive dentro de `CedenteVisitReportForm.tsx` (linhas 264–421) e usa o `form` local. Vou extraí-la para um novo arquivo `src/lib/visit-report-pdf.ts` exportando `generateVisitReportPdf(snapshot, cedenteId)`, recebendo o snapshot (mesmo shape do `form`: data_visita, tipo_visita, visitante, entrevistado_*, modalidades, empresas_ligadas, avalistas_solidarios, parecer_comercial, pontos_atencao, fotos, etc.) e o `cedenteId` (para buscar razão social/CNPJ no header).

`CedenteVisitReportForm.tsx` passa a chamar `generateVisitReportPdf(form, cedenteId)` — mesmo comportamento do botão atual, sem mudança visual.

### 2. Botão no dialog de versão
Em `VisitReportVersionsPanel.tsx`, dentro do `<DialogContent>` da versão aberta, adicionar um botão `"Gerar PDF"` (variant outline, ícone `FileDown`, com loading via `Loader2`) no topo do conteúdo, ao lado do título ou abaixo da linha de data/autor.

Ao clicar: chama `generateVisitReportPdf(opened, cedenteId)`. O snapshot da versão já contém todos os campos necessários (estão sendo selecionados no `select("*")` do painel). Vou só garantir que o `VersionRow` inclua os campos extras usados pelo PDF (entrevistado_cargo/cpf/telefone/email, ramo_atividade, faturamento_mensal, principais_produtos, qtd_funcionarios, percentuais de venda, parceiros_financeiros) — adicionar à interface; o `select("*")` já traz tudo.

### 3. Prop nova no painel
`VisitReportVersionsPanel` precisa receber `cedenteId` como prop (hoje só recebe `reportId` e `refreshKey`) para passar ao gerador. Atualizar a chamada em `CedenteVisitReportForm.tsx` para passar `cedenteId`.

## Arquivos

- **Criado:** `src/lib/visit-report-pdf.ts` — função `generateVisitReportPdf(snapshot, cedenteId)` com a lógica atual movida.
- **Editado:** `src/components/cedentes/CedenteVisitReportForm.tsx` — substituir a função inline por import; passar `cedenteId` ao `VisitReportVersionsPanel`.
- **Editado:** `src/components/cedentes/VisitReportVersionsPanel.tsx` — nova prop `cedenteId`, botão "Gerar PDF" no dialog, estado de loading local.

Sem migração nem mudança de schema.
