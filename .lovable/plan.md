## Diagnóstico

**Botão "Importar planilha"**: a lógica de habilitação é idêntica à do "Novo cadastro" (`disabled={authLoading || !canCreate}`), mas visualmente usa `variant="outline"` e fica sem o `Tooltip` explicativo, dando a impressão de inativo. Vou alinhar o comportamento ao botão "Novo cadastro" (mesmo Tooltip quando bloqueado por permissão) e revisar o estado para garantir que aparece habilitado quando o usuário tem papel `admin`, `comercial` ou `gestor_geral`.

**Campos do template**: comparando com `CedenteNovoSheet` (formulário oficial de criação) e a tabela `cedentes` no banco, o template atual tem incoerências:

| Problema | Detalhe |
|---|---|
| Faltam campos do form | `capital_social`, `natureza_juridica`, `data_abertura`, `situacao_cadastral`, `cep`, `numero`, `bairro` |
| Campos que não pertencem ao cadastro inicial | `status` (vem default `prospect`, alterado por workflow) e `limite_aprovado` (definido depois pelo Crédito) |
| `endereco` redundante | O form usa `logradouro` (e duplica em `endereco`). Manter só `logradouro` no template e gravar nos dois |

## Mudanças

### 1. `src/pages/Cedentes.tsx`
- Envolver o botão "Importar planilha" no mesmo padrão de `TooltipProvider/Tooltip` do "Novo cadastro", mostrando "Seu usuário não tem permissão" quando `!canCreate`.
- Manter `disabled={authLoading || !canCreate}` (lógica correta — só fica inativo de fato se o usuário não tiver papel permitido).

### 2. `src/lib/cedentes-import.ts`
Atualizar `CEDENTE_FIELDS`, `HEADER_TO_FIELD`, `validateRows` e `buildTemplateXlsx` para refletir o cadastro real:

Campos finais do template (na ordem):
```
razao_social*, cnpj*, nome_fantasia,
capital_social, natureza_juridica, data_abertura, situacao_cadastral,
setor, faturamento_medio,
cep, logradouro, numero, bairro, cidade, estado,
telefone, email, observacoes
```

- Remover `status` e `limite_aprovado` do template/import.
- Adicionar parsing:
  - `data_abertura`: aceita `dd/mm/aaaa`, `aaaa-mm-dd` e número serial Excel → grava como `YYYY-MM-DD`.
  - `cep`: limpa para 8 dígitos; warning se inválido (não bloqueia).
  - `capital_social`: número (mesma lógica de `parseNumber`).
- Ao montar o `mapped` para insert, duplicar `logradouro` em `endereco` (compatibilidade com o form atual).
- Atualizar linha de exemplo do template e o `HEADER_TO_FIELD` (aceitar `data_de_abertura`, `situacao`, `numero`, `bairro`, `cep`, `capital`).

### 3. `src/components/cedentes/CedenteImportDialog.tsx`
- Remover referências à coluna "status" no preview (mantém colunas Razão social, CNPJ e mensagens). Nada estrutural muda.

## Fora do escopo
- Importar sócios/representantes (continua sendo feito pela tela do cedente).
- Validação online de CNPJ via Receita durante a importação (manteremos só validação de dígito verificador para não estourar rate limit em lotes grandes).
