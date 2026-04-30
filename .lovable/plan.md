
## Objetivo

Tornar a tela de Documentos mais compacta e óbvia para o comercial classificar:

1. A área tracejada de upload passa a abrigar também os arquivos **"Sem categoria"** (bandeja única de entrada).
2. Substituir o modo **Quadro** (kanban com colunas largas) por uma **Tabela Compacta** inspirada na "Central de Documentos" da imagem 2 — cada linha (categoria) é uma drop-zone.

Sem mudanças de banco. Mudanças isoladas em `src/components/cedentes/DocumentosUploadKanban.tsx`.

---

## 1. Bandeja de entrada unificada (Upload + Sem categoria)

Hoje o "Sem categoria" é só mais um grupo na lista/quadro. Vamos fundi-lo com o dropzone de upload no topo:

```text
┌──────────────────────────────────────────────────────────────┐
│ ⬆  Arraste arquivos aqui ou clique para selecionar           │
│                              PDF/JPG/PNG • IA sugere categoria│
├──────────────────────────────────────────────────────────────┤
│ 3 arquivos sem categoria — arraste para uma linha abaixo      │
│ ┌────────────────────────┬───────────────────────┬─────────┐ │
│ │ ☐ contrato_v2.pdf      │ IA: Contrato Social ✓ │ ↓ ✕    │ │
│ │ ☐ comprovante.jpg      │ IA: Comprov. End.  ✓ │ ↓ ✕    │ │
│ │ ☐ doc_misterio.pdf     │ — sem sugestão —      │ ↓ ✕    │ │
│ └────────────────────────┴───────────────────────┴─────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Comportamento:
- Quando **não há** docs sem categoria, só o dropzone aparece (estado atual).
- Quando há, expande mostrando lista compacta interna: nome + chip da sugestão de IA + botão "Aceitar" + dropdown para mover manualmente + remover.
- O dropzone continua aceitando upload por drag (de arquivos do SO) **e** por click — não conflita com drag interno (que é entre cards e linhas da tabela).
- Cards desta bandeja são `draggable` para arrastar até a tabela de categorias.
- Removemos o grupo "Sem categoria" da lista/tabela principal abaixo (evita duplicação).

## 2. Tabela compacta de categorias (substitui o modo Quadro)

Inspirada na "Central de Documentos" mas otimizada para drag-and-drop. Cada **linha = uma categoria** = uma drop-zone.

```text
┌────┬─────────┬────────────────────────────────┬──────────┬──────────┬─────┐
│ ●  │ OBRIG.  │ CATEGORIA                      │ ANEXADOS │ VERIFIC. │ ▾   │
├────┼─────────┼────────────────────────────────┼──────────┼──────────┼─────┤
│ ✓  │  SIM    │ Contrato Social                │   2      │  2/2 ✓   │  ▸  │
│ ✗  │  SIM    │ Comprovante de Endereço        │   0      │   —      │  ▸  │ ← drop aqui
│ ✓  │  NÃO    │ Procuração                     │   1      │  0/1     │  ▸  │
│ ✓  │  SIM    │ Declaração de Faturamento      │   3      │  1/3     │  ▾  │
│    │         │   ↳ ☐ fat_jan.pdf  …  ✓ verif. │          │          │     │
│    │         │   ↳ ☐ fat_fev.pdf  …  ⏳ pend. │          │          │     │
└────┴─────────┴────────────────────────────────┴──────────┴──────────┴─────┘
```

Características:
- **Densidade alta**: linhas de ~36px, sem cards grandes. Toda a página de categorias cabe sem rolagem horizontal.
- **Coluna "●"**: bolinha de status (verde se completo, vermelho vazio, cinza opcional vazio).
- **Coluna "OBRIG."**: chip "SIM" verde / "NÃO" cinza (estilo da imagem).
- **Coluna ANEXADOS / VERIFICADOS**: contagens.
- **Linha inteira é drop-zone**: ao arrastar um doc da bandeja (ou de outra categoria) para qualquer ponto da linha, a linha realça (ring-primary) e ao soltar move o(s) documento(s).
- **Expansão inline (▸/▾)**: clicar na linha (ou no chevron) revela sub-linhas com cada documento daquela categoria — checkbox, nome, selo de status, mover/baixar/remover. Todas começam **colapsadas** por padrão (visão executiva).
- **Multi-seleção continua funcionando**: checkbox nas sub-linhas e na bandeja; arrastar 1 = arrasta o(s) selecionado(s) (já implementado em `onCardDragStart`).
- Linhas obrigatórias vazias ganham borda esquerda destacada (accent-destructive sutil) — substitui o "faltando" verboso.

### Toggle de visualização

- Renomear modos: **"Compacto"** (a nova tabela, default) e **"Detalhado"** (lista atual com grupos colapsáveis e cards). Removemos o modo "Quadro" (kanban largo).
- O ícone `LayoutGrid` é reaproveitado para "Compacto"; `LayoutList` para "Detalhado".

## 3. Detalhes técnicos

Arquivo único: `src/components/cedentes/DocumentosUploadKanban.tsx`.

- `ViewMode = "compacto" | "detalhado"` (default `"compacto"`).
- Novo componente interno `<EntradaSemCategoria>`:
  - Recebe os docs com `categoria_id === null`, renderiza dropzone + lista interna (quando `docs.length > 0`).
  - Reusa `uploadFiles`, `onCardDragStart`, `moveTo`, `handleDelete`.
  - Quando o usuário solta um arquivo do SO no dropzone: continua como upload; quando solta um card interno (que já está sem categoria), nada acontece (drop-zone interna ignora `text/documento-ids`).
- Novo `<TabelaCategorias>` (modo compacto):
  - `grupos` filtrado para excluir `SEM_CAT` (já mostrado na bandeja).
  - Cada `<tr>` aplica `onDragOver/onDrop` chamando `onCategoryDragOver/onCategoryDrop` existentes.
  - Estado `expanded: Set<string>` (independente de `collapsed` do modo detalhado).
  - Sub-linhas usam variante simplificada do `renderCard` (sem o card grande do board) — basicamente o mesmo HTML do variant `"list"` atual mas dentro de `<tr>`.
- O modo "Detalhado" reaproveita o renderizador atual de lista, mas também sem o grupo `SEM_CAT` (movido p/ bandeja).
- Filtros (`Todos`, `Pendentes`, etc.) continuam funcionando — o filtro `"sem_categoria"` passa a focar/destacar a bandeja (rolar até ela e abrir um anel) em vez de filtrar a tabela; alternativa simples: manter como está mas escondendo a tabela quando o filtro for `sem_categoria`.

## 4. Fora de escopo

- Sem mudanças de schema, RLS, ou edge functions.
- Permissões de conciliação (admin / analista_cadastro) permanecem como já implementado.
- `ConciliacaoDocumentosSheet` não muda nesta passada.
