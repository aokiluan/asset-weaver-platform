# Alinhamento do cabeçalho da sidebar

Igualar a altura do `SidebarHeader` à do header principal (`h-14`) para que as bordas inferiores fiquem na mesma linha, e centralizar a logo.

## Alteração em `src/components/AppSidebar.tsx`

Substituir o `SidebarHeader` atual por:

```tsx
<SidebarHeader className="h-14 border-b border-sidebar-border py-0 px-3 flex items-center justify-center">
  <img
    src={collapsed ? logoSymbol : logoSecundario}
    alt="S3 Capital"
    className={collapsed ? "h-8 w-8 object-contain" : "h-8 w-auto object-contain"}
  />
</SidebarHeader>
```

- `h-14` casa com `h-14` do header da página → bordas alinhadas.
- `justify-center` centraliza a logo horizontalmente, tanto colapsada quanto expandida.
