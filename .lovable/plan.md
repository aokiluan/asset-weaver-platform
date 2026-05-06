## Ícone de menu (três linhas) na sidebar colapsada

Quando a sidebar está recuada, o header fica vazio. Vou colocar um ícone `Menu` (três linhas) do Lucide nesse espaço, igual à referência. Ao clicar, ele fixa a sidebar (abre e mantém aberta).

### Mudança — `src/components/AppSidebar.tsx`

1. Adicionar `Menu` à lista de imports do `lucide-react`.
2. No header da `<aside>`, substituir o placeholder `<div className="h-7 w-7" aria-hidden />` (renderizado quando `!expanded`) por um botão:

```tsx
<button
  type="button"
  onClick={() => setPinned(true)}
  className={cn(
    "h-7 w-7 mx-auto flex items-center justify-center rounded-md",
    "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
  )}
  title="Abrir menu"
  aria-label="Abrir menu"
>
  <Menu className="h-4 w-4" />
</button>
```

### Resultado

- Sidebar colapsada exibe o ícone hambúrguer no topo, alinhado com os ícones dos itens abaixo (igual à referência Nibo).
- Clicar fixa a sidebar expandida; o botão `PinOff` no estado expandido permite recolher de novo.
- Sem mudanças de largura, layout ou comportamento de hover.
