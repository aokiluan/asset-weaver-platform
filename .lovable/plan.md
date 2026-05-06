## Objetivo
Reduzir ainda mais a distância entre label e campo de input em todo o projeto.

## Mudanças

### 1. `src/components/ui/label.tsx`
- Remover `mb-0.5 inline-block` do `labelVariants` → label sem margem extra.

### 2. `src/components/ui/form.tsx`
- `FormItem`: trocar `space-y-1` por `space-y-0.5` → ~2px entre label e input.

### 3. Formulários (substituir `space-y-1` em wrappers de campo por `space-y-0.5`)
Arquivos:
- `src/components/cedentes/CedenteVisitReportForm.tsx`
- `src/components/credito/CreditReportForm.tsx`
- `src/components/cedentes/CedenteFormDialog.tsx`
- `src/components/cedentes/CedenteNovoSheet.tsx`
- `src/components/cedentes/SocioFormCard.tsx`
- `src/components/cedentes/CedenteRepresentantesTab.tsx`
- `src/components/leads/LeadFormDialog.tsx`

Substituir `className="space-y-1"` (em wrappers Label+Input) por `className="space-y-0.5"`.

## Resultado
Distância label↔input cai de ~6px para ~2px. Fontes e alturas permanecem iguais.