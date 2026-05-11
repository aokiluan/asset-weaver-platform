## Objetivo

Padronizar a identidade visual de **todos** os PDFs gerados pela aplicação, replicando o tratamento já aplicado em `src/lib/minuta-pdf.ts` (logo horizontal S3 no canto superior + brasão S3 como marca d'água central em todas as páginas), usando os mesmos arquivos de logo azul/dourado já presentes em `src/assets/`.

---

## 1. Inventário de PDFs gerados pelo sistema

Hoje existem **4 geradores** ativos em `src/lib/`, todos baseados em `jsPDF`:

| # | Arquivo | O que gera | Onde é chamado |
|---|---------|-----------|----------------|
| 1 | `src/lib/minuta-pdf.ts` | **Contrato-mãe de cessão (minuta)** | `Formalizacao.tsx`, `CedenteDetail.tsx` (aba Formalização) — **já tem logo + watermark** ✅ |
| 2 | `src/lib/credit-report-pdf.ts` | **Relatório de Análise de Crédito** | `CreditReportForm.tsx`, `CreditReportVersionsPanel.tsx`, `ComiteGameSession.tsx` |
| 3 | `src/lib/visit-report-pdf.ts` | **Relatório Comercial de Visita** | `CedenteVisitReportForm.tsx`, `VisitReportVersionsPanel.tsx` |
| 4 | `src/lib/comite-ata-pdf.ts` | **Ata de Comitê** | `ComiteGameSession.tsx`, `Comite.tsx`, `CedenteHistoryTab.tsx` |

Os PDFs 2, 3 e 4 hoje saem **sem nenhum branding** — é o que vamos corrigir.

> Observação: relatórios do BI / dashboards atualmente são exportados em XLSX/CSV (sem PDF). Edge functions (`classify-documento`, `ingest-report`, `excel-graph`, etc.) não geram PDFs. Portanto o escopo se encerra nesses 4 arquivos.

---

## 2. Padrão visual a replicar (referência: `minuta-pdf.ts`)

Dois elementos de marca, usando os PNGs já no projeto:

- **Cabeçalho** — `s3-logo-horizontal.png` (versão azul + dourada), no canto **superior direito da primeira página**, largura ~38 mm.
- **Marca d'água** — `s3-logo-brand.png` (brasão), **centralizado em todas as páginas**, largura ~90 mm, opacidade `0.06` via `GState`.

Ambos já estão importáveis como ES modules (`@/assets/s3-logo-*.png`). O fluxo é: `urlToDataUrl()` → `addImage("PNG", ...)`.

---

## 3. Refatoração: extrair helper compartilhado

Para evitar duplicar a lógica em 4 arquivos, criar:

**`src/lib/pdf-branding.ts`** (novo) — exporta:

```text
loadS3Brand()                     -> data URL do brasão (cache em memória)
loadS3Horizontal()                -> data URL do logo horizontal (cache)
applyS3Watermark(doc)             -> aplica brasão em TODAS as páginas
applyS3HeaderLogo(doc, opts?)     -> aplica logo horizontal na pág. 1 (ou em todas, via opt)
applyS3Branding(doc, opts?)       -> wrapper conveniência: chama header + watermark
```

Opções suportadas (`opts`):
- `unit`: `"mm" | "pt"` (necessário porque `visit-report-pdf.ts` usa `pt` e os outros usam `mm` — o helper converte internamente).
- `headerOnAllPages`: `boolean` (default `false`).
- `watermarkOpacity`: `number` (default `0.06`).
- `headerWidth`: `number` (em unidades do doc; default 38mm equivalente).
- `topMargin`: número de pixels reservados no topo (para callers ajustarem o `y` inicial e não escreverem por cima do logo).

Em seguida, **migrar `minuta-pdf.ts`** para usar o helper (remove `applyWatermark`/`applyHeaderLogo` locais), garantindo zero regressão visual.

---

## 4. Aplicação em cada PDF

### 4.1. `credit-report-pdf.ts` (Relatório de Crédito)
- Hoje desenha um **cabeçalho azul-marinho sólido** (`doc.setFillColor(15,23,42); doc.rect(0,0,PAGE_W,22,"F")`) com o título e nome do cedente em branco.
- **Mudança:** manter a faixa azul institucional (alinhada à brand), mas **adicionar o logo horizontal S3** dentro dessa faixa, à direita (sobre fundo escuro a versão `s3-logo-horizontal-white.png` fica melhor — usar essa variante quando o fundo for escuro, configurável via `applyS3HeaderLogo({ variant: "white" | "color" })`).
- Adicionar **marca d'água do brasão** em todas as páginas via `applyS3Watermark(doc)` ao final, antes do loop de paginação.
- Nenhuma mudança no conteúdo / seções.

### 4.2. `visit-report-pdf.ts` (Relatório Comercial)
- Hoje cabeça apenas com texto "Relatório Comercial de Visita" + data.
- **Mudança:** chamar `applyS3HeaderLogo(doc, { unit: "pt" })` para colocar o logo horizontal no topo direito da pág. 1; ajustar `y` inicial (`margin += 30pt`) para não colidir.
- Aplicar `applyS3Watermark(doc, { unit: "pt" })` ao final.
- As páginas extras de fotos também receberão a marca d'água (consequência natural do loop de páginas).

### 4.3. `comite-ata-pdf.ts` (Ata de Comitê)
- Adicionar header logo (versão color) na primeira página, ao lado do bloco "Nº Comitê / data".
- Adicionar watermark central em todas as páginas.
- Reservar topo da pág. 1 para não sobrepor o título.

### 4.4. `minuta-pdf.ts` (Contrato-mãe)
- **Sem mudança visual** — apenas refator interno para usar o helper compartilhado.

---

## 5. QA visual (obrigatório)

Para cada um dos 4 PDFs, gerar um exemplo, converter páginas em imagens (`pdftoppm -jpeg -r 150`) e validar:
- Logo horizontal nítido, posicionado no canto superior direito da pág. 1, sem cortar a margem.
- Marca d'água visível mas suave (opacidade ~6 %), centralizada, **não interferindo na legibilidade** do texto.
- Conteúdo existente não foi empurrado/sobreposto pelo header.
- Quebras de página continuam corretas (especialmente na ata e no relatório de crédito que têm múltiplas seções).
- No relatório de crédito, o logo branco aparece corretamente sobre a faixa azul.

---

## 6. Arquivos a criar / editar

**Criar:**
- `src/lib/pdf-branding.ts`

**Editar:**
- `src/lib/minuta-pdf.ts` (refator, sem mudança visual)
- `src/lib/credit-report-pdf.ts` (header logo + watermark)
- `src/lib/visit-report-pdf.ts` (header logo + watermark, atenção à unidade `pt`)
- `src/lib/comite-ata-pdf.ts` (header logo + watermark)

**Sem mudanças em:**
- Componentes/pages que chamam esses geradores (a API pública das funções `generate*Pdf()` permanece igual).
- Arquivos de assets (logos já presentes em `src/assets/`).

---

## Fora do escopo
- Alterar layout/conteúdo dos PDFs além da inclusão de marca.
- Gerar novos PDFs (ex.: ficha do cedente, exportação de pipeline) — pode ser próximo passo.
- Trocar a paleta de cores/tipografia dos PDFs.
