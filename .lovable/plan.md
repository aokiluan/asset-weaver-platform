## Relatório Comercial (renomeação + Pleito embutido)

### 1. Migração de banco

Expandir `cedente_visit_reports` (mantém o nome da tabela para preservar dados):

**Tornar nullable** (campos legados): `participantes`, `contexto`, `percepcoes`, `recomendacao`.

**Novas colunas — Cabeçalho da visita**
- `tipo_visita` text (prospecção / acompanhamento / renovação / outra)
- `visitante` text
- `entrevistado_nome`, `entrevistado_cargo`, `entrevistado_cpf`, `entrevistado_telefone`, `entrevistado_email` text

**Novas colunas — Negócio**
- `ramo_atividade` text
- `faturamento_mensal` numeric
- `principais_produtos` text
- `qtd_funcionarios` integer
- `pct_vendas_pf`, `pct_vendas_pj`, `pct_vendas_cheque`, `pct_vendas_boleto`, `pct_vendas_cartao`, `pct_vendas_outros` numeric

**Novas colunas — Adicionais**
- `parceiros_financeiros` text
- `empresas_ligadas` jsonb default `'[]'` (lista de {nome, cnpj, relacao})

**Novas colunas — Pleito embutido**
- `limite_global_solicitado` numeric
- `modalidades` jsonb default `'{}'` — 5 blocos fixos:
  ```
  {
    desconto_convencional: { ativo, limite, prazo_medio, taxa, observacao },
    cheques: { ativo, limite, prazo_medio, taxa, observacao },
    conta_escrow: { ativo, limite, observacao },
    comissaria: { ativo, limite, observacao },
    fluxo_futuro: { ativo, limite, observacao }
  }
  ```
- `avalistas_solidarios` jsonb default `'[]'` (lista de {nome, cpf})
- `assinatura_digital_tipo` text (ex: ICP-Brasil, eletrônica simples)
- `assinatura_digital_observacao` text

**Novas colunas — Parecer comercial**
- `parecer_comercial` text (substitui semanticamente o antigo "percepcoes/recomendacao", mas mantemos os legados por compatibilidade)

### 2. Frontend

**`src/components/cedentes/CedenteVisitReportForm.tsx`** — refatorar em accordion com 5 seções:
1. Cabeçalho da visita
2. Dados do negócio (com somatório visual dos % de vendas)
3. Informações adicionais (parceiros + empresas ligadas dinâmicas)
4. Pleito (limite global + 5 blocos fixos de modalidades + avalistas + assinatura)
5. Parecer comercial e pontos de atenção

**`src/pages/CedenteDetail.tsx`**
- Renomear aba "Relatório de visita" → **"Relatório comercial"**
- Remover aba "Pleito"
- Manter a listagem/visualização dos relatórios existentes funcionando (campos legados continuam exibíveis)

**`src/components/cedentes/CedenteVisitReportsList.tsx`** (se existir) — atualizar labels para "Relatório comercial".

### 3. Compatibilidade
Relatórios antigos continuam abrindo (campos novos ficam vazios / opcionais). Nenhuma exclusão de dado.

### 4. Fora de escopo
- Tabela `credit_proposals` permanece intocada (não é mais usada nesse fluxo, mas não removemos para preservar histórico).
- Dados bancários ficam para um cartão futuro no cadastro do cedente.
