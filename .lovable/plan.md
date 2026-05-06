## Problemas identificados

**1. Relatório comercial "não salva":** o registro É salvo no banco (confirmado via rede: GET retorna o relatório completo com `tipo_visita`, `parecer_comercial`, modalidades etc). O que está acontecendo é que o `useFormDraft` restaura o rascunho do localStorage **mesmo depois de carregar o registro do banco**, sobrescrevendo os dados salvos com o rascunho antigo. Resultado: ao reabrir, o usuário vê o rascunho velho e acha que "não salvou".

**2. "Tipo de visita" fora do padrão:** o `SelectTrigger` global está com `h-7` (versão ultracompacta usada nos cards), mas os `Input`s ao lado mantêm `h-10`. Visualmente o select fica menor que os demais campos da mesma linha.

## Correções

Em `src/components/cedentes/CedenteVisitReportForm.tsx`:

1. **Bloquear restauração automática quando já existe registro no banco** — alterar `useFormDraft({ enabled: !loading })` para `enabled: !loading && !existingId`. Assim o draft só é usado em relatórios novos; quando há registro salvo, ele é sempre a fonte da verdade. (Mantém o auto-save ativo para o caso novo.)

2. **Padronizar o select "Tipo de visita"** sem perder o estilo compacto:
   - Adicionar `className="h-10"` ao `<SelectTrigger>` do tipo de visita para alinhar com os `<Input h-10>` vizinhos (data e visitante).
   - Não tocar no componente global `select.tsx` (outros locais ultracompactos continuam com `h-7`).

Nada mais é alterado — payload de save, RLS, schema e demais campos permanecem como estão.