## Objetivo
Tornar o card de header do cedente (e padrões similares no projeto) ultracompacto, reduzindo padding e espaçamento entre elementos textuais.

## Mudanças

### 1. `src/pages/CedenteDetail.tsx` — header card (linhas 240-246)
- Padding card: `p-5` → `p-3`
- Espaço interno: `space-y-4` → `space-y-2.5`
- Gap row: `gap-4` → `gap-3`
- Título: `text-[20px]` → `text-[18px]`
- Combinar nome fantasia + CNPJ em **uma única linha** separada por "·":
  - antes: 2 linhas com `mt-0.5` cada
  - depois: `<p className="text-[12px] text-muted-foreground">{nome_fantasia ? `${nome_fantasia} · ` : ""}CNPJ: {cnpj}</p>`
- Wrapper do bloco textual com `leading-tight`

### 2. Padronizar mesmo padding compacto em outros cards de "header de detalhe" se existirem
Verificar e aplicar `p-3 space-y-2.5` em cards equivalentes:
- `src/pages/Leads.tsx` (se houver header similar)
- `src/pages/CedenteCadastro.tsx` (se houver header similar)

(Apenas se o padrão for visivelmente o mesmo — não quebrar layouts de listagens.)

## Resultado
Header do cedente cai de ~140px para ~85px, com hierarquia preservada e linhas textuais coladas.