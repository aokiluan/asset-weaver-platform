## Nova seção "Boletas" no módulo Relação com Investidores

Adiciona uma aba **Boletas** ao lado de "CRM de Prospecção" que lista os contatos no estágio `boleta_em_andamento` e permite executar um fluxo de boleta multi-etapas (dados → série → assinatura → pagamento), inspirado no projeto Invest Fácil mas integrado ao CRM e à base de dados deste projeto.

---

### 1. Banco de dados (migração)

**Tabela `investor_series`** (catálogo administrável)
- nome, descricao, indexador (ex.: CDI), spread (numeric), prazo_meses, ativa (boolean), ordem

**Tabela `investor_boletas`** (uma por boleta de um contato)
- contact_id → `investor_contacts`
- series_id → `investor_series`
- valor (numeric), prazo_meses, taxa_efetiva (numeric, opcional)
- status: enum `boleta_status` com `rascunho | aguardando_assinatura | assinada | pagamento_enviado | concluida | cancelada`
- current_step (int 1–4), dados_investidor (jsonb: nome, doc, RG, endereço, e-mail), observacoes
- contrato_path, contrato_assinado_em, comprovante_path, pagamento_enviado_em
- concluida_em, created_by, timestamps

**Tabela `investor_boleta_history`** (auditoria de transições)
- boleta_id, user_id, evento, detalhes (jsonb), created_at

**RLS:** todas seguem o padrão "dono do contato" (`contact.user_id = auth.uid()`); admin enxerga tudo. `investor_series` é leitura para autenticados, escrita só para admin.

**Storage:** bucket privado `investor-boletas` com políticas baseadas em `auth.uid()/<boleta_id>/...`.

**Trigger:** ao mudar `status` para `concluida`, registra histórico e (opcional, sem auto-mover) deixa o usuário decidir mover o contato para `investidor_ativo`.

---

### 2. Admin de séries

- Nova página `src/pages/admin/AdminSeriesInvestidor.tsx` listando séries com CRUD (nome, indexador, spread, prazo, ativo).
- Entrada no `AdminSidebar`/Configurações já existente.

---

### 3. UI no módulo de investidores

**`PageTabs` em `InvestidoresCRM`** ganha segunda aba `/investidores/boletas`.

**Nova página `src/pages/investidores/Boletas.tsx`:**
- Header com filtro por contato (busca por nome) e botão "Nova boleta" (abre seletor de contato em estágio `boleta_em_andamento`).
- Bloco **Rascunhos** (boletas em `rascunho` ou `aguardando_assinatura`): card compacto com nome do investidor, série, valor, etapa atual, "Continuar".
- Bloco **Em andamento** (`assinada`, `pagamento_enviado`): cartão com status colorido + ações.
- Bloco **Concluídas** (recolhível): histórico recente.
- Métricas no topo: total em andamento, valor pipeline, qtd concluídas no mês.
- Layout segue padrão Nibo ultracompacto (cards p-2.5, h-7, ícones 3.5).

**Wizard `BoletaWizardSheet.tsx`** (Sheet lateral direita, mesmo padrão dos outros sheets do projeto):
1. **Dados do investidor** — pré-preenche com `investor_contacts` (nome, telefone), pede CPF/CNPJ, RG, endereço, e-mail.
2. **Série e valor** — Select carrega `investor_series` ativas; input de valor; mostra prazo/taxa derivados.
3. **Assinatura** — upload do contrato assinado (PDF) → bucket `investor-boletas`; ao salvar, status = `assinada`.
4. **Pagamento** — upload do comprovante (PDF/imagem); status = `pagamento_enviado`; botão "Concluir boleta" → `concluida` + opção "Mover contato para Investidor Ativo".

Cada etapa salva como rascunho automaticamente (reaproveita `useFormDraft`); usuário pode fechar e voltar pela lista.

**Ações por linha:**
- Continuar (abre wizard na `current_step` salva)
- Visualizar (sheet read-only com timeline)
- Excluir (só rascunhos, não concluídas)

---

### 4. Helpers / lib

- `src/lib/investor-boletas.ts`: tipos (`Boleta`, `BoletaStatus`), labels, helpers de transição e formatação.
- Reaproveita `fmtCompactBRL`, `formatCpfCnpj`, etc.

---

### 5. Rotas

- `/investidores/crm` (atual)
- `/investidores/boletas` (nova) — protegida por `useModulePermissions('relacao_investidores')`.
- `/admin/series-investidor` (admin).

---

### Fora do escopo desta entrega
- Geração automática de minuta/contrato em PDF (anexa-se manualmente).
- Integração com assinador eletrônico externo (DocuSign/Clicksign).
- Cobrança automática / boleto bancário real — apenas registro do fluxo interno.

Posso seguir com essa estrutura?