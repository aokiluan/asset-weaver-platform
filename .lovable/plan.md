## Diagnóstico

Hoje o PDF é carregado diretamente da signed URL do Supabase Storage dentro de um `<iframe>`. Como a sheet roda **dentro do iframe do preview da Lovable**, esse iframe aninhado de outra origem (`*.supabase.co`) é bloqueado pelo Chrome ("Esta página foi bloqueada pelo Chrome"), por causa de site isolation + headers do Storage.

## Solução

Trocar a estratégia em `src/components/cedentes/ConciliacaoDocumentosSheet.tsx`:

1. Ao trocar o documento atual, em vez de jogar a signed URL direto no `iframe.src`:
   - `fetch(signedUrl)` → `response.blob()` → `URL.createObjectURL(blob)`
   - Usar essa URL `blob:` como `src` do iframe.
   - Como a URL é mesma origem do app, o Chrome não bloqueia.
2. Liberar memória com `URL.revokeObjectURL(...)` no cleanup do `useEffect` e ao desmontar a sheet.
3. Manter o estado `previewLoading` cobrindo o tempo do `fetch` (não só o `createSignedUrl`).
4. Em caso de falha do `fetch` (rede, CORS, etc.), mostrar fallback existente com botão "Baixar / Abrir em nova aba" usando a signed URL original.
5. Imagens (`isImg`) seguem usando a signed URL direta — não há bloqueio para `<img>`.

## Arquivos afetados

- `src/components/cedentes/ConciliacaoDocumentosSheet.tsx` — alterar o `useEffect` que carrega o preview e ajustar o cleanup.

## Fora do escopo

- Trocar `iframe` por `react-pdf` / PDF.js.
- Mexer em headers/Content-Disposition no Storage.
