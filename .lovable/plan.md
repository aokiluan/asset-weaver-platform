## Objetivo

1. Mostrar o **detalhe do pleito** (limite global + modalidades operacionais com limite/prazo/taxa/observação) dentro do briefing de votação, no mesmo padrão visual da imagem 2 (do relatório comercial).
2. Corrigir os botões **"Relatório comercial completo"** e **"Análise de crédito completa"** que não estão navegando.

---

## 1. Card "Pleito de crédito" no `VoteBriefing`

Hoje o briefing mostra apenas um badge `Pleito R$ 0` no header. Vamos adicionar uma **seção dedicada** com o detalhamento das modalidades, idêntica em estrutura ao bloco do relatório comercial (imagem 2), porém em modo somente leitura e ultracompacto (padrão Nibo).

### Dados a carregar (em `VoteBriefing.tsx`)

Estender o `select` de `cedente_visit_reports` para incluir:
- `limite_global_solicitado`
- `modalidades` (jsonb com `desconto_convencional`, `comissaria`, `comissaria_escrow`, `nota_comercial` — cada um com `{ ativo, limite, prazo_medio, taxa, observacao }`).

### Renderização

Novo bloco entre o header e as recomendações:

```text
┌─ Pleito de crédito ────────────────────────────────┐
│ Limite global solicitado:  R$ 200.000              │
│                                                     │
│ Modalidades operacionais                            │
│ ┌───────────────────────┐ ┌───────────────────────┐│
│ │ ✓ Desconto convencional│ │ ✓ Comissária          ││
│ │ Limite  Prazo  Taxa    │ │ Limite  Prazo  Taxa   ││
│ │ 150k    40d    3,5%    │ │ 50k     120d   4,0%   ││
│ │ Obs: …                 │ │ Obs: …                ││
│ └───────────────────────┘ └───────────────────────┘│
│ ☐ Comissária c/ escrow   ☐ Nota comercial          │
└────────────────────────────────────────────────────┘
```

- Apenas modalidades **ativas** mostram limite/prazo/taxa/observação detalhados.
- Modalidades inativas aparecem como linha simples com checkbox vazio + nome (estado "não solicitada").
- Grid `md:grid-cols-2 gap-2`, padding `p-2.5`, labels `text-[10px] leading-none`, valores `text-[12px] leading-tight`, conforme padrão Nibo VIEW denso.
- Remover o badge `Pleito R$ X` do header (passa a ser redundante).

---

## 2. Fix dos botões "Relatório comercial completo" / "Análise de crédito completa"

### Causa

Em `src/pages/CedenteDetail.tsx`:

```tsx
const initialTab = searchParams.get("tab") ?? "resumo";
const [tab, setTab] = useState(initialTab);
```

O estado `tab` é inicializado **uma única vez** no mount. Os `<Link to="...?tab=visita">` do `VoteBriefing` atualizam a URL, mas como o usuário já está na mesma rota (`/cedentes/:id`), o componente não remonta — o `useState` mantém `"comite"` e a tab visível não muda. Por isso "nada acontece".

### Correção

Sincronizar `tab` com a query string via `useEffect`:

```tsx
useEffect(() => {
  const t = searchParams.get("tab") ?? "resumo";
  setTab(t);
}, [searchParams]);
```

E em `onTabChange`, manter o `setSearchParams` (o effect já cuida do restante). Opcionalmente substituir `tab` state derivado direto de `searchParams` (sem state local), mas o effect é a mudança mínima.

---

## Arquivos editados

- `src/components/credito/VoteBriefing.tsx` — carregar `modalidades` + `limite_global_solicitado`, renderizar novo bloco "Pleito de crédito" no padrão da imagem 2.
- `src/pages/CedenteDetail.tsx` — `useEffect` sincronizando `tab` com `searchParams`.

## O que NÃO muda

- Estrutura geral do briefing (recomendações, pontos, conclusão, atalhos).
- Padrão Nibo ultracompacto.
- Lógica de votação / quórum.
