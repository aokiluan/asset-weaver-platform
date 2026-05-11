# Ocultar coluna "Proposta" no histórico de Contratos assinados

Na aba **"Contratos assinados"** de `/formalizacao`, remover a coluna **Proposta** (que mostra o `codigo` do tipo `PROP-AAAAMMDD-xxxxxx`) tanto do `<thead>` quanto do `<tbody>`.

## Preservação

- A tabela `credit_proposals` e o campo `codigo` **continuam intactos** no banco — nada de migração.
- A query no `load()` continua trazendo as propostas (`propostas[c.id]`) porque ainda usamos `valor_aprovado` na coluna **Valor aprovado**.
- A busca por código de proposta no input de pesquisa **permanece funcional** (filtro continua olhando `prop?.codigo`), só não exibimos mais o código na grid.

## Arquivo a editar

- `src/pages/Formalizacao.tsx` — remover o `<th>Proposta</th>` e o `<td>` correspondente da renderização da aba histórico.
