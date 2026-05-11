# Centralizar botões da esteira

Em `src/pages/CedenteDetail.tsx`, na linha do wrapper que envolve `<CedenteStageActions>`, trocar `justify-end` por `justify-center` para que a barra de botões fique centralizada em relação ao card do cedente (em vez de alinhada à direita).

Mudança pontual:
```diff
- <div className="border-t pt-2.5 flex items-center gap-2 flex-wrap justify-end">
+ <div className="border-t pt-2.5 flex items-center justify-center gap-2 flex-wrap">
```

Sem outras alterações.
