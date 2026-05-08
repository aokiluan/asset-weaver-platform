## Objetivo

Trocar a navegação dos botões "Relatório comercial completo" e "Análise de crédito completa" por um **modal de leitura obrigatória** que exibe o PDF inline. O membro do comitê só consegue fechar depois de:

1. Rolar até o final do documento.
2. Marcar a checkbox "Confirmo que li o relatório integralmente".

A confirmação é persistida em `committee_vote_checklist` (tabela já existente), de forma que ao reabrir o modal o estado é lembrado e o ícone do botão muda para "lido".

---

## Componentes / arquivos

### 1. Tornar os geradores de PDF capazes de retornar Blob

`src/lib/visit-report-pdf.ts` e `src/lib/credit-report-pdf.ts` hoje terminam em `doc.save(...)`. Adicionar um parâmetro opcional `mode: "download" | "blob"` (default `"download"` p/ não quebrar callers existentes). Quando `"blob"`, retornar `{ blob, url: URL.createObjectURL(blob) }` em vez de baixar.

### 2. Novo componente `PdfReadingDialog`

`src/components/credito/PdfReadingDialog.tsx`

Props:
```ts
{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;                  // "Relatório comercial — HS GESTAO…"
  pdfUrl: string | null;          // object URL do blob
  loading: boolean;
  proposalId: string;
  itemKey: "lido_relatorio_comercial" | "lido_analise_credito";
  alreadyConfirmed: boolean;      // se já estava marcado, dispensa rolagem/checkbox
  onConfirmed: () => void;        // após gravar no committee_vote_checklist
}
```

Comportamento:
- Usa `Dialog` do shadcn em tamanho grande (`max-w-4xl h-[85vh]`).
- Header com título + badge "Leitura obrigatória".
- Body: `<iframe src={pdfUrl}>` ocupando o espaço, com um wrapper `div` rolável que detecta scroll-end. Como o scroll real acontece dentro do iframe e não conseguimos ouvir, usamos um padrão alternativo:
  - Renderizar o PDF via **react-pdf** (`pdfjs-dist`) já presente? Verificar; se não, **usar um iframe + checkbox de "li até o fim" manual habilitada após X segundos OU detectar via PDF.js**.
  - **Decisão técnica:** usar `react-pdf` (`pdfjs-dist` é dep transitiva do jsPDF/comum). Se não estiver instalado, instalar `react-pdf`. Renderizamos as páginas em um `div` com `overflow-auto` e usamos `onScroll` p/ detectar `scrollTop + clientHeight >= scrollHeight - 8`.
- Estado `reachedEnd` (true após scroll-end) e `confirmed` (checkbox marcada).
- Footer:
  - À esquerda: indicador "Role até o final para liberar a confirmação" (cinza) → "Pronto para confirmar" (verde) quando `reachedEnd`.
  - Checkbox "Confirmo que li o relatório integralmente" — disabled enquanto `!reachedEnd`.
  - Botão "Fechar" — disabled enquanto `!confirmed && !alreadyConfirmed`.
- Ao marcar a checkbox: `INSERT` em `committee_vote_checklist { proposal_id, voter_id: auth.uid(), item_key }` (ignorar duplicate key) e chamar `onConfirmed()`.
- Tentar fechar (X, Esc, clique fora) sem ter confirmado → bloquear (`onOpenChange` recusa) e mostrar `toast.warning("Conclua a leitura antes de fechar")`.

### 3. Integração no `VoteBriefing`

`src/components/credito/VoteBriefing.tsx`:
- Substituir os dois `<Link to="...?tab=visita|credito">` por dois `<Button onClick>` que:
  1. Geram o PDF (`generateVisitReportPdf(snapshot, cedenteId, undefined, "blob")` ou `generateCreditReportPdf(report, nome, "blob")`).
  2. Abrem o `PdfReadingDialog` com o `pdfUrl` retornado.
- Carregar `committee_vote_checklist` para o `proposalId` + `voter_id = user.id` para descobrir `alreadyConfirmed` de cada item, e refletir no botão (ícone `CheckCircle2` verde + texto "Lido" quando já confirmado).
- Para o relatório comercial, precisamos do snapshot completo (`cedente_visit_reports.*`); estender o `select` atual.
- Para a análise de crédito, idem com `credit_reports.*`.
- Cleanup de `URL.revokeObjectURL` no unmount / ao trocar de PDF.

### 4. Persistência

Tabela `committee_vote_checklist` já existe. RLS atual permite `INSERT` apenas para `voter_id = auth.uid()` com role `comite`/`admin` — perfeito. Não precisa de migration.

`item_key` novos:
- `lido_relatorio_comercial`
- `lido_analise_credito`

Sem proposalId não persistimos (botão fica habilitado mas confirmação só em memória).

### 5. Detalhes UX (padrão Nibo)

- Dialog header `p-3`, footer `p-3 border-t`, body sem padding interno (PDF preenche).
- Checkbox + label `text-[12px] leading-tight`.
- Botões `h-7`.
- Indicador de progresso de leitura: pequena barra `h-1` no topo do body que enche conforme `scrollTop / scrollHeight`.

---

## Arquivos editados / criados

- `src/lib/visit-report-pdf.ts` — adicionar `mode: "download" | "blob"`, retornar `{ blob, url }` quando blob.
- `src/lib/credit-report-pdf.ts` — idem.
- `src/components/credito/PdfReadingDialog.tsx` — **novo**.
- `src/components/credito/VoteBriefing.tsx` — trocar Links por botões + abrir dialog + carregar dados de leitura prévia + estender selects.
- `package.json` — adicionar `react-pdf` se ainda não estiver presente.

## O que NÃO muda

- Estrutura de tabs `/cedentes/:id`.
- Geração de PDF no fluxo normal (download continua funcionando).
- Lógica de votação / quórum.
- Padrão Nibo ultracompacto.

## Aberto p/ confirmação

- **Dependência react-pdf (~150 kB gz)**: ok adicionar? Alternativa: iframe + timer mínimo de 5s + checkbox manual (sem detecção real de "fim do PDF"). Detecção via PDF.js é a única forma confiável de saber que o leitor rolou até o fim.
