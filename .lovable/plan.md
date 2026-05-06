## Cards de votação ultracompactos e minimalistas

Em `src/components/credito/ComiteGameSession.tsx`, redesenhar o `ScoreCard` (linhas 310–321) e ajustar o uso (linhas 221–225) para um visual ultracompacto, sem círculos de fundo coloridos, com ícone inline e número à direita do label.

### Novo layout do card
- Padding reduzido: `p-3` (de `p-4`)
- Sem círculo de fundo: ícone pequeno (`h-3.5 w-3.5`) inline ao lado do label, apenas com cor (sem `bg-*/10`)
- Linha única no topo: `[ícone] Label` em `text-xs text-muted-foreground`
- Número grande abaixo, mais leve: `text-2xl font-semibold tabular-nums` (de `font-bold`)
- Gap do grid: `gap-2` (de `gap-3`)

### Cores (apenas no ícone)
- Favoráveis: `text-green-600`
- Contrários: `text-destructive`
- Abstenções: `text-muted-foreground`

### Estrutura final do ScoreCard
```tsx
<Card className="p-3">
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
    <span className={color}>{icon}</span>
    <span>{label}</span>
  </div>
  <div className="text-2xl font-semibold tabular-nums">
    {hidden ? <span className="text-muted-foreground">?</span> : count}
  </div>
</Card>
```

Sem mudanças em props nem em lógica — só visual.