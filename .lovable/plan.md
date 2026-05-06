## Contexto e opinião

Sua ideia de "aceite de termos" antes de habilitar o voto é boa no espírito (forçar embasamento), mas tem dois riscos:

1. **Vira clique automático** — todo mundo aprende a "rolar até o fim e clicar aceitar" sem ler de verdade. O atrito existe mas o embasamento não melhora.
2. **Não resolve o problema real**, que é: o votante hoje teria que abrir 2 telas pesadas (Relatório comercial com ~10 seções e Análise de crédito com 8 blocos + anexos) para entender a proposta. O custo cognitivo é alto.

**Proposta melhor (e mais honesta):** combinar **(a) um "Briefing de votação" sintetizado dentro da própria aba Comitê** + **(b) um checklist leve de "li e considerei" por bloco**, que serve mais como guia de leitura do que como cadeado. O voto fica habilitado quando o checklist está completo — mas o checklist é curto, específico e aponta exatamente *o que* o votante precisa ter olhado, com link direto pro trecho.

Isso entrega o que você quer (votante embasado) sem cair no teatro do "aceito os termos".

## O que construir

### 1. Card "Briefing de votação" (novo, no topo da aba Comitê)

Um card único, denso, com tudo que o votante precisa pra decidir em 30 segundos. Puxa dados que já existem no banco (`cedente_visit_reports` + `credit_reports`):

```text
┌─ Briefing de votação ──────────────────────────────────┐
│ Cedente · CNPJ · Setor · Tempo de relacionamento       │
│ Pleito: R$ XXX • prazo Yd • taxa Z%  • Alçada: Nome    │
├────────────────────────────────────────────────────────┤
│ RECOMENDAÇÕES                                          │
│  Comercial:  [Aprovar com ressalvas]  por Fulano       │
│  Crédito:    [Aprovar]                por Ciclano      │
├────────────────────────────────────────────────────────┤
│ ▲ Pontos positivos (3)        ▼ Pontos de atenção (2)  │
│  • bullet curto                • bullet curto          │
│  • ...                         • ...                   │
├────────────────────────────────────────────────────────┤
│ Conclusão do analista (3 linhas, truncado, "ver mais") │
└────────────────────────────────────────────────────────┘
```

Fontes:
- Pleito/recomendação comercial → `cedente_visit_reports` (campos do pleito + parecer)
- Recomendação de crédito + pontos pos/atenção + conclusão → `credit_reports.recomendacao`, `pontos_positivos`, `pontos_atencao`, `conclusao`, `parecer_analista`
- Sem novas tabelas. Só leitura.

### 2. Checklist de leitura (leve, não bloqueante de UX)

Logo abaixo do briefing, 4–5 itens com checkbox. Cada um:
- Tem um link "Abrir trecho" que muda a aba interna pro lugar certo (Relatório comercial / Análise de crédito) e dá scroll na seção.
- Marca automaticamente quando o usuário expande/visualiza a seção alvo (ou manualmente).

Itens sugeridos (curtos e acionáveis):
- [ ] Li o **pleito comercial** (valor, prazo, modalidades) → abre Relatório comercial
- [ ] Vi os **pontos de atenção** levantados pelo crédito → abre Análise de crédito
- [ ] Conferi a **recomendação do analista** e a justificativa
- [ ] Olhei eventuais **restritivos / due diligence** (se houver)

Persistência: tabela nova **`committee_vote_checklist`** (`proposal_id`, `voter_id`, `item_key`, `checked_at`). RLS: votante só lê/escreve os próprios itens; admin/comitê leem tudo da proposta.

### 3. Habilitação do voto

- Botão "Confirmar voto" fica **habilitado sempre**, mas com um aviso visual quando o checklist não está completo:
  *"Você ainda não revisou: pontos de atenção, recomendação do analista. Quer votar mesmo assim?"* → confirma num diálogo.
- Voto registra junto a flag `checklist_completo` (boolean) e a contagem de itens revisados — fica auditável quem votou sem ler.

**Por que não bloquear duro:** votos de comitê têm urgência real, e bloquear gera o hábito de marcar tudo no automático. Tornar visível "fulano votou sem revisar X" é muito mais eficaz que um cadeado.

(Se você preferir o modo estrito — bloquear o botão até 100% — é uma flag de uma linha. Dá pra deixar configurável por alçada nas Configurações.)

### 4. Indicador no placar de votos

Na lista de Votantes (que já existe), adicionar um micro-ícone ao lado do nome:
- olho aberto = revisou tudo antes de votar
- olho riscado = votou pulando itens

## Detalhes técnicos

**Arquivos**
- `src/components/credito/ComiteGameSession.tsx` — adicionar `<VoteBriefing>` e `<ReadingChecklist>` antes do form de voto; passar `checklistCompleto` no `votar()`.
- Novos: `src/components/credito/VoteBriefing.tsx`, `src/components/credito/ReadingChecklist.tsx`.
- `src/pages/CedenteDetail.tsx` — aceitar query param `?tab=...&section=...` para deep-link das seções.

**Migração** (uma só)
- Criar tabela `committee_vote_checklist` com RLS.
- Adicionar colunas `checklist_completo boolean` e `itens_revisados int` em `committee_votes`.

**Sem mudanças** em `credit_reports`, `cedente_visit_reports`, autenticação, ou estrutura existente da aba Comitê — o card e o checklist são aditivos.

## Fora do escopo (sugestões pra depois)

- Geração automática de bullets via Lovable AI a partir do `parecer_analista` (resumir em 3 linhas) — útil mas pode ficar pra v2.
- Comentários inline no briefing (votantes anotam dúvidas) — vira ruído fácil; melhor ter só o campo de justificativa do voto que já existe.
