## Mudança em `src/components/cedentes/DocumentosUploadKanban.tsx`

### 1. Remover botão azul grande do topo
- Excluir o bloco do botão "Conciliar documentos" (linhas ~338–371), incluindo as variantes habilitada e desabilitada com `Tooltip`.
- Como esse era o único item ao lado do uploader, simplificar a `div` do topo (linha 315) removendo `flex-col sm:flex-row gap-2` — fica apenas o drop area ocupando 100%.
- Remover o ícone `Scale` do import (linha 18).

### 2. Reposicionar filtros e adicionar "Conciliar documentos" no mesmo alinhamento
- Manter o grupo dos filtros (`bg-muted` pill) **alinhado à esquerda** da barra.
- Logo ao lado, no **mesmo alinhamento** (mesma linha, mesma altura), adicionar o botão "Conciliar documentos" usando outro container `bg-muted p-0.5 rounded-md` com um único `<button>` no mesmo estilo dos filtros (`px-2.5 py-1 text-xs rounded text-muted-foreground hover:text-foreground`), aspecto cinza, sem ícone de balança.
- Manter o badge de `pendentesCount` ao lado do texto.
- Manter a regra `canReview`: se o usuário não pode conciliar, o botão fica `disabled` com `Tooltip` explicando.
- O bloco de ações em massa (quando há `checked.size > 0`) continua aparecendo à direita via `ml-auto`.

### Layout resultante da barra
```
[ Todos | Pendentes | Verificados | Reprovados | Sem categoria ]  [ Conciliar documentos (N) ]            [ações em massa →]
```
Tudo encostado à esquerda, mesmo alinhamento vertical, mesma estética pill cinza.

Nada mais muda: estado, `ConciliacaoDocumentosSheet`, permissões e contagem de pendentes permanecem iguais.
