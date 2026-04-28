## Objetivo

Transformar o Dashboard Executivo em um painel tipo "Power BI light" alimentado por relatórios externos enviados pelo admin (CSV/Excel), mantendo os KPIs operacionais atuais (leads, propostas, cedentes) e adicionando blocos novos vindos dos relatórios.

## Arquitetura conceitual

```text
┌─────────────────┐    upload    ┌──────────────┐   parse    ┌──────────────┐
│ Admin (web UI)  │ ───────────► │ Storage      │ ─────────► │ Edge Function│
│  CSV/XLSX       │              │ report-files │            │ ingest-report│
└─────────────────┘              └──────────────┘            └──────┬───────┘
                                                                    │ insert
                                                                    ▼
                                                          ┌──────────────────┐
                                                          │ report_datasets  │
                                                          │ report_uploads   │
                                                          │ report_rows(jsonb)│
                                                          └────────┬─────────┘
                                                                   │
                                          ┌────────────────────────┴──────────┐
                                          ▼                                   ▼
                                   ┌──────────────┐                 ┌─────────────────┐
                                   │ Dashboard    │  ◄── consulta ──│ dashboard_widgets│
                                   │ (todos)      │                 │ (config admin)   │
                                   └──────────────┘                 └─────────────────┘
```

Três conceitos:

1. **Dataset** — um "tipo" de relatório (ex.: "Carteira mensal", "Títulos vencidos", "Avaliação de resultados"). Tem um schema de colunas esperadas.
2. **Upload** — um arquivo enviado num período de referência (ex.: "Carteira – out/2026"). Vinculado a um dataset.
3. **Widget** — um cartão/gráfico no dashboard. Aponta para um dataset, define agregação, filtro e tipo visual.

## Fluxo do usuário

**Admin (gestão de dados):**
1. Vai em `/admin/datasets` → cria um dataset (nome, descrição, colunas esperadas com tipo: texto/número/data).
2. Em `/admin/relatorios` → faz upload de um CSV/XLSX, escolhe o dataset e a data de referência.
3. Sistema valida colunas, importa linhas em `report_rows` (jsonb), marca o upload como `processado`.
4. Vai em `/admin/dashboard-widgets` → cria um widget escolhendo dataset, tipo (KPI / barra / linha / pizza / tabela), métrica (sum/avg/count de uma coluna), agrupamento e ordem.

**Todos os usuários:**
- Acessam `/` e veem o dashboard com os KPIs atuais (leads, propostas etc.) **+** os widgets configurados pelo admin, sempre com o snapshot mais recente de cada dataset (ou histórico, conforme widget).

## Modelo de dados (novo)

| Tabela | Campos principais |
|---|---|
| `report_datasets` | id, nome, slug, descricao, schema (jsonb com `[{key, label, type}]`), ativo, created_by |
| `report_uploads` | id, dataset_id, arquivo_nome, storage_path, periodo_referencia (date), linhas_total, status (`pendente`/`processado`/`erro`), erro_msg, uploaded_by, created_at |
| `report_rows` | id, upload_id, dataset_id, periodo_referencia, dados (jsonb), row_index |
| `dashboard_widgets` | id, titulo, dataset_id, tipo (`kpi`,`bar`,`line`,`pie`,`table`), config (jsonb: metric_col, agg, group_col, filter, format), ordem, ativo, created_by |

**RLS:**
- `report_datasets`, `dashboard_widgets`: SELECT para todos autenticados; INSERT/UPDATE/DELETE só admin.
- `report_uploads`, `report_rows`: SELECT para todos autenticados; INSERT/UPDATE/DELETE só admin.

**Storage:** bucket privado `report-files` (admin upload, signed URLs para download).

## Backend

**Edge function `ingest-report`:**
- Recebe `upload_id`.
- Baixa o arquivo do storage, detecta CSV/XLSX (usa SheetJS para XLSX).
- Lê linhas, valida cabeçalho contra `dataset.schema`, faz cast de tipos.
- Insere em lotes de 500 em `report_rows`.
- Atualiza `report_uploads.status` e `linhas_total`.

## Frontend

**Páginas novas (admin):**
- `src/pages/admin/Datasets.tsx` — CRUD de datasets, editor de schema (lista de colunas).
- `src/pages/admin/Relatorios.tsx` — upload (drag-and-drop), lista de uploads por dataset, status, reprocessar, baixar.
- `src/pages/admin/DashboardWidgets.tsx` — CRUD de widgets, preview ao vivo.

**Dashboard (`src/pages/Index.tsx`):**
- Mantém seção "Operacional" (KPIs e gráficos atuais).
- Nova seção "Indicadores de carteira" que renderiza dinamicamente os `dashboard_widgets` ativos.
- Componente `DynamicWidget` que, a partir de `config`, busca de `report_rows` (filtra pelo último `periodo_referencia` ou faixa) e agrega no cliente via `useMemo` (volume esperado: milhares de linhas por upload — ok no client; se crescer muito, migramos para uma RPC).

**Sidebar:** novo grupo "Admin → Datasets / Relatórios / Widgets" visível só para `admin`.

## Roadmap em fases

**Fase 1 — Fundação (esta entrega):**
- Migrations + bucket + RLS.
- Edge function `ingest-report` com suporte a CSV e XLSX.
- Telas admin de Datasets e Relatórios (upload + listagem + reprocessar).
- Widget dinâmico do tipo **KPI** e **bar/line** no dashboard.
- Tela admin de Widgets (CRUD básico).

**Fase 2 — Refinamento (próxima conversa):**
- Tipos `pie` e `table`, filtros por período no dashboard.
- Comparativo entre períodos (mês atual vs. anterior, variação %).
- Drilldown ao clicar num widget.

**Fase 3 — Avançado (futuro):**
- Cálculos derivados entre datasets (ex.: inadimplência / carteira).
- Alertas quando métrica cruza um limite.
- Agendamento via conector (Excel Online / Sheets) para sync automático.

## Premissas que assumi

- Volume por upload na casa de centenas a poucos milhares de linhas — viável guardar como `jsonb` em `report_rows` e agregar no front. Se passar de ~50k linhas, criamos RPCs com `GROUP BY`.
- Apenas admin envia relatórios e configura widgets; demais usuários só consomem.
- "Avaliação de resultados" e "títulos vencidos" entram como **dois datasets** que você cadastra no primeiro acesso — o schema é flexível e você define as colunas.

Confirma que faz sentido começar pela **Fase 1**? Se sim, aprovo e implemento.