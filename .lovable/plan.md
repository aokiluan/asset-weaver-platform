## Unificar Documentos, Atas e Pareceres em uma única tela

Remover as abas (Documentos / Renovações / Atas / Pareceres) na página `/diretorio/:id` e consolidar tudo em **uma única lista de arquivos** estilo "pasta de arquivos", com uma coluna **Tipo** para classificar a origem.

---

### Como fica a tela

Cabeçalho do cedente (igual hoje) + barra com totais por tipo (chips clicáveis que funcionam como filtro rápido) + a tabela/grid unificada já existente.

```text
[ABC Manutenção]                                [+ Adicionar anexo livre]
[Documento 9] [Renovação 0] [Ata 1] [Parecer 4]       (chips = filtro)
─────────────────────────────────────────────────────────────────────
[Buscar...] [Ordenar] [Filtrar] [Colunas] [Lista|Grid] [Agrupar por ▾]
─────────────────────────────────────────────────────────────────────
☐ Arquivo                        Tipo       Categoria    Data    Por
☐ 2026.05.12_contrato_abc_v01    Documento  Contrato     12/05   João
☐ 2026.05.10_ata-comite-#42      Ata        —            10/05   Sistema
☐ 2026.05.08_parecer-credito_v3  Parecer    Crédito      08/05   Maria
```

### Coluna "Tipo" (nova)

Badge colorido com 4 valores fixos:

- **Documento** — uploads de cadastro + anexos livres (origem: tabela `documentos`)
- **Renovação** — eventos `cadastro_revisado` (origem: `cedente_history`)
- **Ata** — PDFs de comitê (origem: `committee_minutes`)
- **Parecer** — pareceres de crédito + visitas comerciais (origem: `credit_report_versions` + `cedente_visit_report_versions`)

### Modelo de dados unificado (no front)

Cria-se um array `arquivos[]` no `DiretorioDetail.tsx` mesclando os 4 fetches já existentes hoje, normalizado para um shape único:

```ts
type ArquivoUnificado = {
  id: string;
  tipo: 'documento' | 'renovacao' | 'ata' | 'parecer';
  nome: string;          // padrão aaaa.mm.dd_..._vNN
  categoria?: string;    // só faz sentido para 'documento'
  data: string;          // created_at / realizado_em / data do evento
  autor?: string;
  tamanho?: number;
  storagePath?: string;  // null para itens sem blob (renovações)
  origem: 'cadastro' | 'anexo-livre' | 'comite' | 'credito' | 'visita';
  status?: string;       // aprovado/pendente para documentos
};
```

A tabela existente passa a iterar sobre `arquivos[]` em vez de `documentos[]`.

### Filtros/ordenação/colunas

- **Filtro de Tipo** entra no Popover de filtros (multi-select) e os chips do topo são atalhos.
- **Coluna Tipo** vira opção no menu "Colunas" (default visível).
- **Ordenação** ganha preset "Tipo (A→Z)".
- **Agrupar por** ganha opção "Tipo" além de "Categoria" (e "Sem grupos").

### Ações por linha

- **Documento / Ata / Parecer**: preview no Sheet, baixar, copiar link (já existem).
- **Renovação**: sem blob — clique abre Sheet mostrando o evento (data, quem revisou, motivo) com link "Ver no histórico do cedente".
- Anexo livre continua sendo o único deletável/renomeável pelo dono.

### Botões do topo

- Mantém **Adicionar anexo livre** (gera item tipo=Documento, origem=anexo-livre).
- O botão respeita a regra atual: anexo livre vai para a categoria "Outros/Anexos".

---

### Arquivos editados

- `src/pages/DiretorioDetail.tsx` — remove `<Tabs>`, mescla os 4 fetches em `arquivos[]`, adiciona chips de totais no header, passa coluna `tipo` para a tabela/grid.

### Arquivos não tocados

- Componentes de tabela/grid/preview/toolbar continuam genéricos (já funcionam por shape de "arquivo"), só ganham suporte à coluna `tipo` e ao agrupamento por tipo.
- Sem migration, sem mudança de schema, sem mudança em uploads.

### Fora de escopo

- Mover atas/pareceres para o bucket de documentos (continuam vindo das tabelas atuais via signed URL própria).
- Renomear retroativamente atas/pareceres no padrão `aaaa.mm.dd_...` (v2).
