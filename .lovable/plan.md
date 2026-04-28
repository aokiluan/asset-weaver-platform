# Ajuste de contraste da sidebar

Tornar a sidebar visivelmente distinta do conteúdo principal, mantendo o tom azul-acinzentado.

## Alterações em `src/index.css`

**Light mode**
- `--sidebar-background`: `215 25% 96%` → `215 28% 90%`
- `--sidebar-accent`: `215 25% 90%` → `215 30% 84%`
- `--sidebar-border`: `215 22% 88%` → `215 25% 80%`

**Dark mode**
- `--sidebar-background`: `215 22% 12%` → `215 25% 8%`
- `--sidebar-border`: `215 18% 18%` → `215 20% 22%`

Demais tokens (foreground, primary dourado) permanecem inalterados.
