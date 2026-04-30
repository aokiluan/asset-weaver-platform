## Mudança em `src/components/cedentes/DocumentosUploadKanban.tsx`

Na barra de filtros (em volta da linha 338), inverter a ordem para:

```
[ Conciliar documentos (N) ]                              [ Todos | Pendentes | Verificados | Reprovados | Sem categoria ]
```

### Como
- Mover o bloco do botão "Conciliar documentos" (linhas 354–389, ambas as variantes `canReview` true/false) para **antes** do grupo de filtros.
- Adicionar `ml-auto` no container dos filtros (linha 339: `<div className="flex gap-1 rounded-md bg-muted p-0.5">` → `... ml-auto`) para empurrá-los à direita, deixando o botão "Conciliar" colado à esquerda.
- O bloco de ações em massa (linha 390+) permanece como está hoje (`ml-auto`), mas como agora os filtros já têm `ml-auto`, ajustar para aparecer entre o botão e os filtros sem quebrar o layout: trocar para `mx-auto` ou simplesmente manter a ordem (ele continuará empurrado pelo flex; visualmente fica entre o botão à esquerda e os filtros à direita).

Resultado: botão "Conciliar documentos" no lado esquerdo, filtros no lado direito, mesma estética cinza pill, mesmo alinhamento vertical.
