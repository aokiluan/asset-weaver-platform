## Objetivo
Aplicar o padrão ultracompacto (header + linhas internas) aos painéis "Histórico de versões" do Relatório comercial e Análise de crédito, alinhando ao visual dos demais cards de accordion do projeto.

## Mudanças

### 1. `src/components/cedentes/VisitReportVersionsPanel.tsx` (linhas 92-132)
- Remover wrapper extra `<div className="border rounded-md">` e usar diretamente o `Accordion` com `space-y-0.5`.
- `AccordionItem`: `border-0 px-4` → `border rounded-lg bg-card px-3` (mesmo padrão dos outros cards).
- `AccordionTrigger`: adicionar `hover:no-underline` e título com `text-sm font-medium`; ícone `History` `h-4` → `h-3.5`.
- Linhas internas: `space-y-2 pt-1` → `space-y-1`; cada linha `px-3 py-2` → `px-2.5 py-1.5`.
- Fontes: `font-medium` no v1/v2 → `text-[13px] font-medium`; metadados `text-xs` → `text-[11px]`.
- Badges (atual/contador): `text-[10px] px-1.5 py-0 h-[18px]`.
- Botão "Ver": `h-7 text-[11px]`, ícone `h-3 w-3`.

### 2. `src/components/credito/CreditReportVersionsPanel.tsx` (linhas 93-133)
Aplicar exatamente as mesmas mudanças do item 1.

## Resultado
Painéis de histórico de versões em ambos os relatórios ficam visualmente idênticos aos cards de seção (Identificação, Cabeçalho da visita etc.) e linha de versão fica mais densa.