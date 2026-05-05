## Objetivo
Reduzir o espaçamento vertical das linhas das tabelas para um visual mais compacto e minimalista (como na figura 2), aplicando a mudança de forma global para que todas as telas com tabelas se beneficiem.

## Diagnóstico
O componente base `src/components/ui/table.tsx` define hoje:
- `TableHead` → `h-11` (44px) + `px-4`
- `TableCell` → `p-4` (16px em todos os lados)

Isso gera linhas com ~56-60px de altura — exatamente o "respiro" excessivo visto em `/configuracoes/pipeline`. A figura 2 (Fechamento de mês) usa linhas mais densas, com padding vertical menor e fonte/altura coerentes.

Como praticamente todas as telas administrativas usam o mesmo `<Table>` (Pipeline, Alçadas, Usuários, Equipes, Categorias, Datasets, Relatórios, Dashboard Widgets, etc.), basta ajustar o componente base — nenhum arquivo de tela precisa ser tocado.

## Mudanças

### 1. `src/components/ui/table.tsx` (único arquivo)
- `TableHead`: `h-11` → `h-9`, manter `px-4`, manter tipografia atual (uppercase 11px).
- `TableCell`: `p-4` → `px-4 py-2.5` (reduz vertical de 16px para 10px, mantém horizontal).
- `TableRow`: manter borda inferior e hover atuais.

Resultado esperado: linhas ~36-40px de altura, alinhadas ao padrão da figura 2, sem alterar fontes nem cores.

### 2. Verificações pós-mudança (sem código novo)
Conferir visualmente que continuam OK:
- `AdminPipeline` (tela atual do usuário)
- `AdminAlcadas`, `AdminUsuarios`, `AdminEquipes`
- Qualquer listagem que use ações com ícones (`Button size="icon"`) — a altura do botão (h-10) pode ficar maior que a linha; se necessário, trocar para `size="sm"` apenas onde causar desalinhamento. Avaliarei caso a caso ao implementar; espera-se que `size="icon" variant="ghost"` (40px) fique aceitável dentro da linha de ~40px, mas se ficar apertado, usarei `h-8 w-8` nos botões de ação.

## Fora do escopo
- Mudanças de tipografia, cores ou layout das páginas.
- Reescrita de tabelas customizadas que não usem o componente `ui/table` (não identificadas neste fluxo).
