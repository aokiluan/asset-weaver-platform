# Botões sempre visíveis no cedente

Mostrar os 4 botões de transição **sempre**, em todas as etapas. Cada botão fica habilitado apenas quando todas as condições são verdadeiras; caso contrário, fica desabilitado com tooltip explicando o motivo.

## Regras de habilitação (por botão)

Um botão é habilitado quando:
1. **Etapa atual** está em `fromStages` da transição;
2. **Etapa-alvo** é diferente da etapa atual;
3. Usuário tem **um dos roles** permitidos (admin sempre passa);
4. **Gates** da etapa atual estão atendidos (não se aplica a "Enviar para Comercial", que é devolução).

Se qualquer condição falhar, o botão fica `disabled` e o tooltip mostra a razão:
- "Cedente já está na etapa X"
- "Não disponível na etapa atual (X)"
- "Apenas {roles permitidos} podem executar esta ação"
- "Pendências: • ..."

## Mudança técnica

`src/components/cedentes/CedenteStageActions.tsx`:
- Remover o `filter` que escondia botões.
- Mapear as 4 transições para `{ enabled, reason }`.
- Renderizar sempre os 4 `Button` (com `disabled` + `Tooltip` quando houver `reason`).
- Importar `ROLE_LABEL` de `@/lib/roles` para o texto do tooltip.

Sem mudanças em DB, RLS, ou outros componentes.
