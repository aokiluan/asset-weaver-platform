# Ajuste de proporções estilo Nibo

Aumentar levemente alturas, fontes e espaçamentos do shell (header + sidebar) para igualar o respiro visual do Nibo.

## `src/components/AppLayout.tsx`
- Header: `h-14` → `h-16`, `px-3` → `px-6`, gap `3` → `3.5`.
- Logo: `h-9` → `h-10`.
- Nome empresa: `text-[13px] uppercase tracking-wide` → `text-[15px] font-semibold` (sem uppercase forçado, já em maiúsculas no texto).
- CNPJ: `text-[11px]` → `text-[13px]`.
- Bell button: `h-8 w-8` ícone `h-4` → `h-9 w-9` ícone `h-5`.
- Email/Sair: `text-xs h-8` → `text-[13px] h-9`, ícone `h-3.5` → `h-4`.
- `main`: `p-4` → `p-6`.

## `src/components/AppSidebar.tsx`
- `EXPANDED_W`: 240 → 260.
- Header sidebar: `h-14 px-3` → `h-16 px-4`; "Empresa" `text-sm font-medium` → `text-[15px]` peso normal; pin button `h-7 w-7` → `h-8 w-8`.
- `Group`: padding `py-1` → `pt-3 pb-1`; label `text-[10px] h-6 px-3` → `text-[11px] h-7 px-4`.
- `Item`: `h-9 px-2.5 text-[13px] gap-2.5 rounded-md` → `h-10 px-3 text-[14px] gap-3 rounded-lg`; ícone `h-4 w-4` → `h-[18px] w-[18px]`.
