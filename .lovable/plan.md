## Problema

No `CedenteVisitReportForm`, quando já existe um relatório salvo (`mode === "view"`), o flag `readOnly` é calculado mas **nunca aplicado aos inputs**. Apenas adiciona `opacity-90` no wrapper. Por isso os campos continuam editáveis na tela (como na imagem: "Luan" sendo digitado em modo "somente leitura").

## Solução

Em `src/components/cedentes/CedenteVisitReportForm.tsx`, propagar o `readOnly` (renomeando para `disabled` por consistência visual) para todos os controles dentro do acordeão:

1. **Cabeçalho da visita** (Data, Tipo, Visitante, Nome/Cargo/Telefone/E-mail do entrevistado) — adicionar `disabled={readOnly}` nos `Input` e `Select`.
2. **Dados do negócio** — `disabled={readOnly}` em todos os inputs (ramo, faturamento, qtd_funcionarios, principais_produtos, %s de PF/PJ e formas de faturamento).
3. **Informações adicionais** — `disabled` em `Textarea` de parceiros, no botão "Adicionar empresa ligada", nos inputs de cada empresa e no botão de remover.
4. **Pleito de crédito** — `disabled` no input de limite global, no componente `ModFull` (passar prop `disabled` que desabilita Checkbox/Inputs internos), no botão "Adicionar avalista", inputs de avalistas e botão de remover.
5. **Parecer comercial** — `disabled` nos `Textarea` de parecer e pontos de atenção; o botão de upload de fotos e o botão de remover foto também ficam `disabled` em modo view (apenas o `abrirFoto` continua funcionando para visualizar).
6. **`ModFull`** — adicionar prop opcional `disabled?: boolean` aplicada ao `Checkbox` e aos quatro `Input`s.

Manter o wrapper `opacity-90` como está, apenas para reforçar visualmente.

Fluxo: ao clicar em **"Alterar relatório"**, `mode` vira `"edit"` e `readOnly` passa a `false`, reabilitando todos os campos. Ao clicar em **"Cancelar"** ou após salvar, volta a `view` e tudo fica desabilitado novamente.

## Escopo

Apenas `src/components/cedentes/CedenteVisitReportForm.tsx`. Nenhuma mudança de schema ou de outros arquivos.