# Aplicar identidade visual da S3 Capital

## O que será feito

### 1. Logos da marca (já copiados)
- `src/assets/s3-logo-horizontal-white.png` → sidebar expandida
- `src/assets/s3-logo-symbol.png` → sidebar recolhida (selo)
- `src/assets/s3-logo-vertical.png` → tela de login
- `public/favicon.png` → aba do navegador (selo circular azul)

### 2. `index.html`
- Trocar `<title>` para "S3 Capital — Plataforma de Gestão"
- Atualizar `<meta description>` e Open Graph para a S3 Capital
- Adicionar `<link rel="icon" href="/favicon.png">`
- Carregar Google Fonts: **Cormorant Garamond** (display/serifada da marca) e **Inter** (UI)

### 3. Design system (`src/index.css`)
Refinar tokens HSL para casar com a paleta oficial:
- `--primary`: navy S3 Capital (#0f1f3d)
- Novo token `--gold` / `--accent`: dourado S3 (#b8893f), com variante suave
- `--gradient-gold` e `--shadow-gold` para uso em destaques premium
- Sidebar: navy mais profundo, com `--sidebar-primary` agora em dourado (item ativo destacado em ouro)
- Variáveis de fonte: `--font-sans` (Inter) e `--font-display` (Cormorant Garamond)
- Classe utilitária `.font-display` para títulos institucionais
- Mantém suporte completo ao tema escuro com a mesma paleta

### 4. `tailwind.config.ts`
- Adicionar `fontFamily.sans` (Inter) e `fontFamily.display` (Cormorant Garamond)
- Adicionar cor semântica `gold` (DEFAULT, foreground, soft) para uso como `bg-gold`, `text-gold`, etc.

### 5. `src/components/AppSidebar.tsx`
- Remover ícone provisório `Shield`
- Sidebar **expandida**: exibir logo horizontal branco da S3 Capital
- Sidebar **recolhida**: exibir apenas o símbolo (selo)
- Manter densidade Nibo (já implementada)

### 6. `src/pages/Auth.tsx`
- Substituir o ícone `Shield` provisório pelo logo vertical oficial da S3 Capital
- Título "Securitizadora" → "S3 Capital" usando `font-display` (serifada)
- Subtítulo: "Securitizadora • Plataforma de Gestão"
- `document.title` → "Acesso | S3 Capital"
- Card de login com sutil borda superior dourada (assinatura de marca)

### 7. Toques de marca em headings
- Nome da empresa na sidebar usa `font-display` (Cormorant)
- Demais títulos da UI permanecem em Inter (legibilidade em telas densas)

## Arquivos afetados
- `index.html` (editado)
- `src/index.css` (tokens + fontes)
- `tailwind.config.ts` (cor `gold` + `fontFamily`)
- `src/components/AppSidebar.tsx` (logo no lugar do Shield)
- `src/pages/Auth.tsx` (logo + título serifado)
- `src/assets/s3-logo-*.png` (3 arquivos, já copiados)
- `public/favicon.png` (já copiado)

## Resultado esperado
Aplicação com identidade S3 Capital aplicada de ponta a ponta: favicon e título corretos no browser, sidebar com logo branco oficial sobre navy profundo (item ativo destacado em dourado), tela de login com logo vertical e tipografia serifada institucional, mantendo a densidade compacta estilo Nibo já implementada.
