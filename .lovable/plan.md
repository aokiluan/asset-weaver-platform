## Ícones ainda mais finos

Ajustar a regra global em `src/index.css` para reduzir o `stroke-width` dos ícones Lucide de `1.5` para `1.25`, aproximando do traço hairline da imagem de referência (sidebar tipo Nibo).

### Mudança

**`src/index.css`** (regra atual na seção `@layer base`):

```css
svg.lucide {
  stroke-width: 1.25;
}
```

Apenas troca de `1.5` para `1.25`. Sem outras alterações.

### Resultado

- Sidebar, botões de ação das tabelas e ícones inline ficam com traço hairline, mais próximo do estilo minimalista da referência.
- Se ainda parecer grosso, próximo passo seria `1` (ultra fino).
