## Mudança
Inverter a ordem de duas abas em `src/pages/CedenteDetail.tsx` (linhas 298-299): **Relatório comercial** passa a vir antes de **Documentos**.

Antes:
```
Resumo · Representantes legais · Documentos · Relatório comercial · Análise de crédito · ...
```

Depois:
```
Resumo · Representantes legais · Relatório comercial · Documentos · Análise de crédito · ...
```

## Fora de escopo
- Os valores das abas (`v: "documentos"`, `v: "visita"`) e a aba default permanecem iguais — só muda a ordem de exibição.
- Nenhuma alteração nos conteúdos renderizados, nos badges, ou em qualquer outra aba.
