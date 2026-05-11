## Objetivo

Tornar o comitê uma esteira objetiva: encerramento automático por unanimidade de votos dos membros do perfil `comite`, geração de **ata padrão em PDF** anexada ao histórico do cedente, e transformar a página `/comite` em um **centro operacional** (votação em lote + arquivo de atas), reduzindo a necessidade de entrar cedente por cedente.

---

## 1. Regra de encerramento: "todos os membros do comitê votaram"

Hoje o comitê depende de "votos mínimos" (quórum por alçada) e do clique manual em **Revelar votos** + **Encerrar e registrar decisão**. Vamos mudar para:

- **Membros elegíveis** = todos os usuários ativos com role `comite` (`profiles.ativo = true` ∩ `user_roles.role = 'comite'`).
- **Sessão fica "aberta"** enquanto faltar voto de algum membro elegível.
- Ao registrar o **último voto faltante**, um trigger no Postgres:
  1. Atualiza `committee_sessions.status = 'encerrada'`, preenche `revelada_em` e `encerrada_em`.
  2. Calcula a decisão: `aprovado` se favoráveis > desfavoráveis (empate = `reprovado`; abstenções não contam).
  3. Atualiza `credit_proposals.stage` para `aprovado`/`reprovado` e, se aprovado, move o cedente para `formalizacao`.
  4. Gera o registro da **ata** (ver item 2).
- **Admin** mantém ação manual de "Forçar encerramento" para casos de membro inativo / ausência prolongada.
- **Painel da sessão** passa a mostrar: `X de N membros votaram` + lista de **pendentes** (nome dos que ainda não votaram). O bloco "Quórum mínimo" some — passa a ser sempre unanimidade de presença.

UX no `ComiteGameSession`:
- Remove botões "Revelar votos" e "Encerrar" do fluxo normal (ficam só num menu admin).
- Banner verde de sucesso quando sessão fecha automaticamente.

---

## 2. Ata padrão de comitê (registro + PDF)

Criar tabela **`committee_minutes`** (1 linha por sessão encerrada) com snapshot imutável:

```text
committee_minutes
├─ session_id, proposal_id, cedente_id
├─ numero_comite        (sequencial global, ex. "87º Comitê")
├─ realizado_em         (data da última votação)
├─ participantes        (jsonb: [{nome, voto, justificativa, votou_em}])
├─ pleito               (jsonb: limite, prazo, taxa, modalidades)
├─ recomendacao_credito (texto do parecer)
├─ pontos_positivos / pontos_atencao (jsonb[])
├─ decisao              ('aprovado' | 'reprovado')
├─ condicoes            (texto livre — opcional, editável por admin/comitê antes do "fechar ata")
├─ pdf_storage_path
└─ created_at
```

Geração:
- Snapshot é montado pelo trigger de encerramento (item 1).
- Botão **"Gerar/Baixar ata (PDF)"** disponível para `admin`, `comite`, `credito`, `formalizacao` na aba Comitê do cedente e na seção de atas (`/comite`).
- Layout do PDF inspirado nos modelos enviados:
  - Cabeçalho: logo + "Nº Comitê", data/hora, participantes.
  - Bloco do cedente: razão social, CNPJ, código da proposta.
  - Pleito (tabela compacta) e Decisão em destaque.
  - Lista de votos (nome → favorável/desfavorável + justificativa).
  - Pontos positivos / pontos de atenção (do briefing).
  - Condições e observações.
  - Rodapé institucional.
- Implementação: `src/lib/comite-ata-pdf.ts` usando `jsPDF` (mesmo stack de `minuta-pdf.ts` e `credit-report-pdf.ts`).
- Ata também é registrada em `cedente_history` (`evento = 'ata_comite'`) com link para o PDF — fica visível na aba **Histórico** do cedente.

---

## 3. Padrão de nomeação do PDF

Hoje os PDFs do projeto seguem `tipo-<slug-cedente>.pdf` (ver `credit-report-pdf.ts`). Vamos estender para incluir data e número do comitê, mantendo o mesmo estilo (kebab-case, lowercase, sem acentos):

