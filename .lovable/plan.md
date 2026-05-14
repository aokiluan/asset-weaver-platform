## Objetivo

A aba **Boletas** deixa de ser uma lista de registros `investor_boletas` e passa a ser a continuação natural do funil: lista todos os contatos do CRM no estágio **"Boleta em andamento"**, e cada linha permite iniciar/avançar a boleta.

## Mudanças (apenas frontend, em `src/pages/investidores/InvestidoresBoletas.tsx`)

1. **Fonte da lista**: `investor_contacts` filtrados por `stage = 'boleta_em_andamento'` (em vez de `investor_boletas`).
2. **Join com boleta**: para cada contato, buscar a boleta aberta mais recente (status ≠ `concluida`/`cancelada`) em `investor_boletas`. Se não existir, contato aparece como "Não iniciada".
3. **Card por contato** (padrão Nibo VIEW denso, `p-2.5`):
   - Nome do contato + tipo
   - Estado da boleta: badge com `BOLETA_STATUS_LABEL` ou "Não iniciada"
   - Indicador de etapa atual (`Etapa X de 4`) + nome da etapa de `BOLETA_STEPS`
   - Série e valor (se já preenchidos)
   - Botão primário:
     - "Iniciar boleta" se não houver registro
     - "Continuar — {nome da próxima etapa}" se houver
4. **Métricas no topo** (recalculadas):
   - Contatos aguardando boleta (sem registro ou em rascunho)
   - Boletas em andamento (status intermediários)
   - Concluídas no mês (consulta separada de `investor_boletas` com `concluida_em` no mês)
5. **Seções**:
   - "Aguardando início" — contatos sem boleta ou com status `rascunho`
   - "Em andamento" — contatos com boleta em status `aguardando_assinatura`, `assinada`, `pagamento_enviado`
   - "Concluídas recentes" (collapsible, opcional) — últimas boletas `concluida` para referência
6. **Ações secundárias por linha**: abrir contato no CRM, excluir boleta (se existir e for rascunho).
7. **Remover**: botão "Nova boleta" do header e o `AlertDialog` de seleção de contato — deixa de fazer sentido, pois cada contato elegível já aparece listado.

## Sem mudanças

- Schema do banco, RLS, wizard (`BoletaWizardSheet`), helpers de `investor-boletas.ts` e admin de séries permanecem como estão.
- O wizard continua sendo aberto com `wizardContact` + `wizardBoleta` (null se for primeira vez).

## Resultado para o usuário

Ao abrir **Boletas**, vê imediatamente todos os contatos do funil prontos para boleta, com status visível da etapa em que cada um está, e um clique avança no wizard — sem precisar lembrar quem precisa ser cadastrado.
