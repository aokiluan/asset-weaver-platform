
# Melhorias na tela de conciliação de documentos

## 1. Permissões (botão "Conciliar documentos")

**Hoje**: botão fica desabilitado para qualquer um sem `admin`, `gestor_comercial` ou `analista_cadastro`.

**Mudança**: a conciliação/validação é responsabilidade exclusiva do back-office de cadastro. Novos papéis permitidos:

- `admin` (master)
- `analista_cadastro`
- *(adicionar)* `gestor_cadastro` se existir — hoje não há esse papel em `roles.ts`, então uso `admin` como "master"

**Removidos** da permissão de conciliar:
- `gestor_comercial` → vê o botão **inativo** (cinza, com tooltip explicando)
- Qualquer perfil comercial (`comercial`) ou crédito (`analista_credito`, `gestor_credito`, `comite`) → também botão inativo

Resultado visual:
- Cadastro/Admin → botão clicável, abre o sheet de conciliação
- Comercial/Crédito/Outros → botão visível mas desabilitado, com tooltip: *"Apenas o time de cadastro pode conciliar documentos."*

## 2. Nova dinâmica: Comercial distribui, Cadastro valida

Hoje tudo acontece num único fluxo. A proposta separa claramente as duas etapas:

### Etapa A — Distribuição (perfil comercial)
O comercial faz upload e **arrasta cada documento para a categoria correta**. Já existe drag-and-drop hoje, mas é discreto (lista colapsada). Vou transformá-lo no modo principal de trabalho do comercial.

**Melhorias propostas:**

1. **Modo "Organizar documentos"** — novo toggle no topo do kanban (ao lado dos filtros) que troca entre:
   - **Lista** (atual, compacta) — bom para revisar
   - **Quadro** (novo) — cada categoria vira uma **coluna kanban larga** com zona de drop bem visível, cards maiores mostrando miniatura/ícone, nome do arquivo e badge da sugestão da IA

2. **Coluna "Sem categoria" sempre em destaque** no topo/esquerda, com badge contador. É a "caixa de entrada" do comercial.

3. **Drop zone visualmente clara**:
   - Borda tracejada quando vazia: *"Arraste documentos de [categoria] aqui"*
   - Highlight com cor primária ao arrastar por cima
   - Categorias **obrigatórias** ganham contorno destacado e selo "obrigatório" mais visível quando vazias

4. **Sugestão da IA mais ativa**: quando a IA sugere categoria, mostro um botão **"Aceitar sugestão →"** direto no card, e a categoria sugerida pisca brevemente para guiar o olho.

5. **Multi-seleção + arrastar em lote**: selecionar vários cards e arrastar todos juntos para uma categoria (já temos checkbox + dropdown "Mover", falta o drag em lote).

6. **Indicador de progresso da distribuição**: barra/contador no topo *"8 de 12 categorias obrigatórias preenchidas"* — dá ao comercial uma meta clara antes de "passar o bastão".

7. **Botão "Enviar para conciliação"** (novo, perfil comercial): quando todas as obrigatórias estão preenchidas, libera um botão que notifica o cadastro de que está pronto para validar. (Opcional — pode ser só visual por enquanto, sem notificação real.)

### Etapa B — Conciliação/Validação (perfil cadastro)

O sheet atual de conciliação já está bom (preview lado a lado, atalhos V/R, observações). Pequenos ajustes:

1. **Filtro inicial da fila**: hoje pega todos `status=pendente`. Adicionar opção *"Apenas com categoria definida"* — assim o cadastro não perde tempo com docs ainda não classificados pelo comercial.

2. **Aviso quando há documentos sem categoria na fila**: banner no topo do sheet *"3 documentos ainda estão sem categoria. Peça ao comercial para classificar antes de validar."*

3. **Atalho para devolver ao comercial**: além de Verificar/Reprovar, um terceiro estado leve *"Devolver para reclassificar"* (move volta para "sem categoria" e adiciona observação automática).

## 3. Detalhes técnicos

### Arquivos afetados
- `src/components/cedentes/DocumentosUploadKanban.tsx` — permissões do botão, novo modo "Quadro", drag-and-drop melhorado, contador de progresso
- `src/components/cedentes/ConciliacaoDocumentosSheet.tsx` — filtro da fila, banner de aviso, ação "devolver"

### Mudança de permissão (código)
```tsx
const canReview = hasRole("admin") || hasRole("analista_cadastro");
// (removido gestor_comercial)
```

### Modo Quadro (esboço)
```text
┌─ Sem categoria (3) ─┐ ┌─ Contrato Social * ─┐ ┌─ Cartão CNPJ * ─┐
│ [card] [card]       │ │ vazio — arraste     │ │ [card]          │
│ [card]              │ │ aqui                │ │                 │
└─────────────────────┘ └─────────────────────┘ └─────────────────┘
```
Layout horizontal com scroll, colunas de ~280px, cards arrastáveis entre colunas. Reaproveita os handlers `onCardDragStart` / `onCategoryDrop` existentes.

### Multi-drag
Usar `dataTransfer.setData("text/documento-ids", JSON.stringify([...checked]))` quando houver seleção, fallback para o id único atual.

## Fora de escopo (perguntar depois se quiser)
- Notificação real ao cadastro quando comercial finaliza distribuição (precisaria de tabela de notificações)
- Histórico de "quem moveu o quê" entre categorias
- Permitir ao gestor_comercial **ver** a fila de conciliação em modo somente-leitura

---

**Confirma essa direção?** Se sim, eu implemento os 3 blocos (permissões, modo Quadro com drag-and-drop, ajustes no sheet) numa única passada. Se preferir começar só por um deles (ex.: "só permissões + modo Quadro, deixa o sheet pra depois"), me diz.
