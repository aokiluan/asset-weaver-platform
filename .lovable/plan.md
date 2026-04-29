## Objetivo

1. **Trocar o estilo das abas principais** do `CedenteDetail` pelo mesmo padrão visual usado hoje nas sub-abas (botões com `border-b-2` ativo, sem o "pill" do shadcn `Tabs`).
2. **Promover "Comitê" a aba principal** independente, lado a lado com "Análise de crédito", removendo o sistema de sub-abas.

## Layout final (abas principais)

```
Resumo │ Representantes │ Documentos │ Relatório comercial │ Análise de crédito │ Comitê │ Histórico
─────────────────────────────────────────────────────────────────────────────────────────────
```

Estilo: linha de botões com `border-b` na faixa, e a aba ativa com `border-primary text-foreground`, inativas com `border-transparent text-muted-foreground`.

## Mudanças

### `src/pages/CedenteDetail.tsx`

- **Remover** o uso de `Tabs/TabsList/TabsTrigger/TabsContent` do shadcn nessa página.
- **Adicionar** um array de definição de abas:
  ```ts
  const TABS = [
    { v: "resumo", label: "Resumo" },
    { v: "representantes", label: "Representantes legais" },
    { v: "documentos", label: "Documentos", badge: pendentesCount },
    { v: "visita", label: "Relatório comercial" },
    { v: "credito", label: "Análise de crédito", icon: ClipboardList },
    { v: "comite", label: "Comitê", icon: Vote },
    { v: "historico", label: "Histórico" },
  ];
  ```
- Renderizar a barra de abas no estilo das sub-abas:
  ```tsx
  <div className="flex gap-1 border-b overflow-x-auto">
    {TABS.map(t => (
      <button onClick={() => onTabChange(t.v)}
        className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap ${
          tab === t.v ? "border-primary text-foreground"
                       : "border-transparent text-muted-foreground hover:text-foreground"
        }`}>
        {t.icon && <t.icon className="h-3.5 w-3.5" />}
        {t.label}
        {t.badge ? <Badge>...</Badge> : null}
      </button>
    ))}
  </div>
  ```
- Substituir cada `<TabsContent value="x">` por `{tab === "x" && (...)}`.
- **Aba "Análise de crédito"**: passa a renderizar **somente** o `CreditReportForm` (mais o card de proposta vinculada). Sem sub-abas internas.
- **Aba "Comitê"** (nova, no nível principal):
  - Se houver `latestProposal`: renderiza `<ComiteGameSession proposalId=... votosMinimos=... proposalStage=... />`.
  - Se não houver: estado vazio com ícone `Vote` e mensagem "Comitê será habilitado quando houver proposta encaminhada".
- Remover estado `creditoSubTab` e `setCreditoSubTab` (não são mais necessários).
- Atualizar o tipo do estado `tab` para incluir `"comite"` e ajustar `onTabChange` se houver tipagem estrita.

### Compatibilidade
- `onTabChange` já manipula query string (`?tab=`); incluir `"comite"` na lista de valores válidos.
- Nenhuma mudança em outros componentes, no banco ou em RLS.

## Resultado

Barra de abas no estilo "underline minimalista" (igual às sub-abas atuais), com **Comitê** como aba principal autônoma exibindo a sessão de votação daquele cedente.