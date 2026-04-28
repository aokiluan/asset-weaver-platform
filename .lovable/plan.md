# Cabeçalho com identificação da empresa (estilo Nibo)

## O que será feito

Replicar o cabeçalho do Nibo no `AppLayout`, exibindo:
- Logo horizontal da S3 Capital (símbolo + nome)
- Razão social: **S3 CAPITAL SECURITIZADORA S.A.**
- CNPJ: **60.353.126/0001-71**

## Arquivos afetados

### `src/assets/s3-logo-horizontal.png` (já copiado)
Versão colorida do logo (`Logo_Secundário.png`) para uso sobre fundo claro do header.

### `src/components/AppLayout.tsx`
- Aumentar altura do header de `h-12` para `h-16` para acomodar logo + duas linhas de texto
- À esquerda do header (depois do `SidebarTrigger`):
  - Logo horizontal (`h-9`, navy + dourado, sobre fundo branco do card)
  - Bloco de duas linhas:
    - Linha 1: "S3 CAPITAL SECURITIZADORA S.A." em `font-display` (Cormorant), uppercase, peso 600
    - Linha 2: "60.353.126/0001-71" em texto pequeno muted, com `tabular-nums`
  - Bloco de texto fica oculto em telas `< sm` (só o logo aparece)
- À direita do header:
  - Indicador de função do usuário (oculto em telas `< lg`)
  - Botão de notificações (ícone `Bell`) — visual, sem ação por enquanto
  - E-mail do usuário (oculto em telas `< md`)
  - Botão "Sair"

## Resultado esperado
Cabeçalho institucional idêntico ao layout do Nibo: logo + razão social + CNPJ alinhados à esquerda, ações e identificação do usuário à direita, com tipografia serifada da marca dando o tom premium.
