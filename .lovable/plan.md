# Inverter ordem: ações abaixo do stepper

Hoje em `src/pages/CedenteDetail.tsx` o cabeçalho do cedente tem:

```
[Razão social + CNPJ]      [Botões: Devolver / Enviar para X / Ativar]
[Stepper: Novo · Cadastro · Análise · Comitê · Formalização · Ativo]
```

Mover os botões para **abaixo** do stepper, mantendo o título no topo sozinho.

## Mudança em `src/pages/CedenteDetail.tsx` (linhas ~251-291)

Reestruturar o card do cabeçalho:

1. Linha 1: apenas o bloco do título (razão social + CNPJ).
2. Linha 2: `<CedenteStageStepper ... />` ocupando largura total.
3. Linha 3: `<CedenteStageActions ... />` alinhado à direita (mantém `flex flex-wrap justify-end gap-2`), separado do stepper por um `border-t` sutil + `pt-2.5` para dar respiro visual.

Manter todas as props atuais dos dois componentes — só muda a ordem/posição no JSX.

## Fora de escopo
- Não mudar comportamento dos botões nem do stepper.
- Não alterar `CedenteStageActions.tsx` nem `CedenteStageStepper.tsx`.
