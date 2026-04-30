
# Remover scrollbar das abas do Cedente

Em `src/pages/CedenteDetail.tsx`, linha 295, o container das abas (Resumo, Representantes legais, Documentos, etc.) usa `overflow-x-auto`, o que cria a barra de rolagem horizontal quando todas as 8 abas não cabem na largura disponível.

## Mudança

Substituir `overflow-x-auto` por `flex-wrap`, permitindo que as abas quebrem para uma segunda linha automaticamente quando faltar espaço — sem scrollbar e sem cortar conteúdo.

```diff
- <div className="flex gap-1 border-b overflow-x-auto">
+ <div className="flex flex-wrap gap-x-1 border-b">
```

O `whitespace-nowrap` em cada botão é mantido para que cada label não quebre internamente — apenas o conjunto se redistribui em duas linhas se necessário. A borda inferior continua contínua na largura total.

## Resultado

- Em telas largas: tudo em uma única linha, sem scrollbar.
- Em telas estreitas: as abas que não cabem vão para a linha de baixo, sem scrollbar nem corte.

Arquivo editado: `src/pages/CedenteDetail.tsx` (linha 295).
