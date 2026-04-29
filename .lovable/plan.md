
# Fluxo de envio para análise + Revamp da aba Documentos

## Parte 1 — Envio do cedente para o analista de cadastro

### Como funciona hoje
O cedente tem `stage` (`novo → cadastro → analise → comite → formalizacao → ativo`). Já existe `evaluateGates()` validando o que falta para avançar de `novo` para `cadastro` (documentos obrigatórios, relatório de visita, pleito). **O que falta é o gatilho explícito** — o comercial não tem um botão claro de "enviar para análise" e o analista de cadastro não tem uma fila de trabalho.

### Solução proposta

**1. Botão "Enviar para análise de cadastro"** no cabeçalho do `CedenteDetail` (quando `stage = 'novo'`):

- Abre um modal de revisão com checklist do `evaluateGates`:
  - Documentos obrigatórios anexados (por categoria, com ✓/✗)
  - Relatório comercial preenchido
  - Pleito informado
  - Representantes sincronizados
- Se algo está faltando → botão desabilitado + lista vermelha do que resolver.
- Se OK → campo opcional "observação para o analista" + botão **Enviar**.
- Ao enviar: muda `stage` para `cadastro` (o trigger `log_cedente_stage_change` já registra no histórico). A observação vira uma entrada em `cedente_history.detalhes`.
- **Permissão**: visível apenas para `comercial`, `gestor_comercial`, `admin` e o owner do cedente.

**2. Painel do analista de cadastro** (quando `stage = 'cadastro'`):

- Mesmo botão vira **"Aprovar cadastro → enviar para crédito"** + botão secundário **"Devolver ao comercial"** (volta para `novo` com motivo obrigatório, registrado no histórico).
- **Permissão**: visível apenas para `analista_cadastro`, `gestor_comercial` (atua como gestor de cadastro hoje), `admin`.
- Para avançar: gates já existem (sem documentos rejeitados, todos obrigatórios validados).

**3. Fila de cadastros para analisar** — nova página `/cadastro/fila`:

- Lista de cedentes com `stage = 'cadastro'`, ordenada por data de envio.
- Colunas: razão social, CNPJ, comercial responsável, dias parado, % de docs já revisados.
- Linha clicável → abre `CedenteDetail` direto na aba Documentos.
- Item no sidebar **"Análise de cadastro"** visível apenas para `analista_cadastro / gestor_comercial / admin` (via `RoleGuard`).

### Por que assim e não notificação por e-mail / atribuição manual
A mudança de `stage` já é o "envio" — toda a infra (histórico, gates, RLS) já gira em torno disso. Só falta tornar a transição visível e bloqueá-la atrás de um checklist.

---

## Parte 2 — Revamp ergonômico da aba Documentos

### Problema atual
Cards grandes em grid 3-colunas para a fila + lista por categoria empilhada verticalmente. Para o analista comparar 8-15 documentos isso obriga a rolar muito e abrir cada arquivo em nova aba.

### Layout proposto: **Split-view com lista densa + viewer embutido**

```text
┌─────────────────────────────────────────────────────────────────┐
│ [Dropzone fina — 1 linha, expande no drag-over]                 │
├──────────────────────┬──────────────────────────────────────────┤
│ LISTA (esquerda)     │  VIEWER (direita)                        │
│ 380px largura fixa   │  flex-1                                  │
│                      │                                          │
│ ▾ Sem categoria (3)  │  ┌──────────────────────────────────┐   │
│   ☐ doc1.pdf  IA→CNPJ│  │                                  │   │
│   ☐ doc2.pdf  IA→Soc │  │   Preview do PDF / imagem        │   │
│ ▾ Contrato social ✓  │  │   (iframe / <img>)               │   │
│   ☐ contrato.pdf  ✓  │  │                                  │   │
│ ▾ CNPJ ✗ pendente    │  └──────────────────────────────────┘   │
│   ☐ cnpj.pdf         │  Toolbar: [Aprovar] [Reprovar]          │
│ ▾ Faturamento (vazio)│           [Mover ▾] [Baixar] [Excluir]  │
│                      │  Observações: [textarea]                │
└──────────────────────┴──────────────────────────────────────────┘
```

