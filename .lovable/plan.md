# Remover "Devolver para reclassificar"

A reclassificação já acontece direto na tela de conciliação (seletor de tipo/categoria no próprio item), então o botão duplica funcionalidade e ainda força um fluxo mais lento (diálogo de motivo + entrada no histórico) pra algo resolvido em 2 cliques ali mesmo.

## Mudanças em `src/components/cedentes/ConciliacaoDocumentosSheet.tsx`

1. **Footer** — remover o `<Button>` "Devolver para reclassificar" (linhas ~472-479) e o ícone `Undo2` do import se não for mais usado.

2. **Dialog de motivo** — passar a ser exclusivo de "Reprovar":
   - Tipo `MotivoAcao` deixa de ser união e vira simplesmente `boolean` (estado `reprovarOpen`).
   - Função `abrirMotivo("reprovar")` vira `abrirReprovar()`.
   - Remover branch `acao === "devolver"` em `confirmarMotivo` (mantém só o update de `status: "reprovado"` e a entrada no histórico com prefixo "Documento reprovado").
   - Títulos/labels/placeholders do diálogo ficam fixos no texto de "Reprovar".
   - Atalho `R` continua funcionando; remover qualquer referência ao atalho de devolver (não há).

3. **Limpeza** — remover constantes/strings não usadas: `"devolvido_reclassificar"`, prefixo "Documento devolvido para reclassificar", `acao === "reprovar" ? ... : ...` ternários redundantes.

## Fora de escopo
- Não mexer no seletor de categoria existente na conciliação (já é o caminho de reclassificação).
- Não alterar histórico de eventos passados que já tenham `acao: "devolvido_reclassificar"` no banco — só paramos de gerar novos.
- Não tocar em backend/migrations.
