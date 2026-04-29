## Problema

Ao trocar para qualquer aba diferente de "Resumo" na página do cedente, a página volta automaticamente para a aba "Resumo".

## Causa raiz

Em `src/pages/CedenteDetail.tsx`:

1. Componentes filhos (ex.: `DocumentosUploadKanban`, `CedenteRepresentantesTab`, `CedenteVisitReportForm`) chamam `onChanged={load}` / `onSaved={load}` para recarregar dados — e o `DocumentosUploadKanban` faz polling automático enquanto há documentos no status `analisando`.
2. A função `load()` chama `setLoading(true)`, fazendo o componente renderizar apenas o spinner "Carregando..." e **desmontar** todo o `<Tabs>`.
3. Quando o loading termina, o `<Tabs defaultValue="resumo">` é remontado do zero — e como a aba ativa é apenas estado interno não-controlado do Radix, ela é perdida e volta para "resumo".

## Solução

Tornar a `<Tabs>` controlada e não desmontar a árvore durante refresh:

1. **Controlar a aba ativa**: adicionar `const [tab, setTab] = useState("resumo")` e usar `<Tabs value={tab} onValueChange={setTab}>`. Isso preserva a aba ativa entre re-renders mesmo se o componente fosse remontado.
2. **Não desmontar a UI durante refresh**: separar o estado `loading` inicial de um `refreshing`. Mostrar o spinner de tela cheia somente no carregamento inicial (quando `cedente` ainda é `null`). Refreshes subsequentes (chamadas a `load()` vindas de filhos) atualizam os dados em background sem trocar para a tela "Carregando...".

### Mudanças em `src/pages/CedenteDetail.tsx`

- Adicionar `const [tab, setTab] = useState("resumo")`.
- Trocar `<Tabs defaultValue="resumo">` por `<Tabs value={tab} onValueChange={setTab}>`.
- Em `load()`: chamar `setLoading(true)` apenas se ainda não houver dados (`if (!cedente) setLoading(true)`), e sempre `setLoading(false)` ao final. Assim o primeiro carregamento mostra o spinner global, mas refreshes não derrubam a UI.

Isso resolve o bug sem alterar nenhum componente filho.

## Bônus (warning no console)

Há um aviso "Function components cannot be given refs" apontando para `Badge` dentro de `DocumentosUploadKanban` — provavelmente um `Badge` usado como filho de um `Tooltip`/`asChild` ou similar. Posso investigar e corrigir junto se desejar (envolver em `forwardRef` ou em um `<span>`). Não é a causa do bug das abas, mas mantém o console limpo.
