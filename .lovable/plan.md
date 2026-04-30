## Objetivo

Padronizar todos os campos de valor monetário do sistema com:
- Formatação em **Real (R$)** com separadores de milhar (`.`) e decimais (`,`) ao digitar
- **Sem as setinhas** de incremento/decremento do navegador
- Comportamento consistente em todos os formulários

## Solução: componente `CurrencyInput` reutilizável

Criar `src/components/ui/currency-input.tsx` baseado no `Input` existente, com:

- Exibe valor formatado: digitar `250000` mostra `R$ 250.000,00`
- Aceita apenas dígitos (ignora outros caracteres)
- Internamente trabalha com `number | null` via prop `value` e callback `onValueChange(n: number | null)`
- Renderiza como `type="text"` + `inputMode="decimal"` → elimina nativamente as setas
- Suporta placeholder (`R$ 0,00`) e estado vazio
- Compatível com `react-hook-form` via wrapper (`Controller`) — usado nos forms que usam RHF

Lógica central:
```ts
const formatBRL = (n: number | null) =>
  n == null ? "" : n.toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: 2,
  });

const parseBRL = (s: string) => {
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : null;
};
```

Comportamento "amigo do usuário": digitação acumula centavos da direita pra esquerda (padrão de apps financeiros — mesmo modelo do Nibo).

## Arquivos que serão atualizados

Substituir cada `<Input type="number" ...>` monetário por `<CurrencyInput ...>`:

1. **`src/components/cedentes/CedenteNovoSheet.tsx`**
   - `capital_social`
   - `faturamento_medio`

2. **`src/pages/CedenteCadastro.tsx`** (linhas ~318 e ~342)
   - `capital_social`
   - `faturamento_medio`

3. **`src/components/cedentes/CedenteFormDialog.tsx`** (linhas 153 e 192)
   - `faturamento_medio`
   - `limite_aprovado`
   - Adaptado via `Controller` do react-hook-form

4. **`src/components/leads/LeadFormDialog.tsx`** (linha 162)
   - `valor_estimado`
   - Adaptado via `Controller`

5. **`src/pages/admin/AdminAlcadas.tsx`** (linhas 101 e 106)
   - `valor_min`
   - `valor_max`

Campos que **NÃO** são monetários (ordem, votos_minimos, eixos de gráfico) permanecem como estão.

## Detalhes técnicos

- O componente exporta tanto a versão controlada simples (`value` / `onValueChange`) quanto fica preparado para `Controller` do RHF
- Mantém todas as classes/estilos do `Input` atual (mesma altura, borda, focus ring) — visualmente idêntico
- A remoção das setas vem "de graça" porque o input passa a ser `type="text"` (não há mais spinners do navegador)
- Nenhuma migração de banco necessária — os valores continuam armazenados como `numeric` no Supabase
- Nenhum ajuste em outros componentes que apenas exibem valores (já usam formatação própria)

## Resultado esperado

Em todo formulário com campo de R$, o usuário vê: `R$ 250.000,00` enquanto digita, sem botões de incremento, com a mesma aparência dos demais inputs.