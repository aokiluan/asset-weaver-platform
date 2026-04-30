## Objetivo

Criar a aba **Formalização** dentro do `CedenteDetail`, onde o usuário:
1. **Gera a minuta padrão** (modelo S3 Capital anexado) já preenchida com os dados do cedente, representante(s) e fiadores;
2. **Faz download** do PDF para enviar à plataforma externa de assinatura;
3. **Faz upload** do contrato assinado quando ele volta da plataforma;
4. **Marca como assinado** (com data/hora/usuário), o que destrava o avanço para `ativo`.

Sem dependência de plataforma externa (DocuSign/Clicksign): o fluxo é manual — a empresa assina fora e devolve o PDF.

---

## Mudanças

### 1) Aba "Formalização" no `CedenteDetail.tsx`

Adicionar nova aba `formalizacao` (entre **Comitê** e **Histórico**), seguindo o mesmo padrão visual das outras abas. Componente novo `FormalizacaoTabContent` com 3 áreas:

**a) Geração da minuta**
- Botão "Gerar minuta (PDF)" que chama `downloadMinutaPDF(...)` com:
  - dados do cedente (razão social, CNPJ, endereço completo, etc.)
  - **representantes legais** (busca em `cedente_representantes` — qualificação completa: nome, CPF, RG, estado civil, endereço, etc.)
  - **avalistas/fiadores** (busca em `cedente_visit_reports.avalistas_solidarios`)
  - dados financeiros aprovados (proposta mais recente)
- Aviso visual se faltar algum dado essencial (ex: sem representante cadastrado).

**b) Upload do contrato assinado**
- Reaproveita o bucket existente `cedente-docs`.
- Cria categoria fixa "Contrato de cessão assinado" (`documento_categorias`) via migration — assim o arquivo aparece também na aba Documentos sob essa categoria, mas o **upload é feito daqui** (botão direto), sem precisar passar pelo Kanban.
- Lista os arquivos já enviados nessa categoria (download + remover).

**c) Confirmação de assinatura**
- Botão "Marcar contrato como assinado" — só fica ativo quando há pelo menos 1 arquivo enviado na categoria "Contrato de cessão assinado".
- Atualiza `cedentes.minuta_assinada = true`, `minuta_assinada_em = now()`, `minuta_assinada_por = auth.uid()`.
- Quando assinado: mostra badge verde "Assinado em DD/MM/AAAA por Fulano" e botão "Desfazer assinatura" (admin/gestor financeiro).
- Esse mesmo gate (`minutaAssinada`) já é consumido pelo `evaluateGates` para liberar `formalizacao → ativo` no stepper.

### 2) Reescrita do gerador `src/lib/minuta-pdf.ts`

Substituir o conteúdo atual (modelo genérico) pelo **modelo S3 Capital** anexado, fielmente:
- Cabeçalho **CONTRATO DE FOMENTO MERCANTIL**
- Cláusula 1 — Partes: 
  - Bloco fixo da CONTRATADA (S3 Capital, CNPJ 60.353.126/0001-71, Av. Júlio Diniz 257, etc., representada por Everaldo Fernando Silvério)
  - Bloco da CONTRATANTE (preenchido com cedente: razão social, CNPJ, endereço, **representante legal** com nacionalidade, estado civil, profissão, RG, CPF, endereço residencial)
  - Bloco dos **Responsáveis Solidários — Fiadores** (lista a partir dos avalistas do relatório de visita; se vazio, mantém o texto padrão "já qualificados em instrumento original")
- Cláusulas 2 a 17 com o texto exato da minuta anexada
- Local/data dinâmicos: "Campinas/SP, [data atual por extenso]"
- Linhas de assinatura para CONTRATADA, CONTRATANTE, fiadores e 2 testemunhas
- Mantém `jsPDF` (já em uso) — quebras de página automáticas, paginação no rodapé.

**Nova interface `MinutaData`**:
```ts
{
  cedente: { razao_social, cnpj, endereco_completo, ... },
  representantes: Array<{
    nome, nacionalidade, estado_civil, cpf, rg, orgao_emissor,
    endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep
  }>,
  fiadores: Array<{ nome, cpf, qualificacao? }>,  // do visit report
  proposta?: { valor_aprovado, prazo_dias, taxa_sugerida, ... }  // opcional, para o aditivo
}
```

### 3) Migration — categoria fixa para o contrato assinado

Inserir (idempotente) em `documento_categorias`:
- `nome = 'Contrato de cessão assinado'`
- `obrigatorio = false`, `ordem = 999`, `ativo = true`
- `descricao = 'PDF do contrato de fomento mercantil assinado pelas partes'`

A categoria é referenciada por nome no upload da aba Formalização (resolvido por query). Sem mudança de RLS — as políticas existentes em `documentos` já cobrem.

### 4) Página `Formalizacao.tsx` (fila externa)

Mantém — continua sendo a fila para o time financeiro. Trocar o botão "Gerar minuta (PDF)" para também levar o usuário direto à aba (`/cedentes/:id?tab=formalizacao`) como atalho mais rico, mas o gerador inline da fila continua funcionando.

---

## Arquivos

- **Editar**: `src/pages/CedenteDetail.tsx` (nova aba + componente `FormalizacaoTabContent`)
- **Reescrever**: `src/lib/minuta-pdf.ts` (modelo S3 Capital + suporte a representantes/fiadores)
- **Editar (leve)**: `src/pages/Formalizacao.tsx` (passar representantes/fiadores ao gerador; link para aba)
- **Migration nova**: insere a categoria "Contrato de cessão assinado" se ainda não existir.

## Resultado

Toda a etapa de formalização acontece dentro do cedente: gera o PDF preenchido com qualificação completa → exporta → assina externamente → faz upload do assinado → marca como assinado → o stepper libera `ativo`.
