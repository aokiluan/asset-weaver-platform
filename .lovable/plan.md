## Ultra-compactar ainda mais (global)

Reduz altura, fontes e espaçamento dos primitivos do design system. Aplica em todo o projeto automaticamente.

### Mudanças nos primitivos

| Primitivo | Antes | Depois |
|---|---|---|
| `Input` | `h-7 px-2.5 py-1 text-[12px]` | `h-6 px-2 py-0.5 text-[11px]` |
| `Textarea` | `min-h-[60px] px-2.5 py-1.5 text-[12px]` | `min-h-[52px] px-2 py-1 text-[11px]` |
| `Label` | `text-xs` (12px) | `text-[11px]` |
| `SelectTrigger` | `h-7 px-2.5 text-[12px]` | `h-6 px-2 text-[11px]` |

### Espaçamento (tokens utilitários do tailwind)
Adiciono utilitário CSS global em `src/index.css` para reduzir o espaçamento dos `space-y-*` mais usados em formulários, **sem** reescrever cada `<div>`:

- `.space-y-2 > * + *` permanece (Tailwind padrão = 8px) — ok para form fields
- Não vou alterar Tailwind globals (risco). Em vez disso reduzo só o gap padrão dos grids/forms via classe utilitária nova `.form-compact` — **opcional**, mas como foi pedido global, melhor agir nos containers mais usados.

Decisão: vou apenas reduzir o **gap interno entre label e input** ajustando o `Label` para `mb-0.5` quando combinado com input via wrapper já existente é difícil. Mantenho `space-y-2` (8px) que já é razoável e o ganho real virá da redução de altura/fonte.

### Auth.tsx
Os inputs de login estão preservados em `h-10 text-sm` — mantém conforto.

### Arquivos editados
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`

### Sem mudanças
- Cores, bordas, radius
- Buttons, Dialogs, Cards
- Lógica de qualquer feature