```
ata-comite-<numero>-<slug-cedente>-<yyyy-mm-dd>.pdf
ex.: ata-comite-87-eco-pack-distribuidora-2026-05-11.pdf
```

Função utilitária `buildAtaFilename({ numero, cedenteNome, data })` colocada em `src/lib/comite-ata-pdf.ts` e reusada em todos os pontos de download.

---

## 4. Página `/comite` — central de votação + arquivo de atas

A página passa a ter três abas (`PageTabs`):

### Aba "Em pauta" (default)
Foco em **votar em lote sem entrar em cada cedente**:
- Lista de propostas em `stage = 'comite'` agrupadas por **dia de entrada**.
- Cada card mostra: cedente, CNPJ, pleito resumido (limite, prazo, taxa, modalidades), e badges:
  - "Aguarda seu voto" (pulsante) / "Você já votou" / "Faltam N votos".
- Botão primário **"Votar agora"** abre **modal lateral (Sheet)** com:
  - Briefing (`VoteBriefing`) + checklist de leitura (`ReadingChecklist`).
  - Botões Favorável / Desfavorável + justificativa.
  - **"Salvar e ir para a próxima"** → fecha o sheet e abre o próximo cedente pendente automaticamente (modo "fila de votação").
- Filtro rápido: `Apenas pendentes meus` (default ON para perfil `comite`).
- Indicador no topo: "Você tem **3 cedentes** aguardando seu voto" com CTA "Iniciar fila de votação".

### Aba "Encerrados"
- Cedentes cujo comitê fechou nos últimos 90 dias.
- Cada linha: data, nº comitê, cedente, decisão (badge verde/vermelho), participantes, link para a ata (PDF) e para o cedente.

### Aba "Atas"
- Tabela de todas as atas (`committee_minutes`) com busca por cedente / nº comitê / período.
- Ações: **Baixar PDF** e **Abrir cedente**.
- Para `admin`: gerar ata consolidada de uma data (PDF único agregando todos os cedentes votados naquele dia, no formato do segundo modelo enviado — "86º Comitê 31/10/2025").

### Painel do membro (topo)
Cards mantidos mas reorientados para o novo fluxo:
- "Aguardando seu voto"
- "Você já votou (em pauta)"
- "Atas dos últimos 30 dias"

---

## 5. Detalhes técnicos (resumo p/ implementação)

**Migrations**
- Função `public.committee_eligible_voters()` → conta membros ativos com role `comite`.
- Função `public.committee_close_if_complete(_proposal_id)` → fecha sessão, decide, atualiza proposta + cedente, snapshota `committee_minutes`.
- Trigger `AFTER INSERT/UPDATE` em `committee_votes` → chama a função acima.
- Tabela `committee_minutes` + RLS (SELECT segue `can_view_proposal`; INSERT só via SECURITY DEFINER; UPDATE de `condicoes` para `admin`/`comite`).
- Sequence `committee_minutes_numero_seq` para `numero_comite`.

**Frontend**
- `src/lib/comite-ata-pdf.ts` (novo): geração do PDF + helper de nomeação.
- `src/components/credito/ComiteGameSession.tsx`: remove "Revelar/Encerrar" do fluxo normal, adiciona "X/N membros votaram" + lista de pendentes + botão "Baixar ata" quando encerrada.
- `src/pages/Comite.tsx`: reescrever com `PageTabs` (Em pauta / Encerrados / Atas) + modo "fila de votação" via `Sheet`.
- `src/components/cedentes/CedenteHistoryTab.tsx`: novo evento `ata_comite` com link de download.

**Permissões**
- Votar: `comite` + `admin`.
- Forçar encerramento / editar condições da ata: `admin`.
- Baixar ata: qualquer perfil que já consegue ver a proposta.

**Compatibilidade**
- `votos_minimos` da `approval_levels` deixa de governar o fechamento, mas continua exibido como **"alçada original"** na ata para registro histórico.

---

## Fora do escopo deste plano
- Notificações por e-mail aos membros pendentes (pode ser próximo passo).
- Assinatura digital da ata.
- Edição da ata após o fechamento (apenas o campo `condicoes` é editável por admin).
