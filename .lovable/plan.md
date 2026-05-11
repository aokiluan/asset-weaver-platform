## Objetivo

1. Adicionar campo **Observação** no diálogo de confirmação "Enviar para Cadastro" (e nas demais transições para frente), igual ao exemplo da imagem 2.
2. Estruturar uma feature de **comunicação entre perfis** no cedente: uma timeline única que mostra eventos de etapa + comentários trocados entre Comercial, Cadastro, Crédito, Comitê e Formalização (estilo "Histórico" das imagens 3 e 4).

---

## Parte 1 — Observação no envio

Hoje o `AlertDialog` de confirmação em `CedenteStageActions.tsx` (linhas 180-202) só tem "Cancelar / Confirmar". O componente já tem um `Dialog` parecido para devolução com Textarea — vamos aplicar o mesmo padrão para os envios "para frente":

- Trocar o `AlertDialog` de confirmação por um `Dialog` com:
  - Título: `Enviar para {Etapa}?`
  - Descrição curta (mantém a frase atual)
  - Campo **Observação** (Textarea, opcional, placeholder "Ex.: priorizar análise, particularidades do cliente…")
  - Footer: Cancelar (ghost) + Enviar (primário)
- Ao confirmar, gravar a observação no `cedente_history.detalhes->>'comentario'` (ver Parte 2). Manter compat com `cedentes.observacoes` se já existir uso.
- O mesmo dialog já cobre todas as transições "para frente" (Cadastro, Crédito, Comitê, Ativar). Devolução continua com o dialog atual (motivo obrigatório).

Também há um `AlertDialog` similar em `src/pages/CedenteDetail.tsx` (linhas 487-508) usado pelo `RevisarCadastroActions` — aplicar o mesmo tratamento ali.

---

## Parte 2 — Timeline de comunicação ("Histórico" do cedente)

### Modelo de dados

Já existe `public.cedente_history` (id, cedente_id, user_id, evento, stage_anterior, stage_novo, detalhes jsonb, created_at). Vamos reutilizá-la como **fonte única** da timeline e estender com comentários "soltos" (sem mudança de etapa):

- Padronizar valores de `evento`:
  - `STAGE_CHANGE` (já gerado por trigger ao mudar `cedentes.stage`)
  - `COMENTARIO` (novo — usuário posta uma mensagem livre)
  - `RETORNO` (devolução com motivo)
  - `DOCUMENTO_VALIDADO` / `DOCUMENTO_REJEITADO` (futuro, fora do escopo desta entrega)
- Adicionar coluna `parent_id uuid null references cedente_history(id)` para permitir respostas em thread (opcional, mas habilita "responder a um apontamento" como na imagem 4).
- `detalhes` passa a aceitar `{ "comentario": "texto", "mencoes": ["user_id"…] }`.
- Trigger atual de stage_change deve passar a copiar a observação informada no envio para `detalhes.comentario` (hoje grava em `cedentes.observacoes`).

RLS: SELECT permitido a qualquer perfil que já enxerga o cedente; INSERT permitido para qualquer usuário autenticado vinculado ao cedente (owner, ou que tenha role de qualquer etapa do fluxo). DELETE/UPDATE bloqueados (histórico imutável) — exceto admin.

### UI — aba "Histórico" no cedente

Nova aba `Histórico` no `PageTabs` da página `CedenteDetail` (ao lado de Visita, Documentos, Representantes, etc.), além de um **botão de atalho** com ícone `History` no header do cedente (igual à imagem 3, abrindo a mesma aba).

Componente novo: `src/components/cedentes/CedenteHistoryTab.tsx`

Layout (Nibo ultracompacto):
- Lista cronológica reversa, agrupada por dia.
- Cada item:
  - Linha 1: avatar + nome do usuário · papel (badge) · timestamp relativo
  - Linha 2: badge de **evento** (Mudança de etapa / Comentário / Retorno) com cor da etapa quando aplicável
  - Linha 3: corpo (texto do comentário, ou "Movido de Novo → Cadastro" + observação)
- Filtro no topo: por tipo de evento (chips) e por etapa.
- Caixa de novo comentário fixa no rodapé da aba: textarea compacta + botão "Publicar". Insere `evento='COMENTARIO'`.
- Realtime via `supabase.channel` na tabela `cedente_history` filtrando por `cedente_id` para atualizar a lista ao vivo.

### Integração com o envio

Quando o usuário envia para a próxima etapa com observação preenchida (Parte 1), o registro em `cedente_history` resultante terá:
- `evento = 'STAGE_CHANGE'`
- `stage_anterior`, `stage_novo`
- `detalhes = { comentario: "<texto>" }`

Assim a timeline mostra a transição **e** o recado num único item, equivalente ao "OBS" da imagem 4.

### Notificações (mínimo viável)

- Badge com contador de novos itens na aba `Histórico` desde a última visita do usuário (armazenado em `localStorage` por par user+cedente — sem nova tabela nesta entrega).
- Próximas iterações (fora do escopo): notificações por papel quando o cedente entra na etapa do usuário, e-mail digest etc.

---

## Arquivos afetados

- `src/components/cedentes/CedenteStageActions.tsx` — substituir AlertDialog de confirmação por Dialog com Textarea opcional.
- `src/pages/CedenteDetail.tsx` — mesmo tratamento no AlertDialog de avanço; adicionar aba `Histórico` e botão atalho.
- **Novo:** `src/components/cedentes/CedenteHistoryTab.tsx` — timeline + caixa de comentário + realtime.
- **Nova migração SQL:**
  - `ALTER TABLE cedente_history ADD COLUMN parent_id uuid REFERENCES cedente_history(id) ON DELETE SET NULL;`
  - Policies de SELECT/INSERT por `can_view_cedente` / autenticado vinculado.
  - Ajuste do trigger de stage para gravar `detalhes.comentario` a partir do payload de update (via uma coluna efêmera `_envio_observacao` ou usando `current_setting`).

## Fora do escopo
- E-mail/push de notificação.
- Anexos dentro do comentário (futuro).
- Edição/exclusão de comentários (histórico imutável por padrão).
