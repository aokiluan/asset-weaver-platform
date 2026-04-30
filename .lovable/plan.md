## Objetivo

Reduzir o ruído visual da tabela "Compacto" e transformar o "drop" textual em uma zona de arraste sutil mas inequívoca, mantendo alta densidade.

## Mudanças propostas

### 1. Tabela mais limpa (menos colunas, menos cores)

Hoje a linha tem: ponto de status • badge SIM/NÃO • chevron • nome • "faltando" • anexados • verificados • drop. É demais.

Nova estrutura por linha (apenas 3 zonas visuais):

```text
●  Contrato Social *                              0 anexos      ⤓ solte aqui
●  Cartão CNPJ *           ▸                      1 · 0 verif.  ⤓ solte aqui
●  Comprovante Endereço                           0 anexos      ⤓ solte aqui
```

Regras:
- **Remover** a coluna "OBRIG." com badges SIM/NÃO. O obrigatório vira apenas um asterisco `*` discreto ao lado do nome (igual a campo obrigatório de formulário).
- **Remover** o texto "faltando" em vermelho. O ponto de status já comunica (vermelho = obrigatório vazio, âmbar = anexado/não verificado, verde = ok, cinza = opcional vazio).
- **Unificar** "ANEXADOS" e "VERIFICADOS" em uma única coluna textual à direita: `0 anexos` / `1 · 0 verif.` / `2 · 2 verif. ✓`. Sem pílulas azuis.
- **Remover** os fundos coloridos das linhas (`bg-destructive/5`). Linha fica neutra; só o ponto carrega cor. Hover normal.
- Chevron de expandir só aparece quando há documentos (já é assim, mantém).
- Header da tabela: só `CATEGORIA` e `STATUS` (alinhado à direita). Sem "OBRIG.", "ANEXADOS", "VERIFICADOS" separados.

### 2. Zona de drop minimalista por linha

Substituir o texto "drop" por um alvo de drop sutil ancorado à direita da linha:

Estado padrão (sem arrasto na tela):
```text
… 0 anexos      [ ⤓ ]      ← ícone fantasma, opacity 40%, sem borda
```

Quando o usuário começa a arrastar qualquer documento (drag global ativo):
```text
… 0 anexos      [ ⤓  soltar aqui ]   ← borda tracejada fina, aparece em todas as linhas
```

Quando arrasta POR CIMA da linha:
```text
… 0 anexos      [ ⤓  soltar em Contrato Social ]   ← preenche, ring primary
```

Implementação:
- Detectar drag ativo via estado `draggingIds` (já temos `onCardDragStart`). Setar `isDragging` global no `onDragStart` raiz e limpar no `onDragEnd`.
- O alvo de drop é um `<span>` de ~140px à direita: `border border-dashed border-transparent` no estado normal; `border-border` quando `isDragging`; `border-primary bg-primary/10` quando hover.
- A linha inteira continua aceitando drop (área maior é boa para UX), mas o feedback visual fica concentrado no alvo, não pintando a linha toda.

### 3. Ajustes finos

- Reduzir altura da linha: `py-1.5` em vez de `py-2.5`.
- Tipografia: nome da categoria `text-sm`, contadores `text-xs text-muted-foreground`.
- Manter os filtros (Todos / Pendentes / …) como estão.
- Manter a barra "2/10 categorias obrigatórias preenchidas" no topo.
- Manter o tray de upload + "sem categoria" no topo (já implementado).

## Resultado esperado

Tabela com no máximo 3 elementos visuais por linha (status • categoria • contador+drop), zero badges coloridos repetidos, zero fundos vermelhos. Quando o usuário arrasta, todas as linhas "acendem" discretamente com a borda tracejada — fica óbvio onde soltar sem precisar de texto explicativo permanente.

## Arquivo afetado

- `src/components/cedentes/DocumentosUploadKanban.tsx` — refatorar somente a renderização da tabela compacta (`viewMode === "compacto"`) e adicionar estado `isDragging` global. Sem mudança de schema, sem mudança em outras views.
