# Corrigir contador da Conciliação (progresso real)

## Problema
Em `ConciliacaoDocumentosSheet.tsx` (linha 324) o contador mostra `idx+1 de fila.length`. Como `fila` é derivada de `documentos.filter(status === "pendente")`, ao marcar um doc como verificado ele sai da fila e o denominador diminui — "1 de 4" → "1 de 3" em vez de "2 de 4".

## Lógica proposta
Mostrar **tratados de total**, congelando o denominador ao abrir a sheet (snapshot do tamanho inicial da fila).

- `totalInicial` = tamanho da fila no momento em que a sheet abriu (e quando o filtro "Apenas com categoria" muda, pois muda o universo).
- `tratados` = `totalInicial - fila.length` (quantos já saíram do pendente).
- Exibição: `{tratados + (current ? 1 : 0)} de {totalInicial}` — o "+1" representa o doc que está sendo analisado agora (o atual ainda não foi tratado, mas está em foco), garantindo que ao abrir mostre "1 de 4" e ao verificar pule para "2 de 4".
- Quando `current` for null (acabou a fila), mostrar `{totalInicial} de {totalInicial}` — "tudo concluído".

## Mudanças

`src/components/cedentes/ConciliacaoDocumentosSheet.tsx`:

1. Adicionar `const [totalInicial, setTotalInicial] = useState(0);`.
2. `useEffect` que dispara em:
   - `open` virando `true` → `setTotalInicial(fila.length)`.
   - `somenteComCategoria` mudando enquanto aberto → `setTotalInicial(fila.length)`.
3. Substituir o JSX da linha 322-326 por:
   ```tsx
   {totalInicial > 0 && (
     <span className="text-sm text-muted-foreground whitespace-nowrap">
       {current ? Math.min(totalInicial - fila.length + 1, totalInicial) : totalInicial} de {totalInicial}
     </span>
   )}
   ```

## Fora de escopo
- Não alterar a lógica de navegação (`next`/`prev`) nem o filtro.
- Não persistir progresso entre aberturas da sheet.
