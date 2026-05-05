
## Objetivo

Deixar o cabeçalho do detalhe do Cedente e a barra de abas com tipografia menor, pesos mais leves e espaçamentos mais enxutos — semelhante ao Nibo (linhas finas, hierarquia sutil, muito ar entre elementos sem inflar fontes).

## Mudanças propostas

### 1. `src/pages/CedenteDetail.tsx` — Card de cabeçalho do cedente
- Reduzir padding do card: `p-6` → `p-5` e `space-y-5` → `space-y-4`.
- Título da empresa: `text-2xl font-semibold tracking-tight` → `text-[20px] font-medium tracking-tight` (mais leve, menos "bold pesado").
- Nome fantasia e CNPJ: manter `text-sm` mas trocar para `text-[13px] text-muted-foreground` e remover `font-mono` do CNPJ (Nibo usa fonte sans uniforme); reduzir `mt-1` para `mt-0.5`.
- Linha de botões do header (Cedentes / Editar dados): trocar tamanho para `size="sm"` em ambos e usar `text-[13px]`.
- Espaço externo entre seções: `space-y-6` no wrapper raiz → `space-y-4`.

### 2. `src/pages/CedenteDetail.tsx` — Barra de abas
- Container: adicionar `gap-x-0` e `text-[13px]`.
- Botões das tabs:
  - `px-3 py-2 text-sm font-medium` → `px-3 py-2.5 text-[13px] font-normal`
  - Estado ativo: trocar `text-foreground` por `text-foreground font-medium` (ativo é o único com peso médio; inativos ficam regulares e em `text-muted-foreground`)
  - Reduzir `gap-2` interno para `gap-1.5`
  - Badge: `h-4 min-w-4 text-[10px]` → `h-[18px] min-w-[18px] text-[10px] font-medium`

### 3. Seções internas (Resumo etc.) — Headings de seção
- Headings tipo `text-sm font-semibold uppercase tracking-wide` continuam, mas reduzir para `text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground` para o efeito "label" do Nibo.
- Aplicar nas seções do bloco Resumo (Identificação, etc.).

### 4. Stepper / espaçamentos
- `space-y-6` da página raiz já reduzido no item 1; manter Stepper como está (já compacto).

## Não incluído

- Sem mudanças de cores, tokens do design system ou `index.css`.
- Sem alterações nas demais abas (Representantes, Documentos, etc.) além das já listadas — podem ser feitas depois se você quiser estender.
- Sem troca de fonte (Inter já é usada, próxima do Nibo).

## Validação

Após aplicar, abrir `/cedentes/:id` em viewport ~1047px e conferir:
- Título visivelmente menor e mais leve.
- Abas mais finas, com tab ativa diferenciada por peso (não por tamanho).
- Card do cabeçalho com menos respiro vertical interno.
