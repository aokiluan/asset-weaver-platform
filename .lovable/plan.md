## Objetivo

Evitar perda de dados digitados em caso de refresh, queda de conexão ou fechamento acidental. Vou implementar **autosave de rascunho local** (localStorage) com restauração automática nos formulários longos do projeto.

## Como funciona

1. **Salva enquanto digita**: a cada alteração, com debounce de ~600ms, o estado do formulário é serializado em `localStorage` sob uma chave única por usuário.
2. **Restaura ao abrir**: quando o form monta, se existir rascunho válido, o conteúdo é carregado automaticamente e mostra um aviso discreto: *"Rascunho restaurado · há X min"* com botão **"Descartar"**.
3. **Limpa após salvar com sucesso**: assim que o `INSERT`/`UPDATE` no banco volta sem erro, a chave do rascunho é removida.
4. **Indicador visual**: pequeno texto no rodapé do form: *"Rascunho salvo · 14:02"*.
5. **Escopo por usuário**: chave inclui o `user.id` para não vazar entre contas no mesmo navegador.
6. **TTL de 7 dias**: rascunhos mais antigos são descartados automaticamente.
7. **Sem arquivos**: uploads de documento ficam fora do rascunho (apenas campos de texto/número/data/select).

## O que vou criar

### 1. Hook `src/hooks/useFormDraft.ts`

```ts
const { restored, lastSavedAt, discardDraft, clearDraft } = useFormDraft({
  key: `cedente-novo:${user.id}`,
  value: form,
  setValue: setForm,
  enabled: open, // só ativa enquanto o form está visível
});
```

### 2. Componente `src/components/ui/draft-indicator.tsx`

Bloco compacto exibido no rodapé dos forms com timestamp do último rascunho salvo e botão "Descartar rascunho".

### 3. Aplicar nos 6 formulários

| Formulário | Chave do rascunho |
|---|---|
| `CedenteNovoSheet` | `draft:cedente-novo:<userId>` |
| `CedenteFormDialog` | `draft:cedente-edit:<cedenteId>` |
| `CedenteRepresentantesTab` (estado dos cards não persistidos / em edição) | `draft:representantes:<cedenteId>` |
| `CedenteVisitReportForm` | `draft:visit-report:<cedenteId>` |
| `CreditReportForm` | `draft:credit-report:<cedenteId>` |
| `LeadFormDialog` | `draft:lead:<leadId\|new>:<userId>` |

## Por que localStorage e não banco?

Salvar a cada tecla no Supabase geraria escrita excessiva, custos e ruído de histórico/triggers. O rascunho local é instantâneo, gratuito, e cobre exatamente o caso "fechei sem querer / atualizei a página". O save oficial no banco continua acontecendo via botão **Salvar**.

## Arquivos afetados

**Novos**:
- `src/hooks/useFormDraft.ts`
- `src/components/ui/draft-indicator.tsx`

**Editados**:
- `src/components/cedentes/CedenteNovoSheet.tsx`
- `src/components/cedentes/CedenteFormDialog.tsx`
- `src/components/cedentes/CedenteRepresentantesTab.tsx`
- `src/components/cedentes/CedenteVisitReportForm.tsx`
- `src/components/credito/CreditReportForm.tsx`
- `src/components/leads/LeadFormDialog.tsx`
