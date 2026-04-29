
# Modo "Conciliação de Documentos" — inspirado no Nibo

## Conceito

Replicar a metáfora do Nibo (botão **Conciliação** com contador de pendências → tela dedicada de validação item a item):

- A aba **Documentos** continua sendo a "caixa de entrada" — o comercial sobe arquivos, vê status, organiza por categoria.
- Surge um **botão "Conciliar documentos"** no topo da aba, com **badge vermelho** mostrando quantos documentos estão pendentes de validação.
- Esse botão **só fica clicável para `analista_cadastro`, `gestor_comercial` e `admin`**. Para os demais aparece como informativo (tooltip "apenas analista de cadastro").
- Clicar abre uma **tela cheia de conciliação** (drawer/sheet ocupando ~95% da viewport) com layout lado-a-lado:
  - **Esquerda (40%)**: ficha do documento — nome, categoria sugerida, dados extraídos do CNPJ/cedente, observações, histórico de upload.
  - **Direita (60%)**: o documento renderizado (PDF iframe / imagem).
  - **Rodapé fixo**: botões grandes `Reprovar` · `Marcar como verificado ✓` · `Próximo →` + `← Anterior`.
- Ao **verificar**, o documento passa para `status = aprovado` + ganha um selo "Verificado por X em DD/MM" e some da fila de pendências.
- Voltando para a aba Documentos, cada item validado mostra **selo verde "Verificado"** com nome do analista — visível para todos.

## Fluxo

```text
Aba Documentos (visível a todos)
┌─────────────────────────────────────────────────────────┐
│ [Upload]    [⚖ Conciliar  •3]  ← badge com pendências   │
│                  ↑ só clicável p/ analista              │
│                                                         │
│  Lista atual de documentos com selos:                   │
│   📄 Contrato.pdf      [✓ Verificado · Ana · 29/04]    │
│   📄 CNPJ.pdf          [⏳ Aguardando análise]          │
│   📄 Comp.End.pdf      [✗ Reprovado · falta atual]     │
└─────────────────────────────────────────────────────────┘
                       ↓ clica "Conciliar"
┌─────────────────────────────────────────────────────────┐
│ Conciliação · Cedente XYZ            1 de 3   [X fechar]│
├──────────────────────────┬──────────────────────────────┤
│ FICHA (40%)              │  VIEWER (60%)                │
│                          │                              │
│ 📄 contrato_social.pdf   │  ┌────────────────────────┐  │
│ Categoria sugerida:      │  │                        │  │
│   Contrato Social  [aceitar]│ │   PDF / Imagem         │  │
│                          │  │   render nativo        │  │
│ Dados extraídos:         │  │                        │  │
│  CNPJ: 12.345...   ✓ bate │  │                        │  │
│  Razão: ACME LTDA  ✓ bate │  └────────────────────────┘  │
│                          │                              │
│ Observações [textarea]   │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│ ← Anterior         [✗ Reprovar]  [✓ Verificar]  Próx → │
└─────────────────────────────────────────────────────────┘
```

## Permissões

| Ação | Quem pode |
|---|---|
| Ver aba Documentos / upload | comercial, owner, gestor, admin, analista |
| Ver botão "Conciliar" + badge | todos (informativo) |
| Abrir tela de conciliação e validar | `analista_cadastro`, `gestor_comercial`, `admin` |
| Selo "Verificado por X" | exibido para todos |

A RLS de `documentos` já é coberta por `can_review_documento` — não precisa migration.

## Mudanças técnicas

### 1. Nova prop/dado no card de documento
- Buscar `reviewed_by` + nome do reviewer (join com `profiles`) na query de `CedenteDetail` para mostrar "Verificado por Ana".

### 2. Componente novo `ConciliacaoDocumentosSheet.tsx`
- `<Sheet>` em modo `right` com `w-[95vw] sm:max-w-[95vw]`.
- Estado interno: índice atual + lista de docs pendentes (filtrada de `documentos`).
- Atalhos: `←/→` navega, `V` verifica, `R` reprova, `Esc` fecha.
- Reuso do mesmo signed-URL preview que já existe.
- Botão "Aceitar sugestão IA" inline na ficha.
- Quando a fila esvazia: tela de "🎉 Todos os documentos conciliados" com botão "Fechar".

### 3. Refator pequeno em `DocumentosUploadKanban.tsx`
- Remover o split-view atual (lista + viewer embutido) — fica apenas a **lista** com selos visuais reforçados.
- Adicionar acima da lista:
  ```tsx
  <Button onClick={openConciliacao} disabled={!canReview}>
    <Scale /> Conciliar documentos
    {pendentes > 0 && <Badge variant="destructive">{pendentes}</Badge>}
  </Button>
  ```
- Cada linha ganha selo:
  - `aprovado` → badge verde "✓ Verificado · {nome} · {data}"
  - `pendente` → badge âmbar "⏳ Aguardando análise"
  - `reprovado` → badge vermelho "✗ Reprovado" + tooltip com observação
- Mantém: dropzone, filtros, drag-and-drop entre categorias, ações em massa, sugestão IA.

### 4. Hook auxiliar `useCanReviewDocs`
- Wrapper que retorna `hasRole('analista_cadastro') || hasRole('gestor_comercial') || hasRole('admin')`.
- Usado tanto no botão "Conciliar" quanto nas ações de aprovar/reprovar das linhas (que ficam ocultas para quem não pode validar).

### 5. Indicador na aba "Documentos" do `CedenteDetail`
- O label da aba ganha o mesmo badge: `Documentos •3` (3 = pendentes), para o analista perceber pendência mesmo de outras abas.

## O que **não** muda
- Nenhuma migration nem alteração de RLS — `can_review_documento` já cobre.
- Endpoint `classify-documento` continua igual.
- Workflow de "Enviar para análise" / "Aprovar cadastro" continua igual.
- Storage e estrutura de categorias intactos.

## Riscos / pontos a confirmar
- **Performance no viewer**: PDFs grandes carregados via iframe podem demorar. Mantenho o pré-carregamento (signed URL) só do doc atual.
- **Comportamento em mobile**: a tela de conciliação fica em modo "stack" (ficha em cima, viewer embaixo) abaixo de 1024px. Aceitável dado que o público alvo (analista) trabalha em desktop.
- **"Verificado" vs "Aprovado"**: estou usando o mesmo `status='aprovado'` no banco e mudando só o vocabulário na UI ("Verificado" soa mais natural na metáfora de conciliação). Se preferir um terceiro estado separado, precisamos de migration.

## Pergunta
Quer que eu mantenha o **drag-and-drop** entre categorias na lista (útil para o comercial reorganizar antes de enviar), ou simplifico tudo só com o menu "Mover para…"?