### Mudanças na lista (esquerda)

- **Linhas densas** (h-8, ~32px) em vez de cards. Ícone + nome truncado + badge minúsculo de status.
- **Agrupamento por categoria colapsável** (Accordion). Header da categoria mostra: nome, contador `n/obrig`, status (✓ OK / ⏳ pendente / ✗ faltando).
- **Drag-and-drop mantém-se**: arrastar uma linha sobre o header de outra categoria move.
- **Seleção múltipla** com checkbox → permite "Aprovar selecionados" / "Mover selecionados para X" em massa (matador para o analista).
- **Sugestão da IA** aparece como badge inline `🤖 CNPJ` clicável que aceita a sugestão sem abrir o card.
- **Filtros no topo da lista**: `Todos | Pendentes | Aprovados | Reprovados | Sem categoria`.
- **Atalhos de teclado**: `↑/↓` navega, `Enter` abre no viewer, `A` aprova, `R` reprova, `Del` exclui.

### Viewer (direita)

- Selecionar uma linha mostra o arquivo no painel à direita usando signed URL.
- PDF via `<iframe>` (Chrome render nativo); imagens via `<img>`.
- Toolbar fixa em cima com aprovar/reprovar/mover/baixar/excluir — sem precisar voltar à lista.
- Campo de observação salvando direto em `documentos.observacoes` (debounced).
- Botões `← Anterior / Próximo →` para varrer a fila sem voltar para a lista — fluxo de revisão tipo Gmail.

### Modo "comparação lado a lado" (bônus, opt-in)

Toggle no topo: **[Lista] [Viewer] [Comparar 2]**. Em "Comparar 2", duas linhas selecionadas viram dois iframes lado a lado (útil para conferir contrato social vs. última alteração).

### Responsividade

- ≥1280px: split 380/flex.
- 768–1279px: viewer vira drawer lateral (Sheet) acionado por clique.
- <768px: mantém visualização atual de cards (mobile).

---

## Detalhes técnicos

### Banco
Nenhuma migration de tabela. Já temos:
- `cedentes.stage` para a transição.
- `cedente_history` com trigger automático.
- `documentos.observacoes` para anotações do analista.

Adicionar **opcionalmente** `cedentes.enviado_analise_em timestamptz` para medir SLA na fila — pode ser feito via trigger `BEFORE UPDATE` quando `stage` vai para `cadastro`. Recomendo incluir.

### Componentes novos / alterados
- `src/components/cedentes/EnviarAnaliseDialog.tsx` — modal com checklist + observação.
- `src/components/cedentes/RevisarCadastroActions.tsx` — botões aprovar/devolver para o analista.
- `src/pages/cadastro/FilaCadastros.tsx` — nova página + rota + entrada no sidebar.
- `src/components/cedentes/DocumentosUploadKanban.tsx` — refator pesado para split-view + lista densa + viewer embutido + seleção múltipla + atalhos.
- `src/pages/CedenteDetail.tsx` — encaixar os botões de transição no header.
- `src/components/AppSidebar.tsx` — nova entrada "Análise de cadastro" com `RoleGuard`.

### Permissões (UI + reforço por RLS já existente)
- Enviar para análise: `comercial | gestor_comercial | admin | owner`.
- Aprovar/devolver cadastro: `analista_cadastro | gestor_comercial | admin`.
- Aprovar/reprovar documento individual: já coberto por `can_review_documento`.

### Riscos / pontos a confirmar
- Não existe role `gestor_cadastro` no enum atual — usei `gestor_comercial` como gestor da etapa de cadastro. Se quiser uma role separada, precisamos adicionar ao enum `app_role` (migration) e atualizar `useAuth`.
- Preview de PDF via iframe depende de signed URL de curta duração; vou usar 5min e refrescar ao trocar de doc.

---

## Pergunta antes de implementar
Quer que eu **crie a role `gestor_cadastro`** separada agora, ou seguimos com `gestor_comercial` cumprindo esse papel por enquanto?
