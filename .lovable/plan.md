# Desabilitar "+ Novo cadastro" do Pipeline de Cedentes

## Análise de impacto (sem riscos)

Mapeei todas as referências ao fluxo acionado pelo botão:

| Item | Onde é usado | Decisão |
|------|--------------|---------|
| Botão "Novo cadastro" em `Pipeline.tsx` (linhas 204-212) | Apenas no Pipeline | **Remover** |
| Rota `/cedentes/novo` em `App.tsx` (linha 69) | Acionada **somente** por esse botão. Nenhum outro `navigate`, `Link` ou `href` aponta para ela | **Remover** |
| Página `CedenteCadastro.tsx` | Também serve `/cedentes/:id/editar` (edição de cedente existente) | **Manter** — mexer quebraria a edição |
| `CedenteNovoSheet.tsx` | Usado pelo botão "Novo cadastro" da página `/cedentes` (lista) — fluxo separado, em sheet | **Manter** — fluxo independente |
| Backend (tabela `cedentes`, RLS, edge functions) | Compartilhado com a lista, edição, importação, etc. | **Não tocar** |

Nenhum hook, edge function, migration ou outro componente depende exclusivamente do caminho `/cedentes/novo`. Logo, removê-lo não tem efeito colateral.

## Mudanças

**1. `src/pages/Pipeline.tsx`**
- Remover a prop `actions={...}` do `<PageTabs>` (linhas 204-212).
- Remover o import não usado `Plus` de `lucide-react` se ficar órfão (verificar — `Plus` não é usado em outro lugar do arquivo).
- Remover o `useNavigate` se ficar não usado (ele ainda é usado em `navigate("/cedentes/${id}")`, então **mantém**).

**2. `src/App.tsx`**
- Remover a linha 69: `<Route path="/cedentes/novo" element={<CedenteCadastro />} />`.
- Manter a linha 70 (`/cedentes/:id/editar`) e o import de `CedenteCadastro`.

## Fora de escopo

- Nenhuma alteração em schema, RLS, edge functions ou outros componentes.
- O fluxo de criar cedente continua disponível via `/cedentes` (lista) → botão "Novo cadastro" → `CedenteNovoSheet`.
