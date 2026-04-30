# Botões de transição por perfil no cedente

Substituir/complementar o stepper como gatilho de avanço por uma **barra de ações** acima das abas, com botões explícitos por etapa-destino, cada um visível apenas para o perfil correspondente.

## Comportamento

Barra fixa logo abaixo do cabeçalho do cedente (nome / CNPJ), alinhada à direita, semelhante ao print enviado ("Enviar para Crédito").

Botões e regras:

| Botão | Quem pode clicar | Etapa atual permitida | Move para |
|---|---|---|---|
| Enviar para Comercial | `analista_cadastro`, `admin` | `cadastro`, `analise` | `novo` (devolução) |
| Enviar para Cadastro | `comercial`, `gestor_comercial`, `admin` | `novo` | `cadastro` |
| Enviar para Crédito | `analista_cadastro`, `admin` | `cadastro` | `analise` |
| Enviar para Comitê | `analista_credito`, `gestor_credito`, `admin` | `analise` | `comite` |

Regras gerais:
- Cada botão só aparece se: (a) o usuário tem o role permitido **e** (b) a etapa atual é compatível.
- Quando aparece mas há pendências (gates do `evaluateGates`), o botão fica **desabilitado** com tooltip listando as pendências (reaproveita `evaluateGates`).
- "Enviar para Comercial" exige um **motivo de devolução** (modal com textarea) — reaproveita o padrão já existente em `RevisarCadastroActions.devolver` (grava em `observacoes` com prefixo `[Devolvido]`).
- Demais botões abrem `AlertDialog` de confirmação simples (já existe `confirmAdvance` na página).
- O **stepper** continua exibido (visualização do progresso), mas deixa de ser o gatilho clicável principal para avançar — passa a ser apenas indicador. Mantemos os clicks no stepper desabilitados para evitar dois caminhos conflitantes.
- Etapas `comite → formalizacao` e `formalizacao → ativo` continuam sendo disparadas pelos próprios fluxos internos (decisão do comitê / minuta assinada) — **não** entram na barra de botões agora, conforme escopo descrito.

## Mudanças técnicas

1. **Novo componente** `src/components/cedentes/CedenteStageActions.tsx`
   - Props: `cedente`, `gates` (resultado do `evaluateGates`), `onChanged`.
   - Define o array de transições acima.
   - Para cada transição: checa role + etapa + pendências; renderiza `Button` com ícone (`Send` / `Undo2`).
   - Encapsula o modal de devolução (motivo) e o `AlertDialog` de confirmação.
   - Faz o `update` direto em `cedentes.stage` (mesma lógica de `advanceStage`).

2. **`src/pages/CedenteDetail.tsx`**
   - Substituir o bloco `{podeRevisarCadastro && <RevisarCadastroActions ... />}` pelo novo `<CedenteStageActions />` no canto superior direito do card de cabeçalho.
   - Remover o `onAdvance` clicável do `CedenteStageStepper` (passar handler no-op ou ajustar prop).
   - Remover o `EnviarAnaliseDialog` invocado pelo stepper (a confirmação agora vem do novo componente — mantém checklist de pendências dentro do tooltip/disabled).

3. **`src/components/cedentes/CedenteStageStepper.tsx`**
   - Tornar os "dots" não clicáveis (somente visual). Mantém tooltip informativo de pendências.

4. **`src/lib/cedente-stages.ts`** — sem alteração estrutural; `STAGE_PERMISSIONS` continua útil como fonte para o componente novo.

5. Configurações > Usuários: **fora deste escopo** — será feito depois, conforme o usuário indicou. Os roles já existem em `AppRole` e a tela de admin de usuários já permite atribuí-los.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Razão Social             [Enviar p/ Comercial] [Enviar p/ Cadastro] │
│  CNPJ ...                  [Enviar p/ Crédito]  [Enviar p/ Comitê]   │
│                                                              │
│  ●───●───○───○───○───○   (stepper — somente visual)         │
│  Novo Cad. Anál. Com. Form. Ativo                            │
└──────────────────────────────────────────────────────────────┘
[ Resumo | Representantes | Documentos | ... ]
```

## Validação

- Logar como comercial em cedente `novo` → vê apenas "Enviar para Cadastro".
- Logar como analista de cadastro em cedente `cadastro` → vê "Enviar para Comercial" (devolver) e "Enviar para Crédito".
- Logar como analista de crédito em cedente `analise` → vê "Enviar para Comitê" (e "Enviar para Comercial" não, pois não é o role da devolução de cadastro).
- Admin sempre vê todos os botões aplicáveis à etapa atual.
