## Componentes ultracompactos: Button, Select, Switch

A tabela já está em ~22–24px por linha, mas botões (h-10/h-9), selects (h-10) e switches (h-6 / w-11) continuam grandes demais e quebram a densidade visual. Vou reduzir os defaults globais nesses três componentes — assim toda a aplicação herda o novo padrão sem precisar editar página por página.

### 1. `src/components/ui/button.tsx`

Reduzir todos os tamanhos e o texto base:

- Base: `text-sm` → `text-[12px]`, `[&_svg]:size-4` → `[&_svg]:size-3.5`, `gap-2` → `gap-1.5`, `rounded-md` mantém.
- `size.default`: `h-10 px-4 py-2` → `h-7 px-3`.
- `size.sm`: `h-9 px-3` → `h-6 px-2.5 text-[11px]`.
- `size.lg`: `h-11 px-8` → `h-9 px-5`.
- `size.icon`: `h-10 w-10` → `h-7 w-7`.

### 2. `src/components/ui/select.tsx`

- `SelectTrigger`: `h-10 px-3 py-2 text-sm` → `h-7 px-2.5 text-[12px]`; ícone `h-4 w-4` → `h-3.5 w-3.5`.
- `SelectItem`: `py-1.5 pl-8 pr-2 text-sm` → `py-1 pl-7 pr-2 text-[12px]`; check `h-4 w-4` → `h-3.5 w-3.5`; indicador `left-2` mantém.
- `SelectLabel`: `py-1.5 text-sm` → `py-1 text-[11px]`.

Efeito: triggers de select dentro das tabelas (ex.: coluna Equipe) ficam alinhados em altura com as linhas.

### 3. `src/components/ui/switch.tsx`

- Root: `h-6 w-11` → `h-4 w-7`, `border-2` → `border` (mais delicado).
- Thumb: `h-5 w-5` → `h-3 w-3`, `data-[state=checked]:translate-x-5` → `translate-x-3`.

Switches passam a ~16×28px, compatíveis com linhas de 22–24px.

### 4. Ajuste pontual em `AdminUsuarios.tsx`

- Trigger de equipe: `h-8 w-[160px]` → remover `h-8` (herda h-7), manter largura.
- Botão "Atribuir função" mantém `size="sm"` — agora sai naturalmente compacto.

### Riscos / observações

- Há muitos `<Button size="sm">`, `<SelectTrigger className="h-...">` e `<Switch>` espalhados. A maioria não força altura customizada e vai se beneficiar imediatamente. Onde houver override explícito (`h-8`, `h-9`, `h-10`) o componente continua com a altura forçada — varremos pontualmente se você notar inconsistência.
- Inputs (`input.tsx`, `textarea.tsx`) **não** estão no escopo agora — formulários grandes (dialogs de cadastro) costumam pedir alvo de toque maior. Se quiser que eu inclua, é só dizer.
