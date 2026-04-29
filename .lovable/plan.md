## Mudanças

### 1. Aba "Resumo" (`src/pages/CedenteDetail.tsx`)
Substituir o grid atual (6 campos) por um bloco completo com todos os dados cadastrais — os mesmos exibidos no `CedenteFormDialog` (Editar dados):

- **Identificação**: Razão social, Nome fantasia, CNPJ
- **Contato**: E-mail, Telefone
- **Endereço**: Endereço, Cidade, UF, CEP
- **Comercial**: Setor, Faturamento médio, Status, Limite aprovado, Responsável comercial
- **Observações** (se houver)

Layout em seções com títulos discretos (Identificação / Contato / Endereço / Comercial), grid de 2-4 colunas. Carregar nome do responsável (`profiles.nome`) junto com o load do cedente.

### 2. Relatório comercial (`src/components/cedentes/CedenteVisitReportForm.tsx`)
Remover o campo **CPF do entrevistado**:
- Linha 282: remover o input "CPF"
- Linhas 60, 94, 147, 203: remover `entrevistado_cpf` do tipo, defaults, load e payload de salvamento
- Reajustar grid para fluir sem o campo (Nome / Cargo / Telefone / E-mail)

A coluna `entrevistado_cpf` no banco permanece (nullable) — sem migração necessária, apenas para de ser preenchida.

### Fora de escopo
- Sem mudanças em outras abas, banco ou na lógica de edição.
