# Plano: Matriz de Permissões Editável com Perfis Customizados

## Objetivo
Transformar a tela atual de auditoria de permissões (`/configuracoes/permissoes`) em uma matriz editável persistida no banco, permitindo incluir e gerenciar novos perfis de permissão além dos 8 papéis base existentes.

## Escopo
- Apenas a **matriz Papel × Etapa** da esteira (envio entre estágios).
- Não altera RLS policies, enum `app_role` nem gates de validação.
- Perfis customizados funcionam como "linhas" independentes na matriz; para o resto do sistema se mapeiam a papéis base do enum.

## Etapas

### 1. Banco de dados — tabelas de permissões
Criar tabelas via migration:
- `permission_profiles` (`id`, `nome`, `descricao`, `ativo`, `created_at`, `updated_at`) — perfis que aparecem na matriz.
- `profile_role_bindings` (`profile_id`, `app_role`) — vínculo de cada perfil aos papéis base do enum (um perfil pode ter 1 ou mais papéis).
- `stage_permissions` (`profile_id`, `stage` (cedente_stage), `can_send`, `created_at`, `updated_at`) — células editáveis da matriz.

RLS: apenas `admin` pode editar; autenticados podem ler.

### 2. Seed inicial
Popular `stage_permissions` com os valores atuais de `STAGE_PERMISSIONS` para os papéis base, garantindo paridade.

### 3. Backend — consumo das permissões
- Criar RPC `list_stage_permissions()` retornando a matriz completa.
- Atualizar `CedenteStageStepper.tsx` para consultar `stage_permissions` via RPC em vez de `STAGE_PERMISSIONS` hardcoded.
- Manter fallback local caso a tabela esteja vazia.

### 4. UI — Matriz editável (Bloco 1)
- Substituir a tabela estática por checkboxes interativos.
- Cada checkbox atualiza `stage_permissions` (toggle `can_send`).
- Remover a coluna **"Ativo"** da matriz (só exibir estágios que têm transição de saída: Novo, Cadastro, Análise, Comitê, Formalização).
- Agrupar visualmente: papéis base primeiro, depois perfis customizados.

### 5. UI — CRUD de perfis customizados
- Adicionar seção acima da matriz com:
  - Lista de perfis existentes (nome, descricao, ativo, vínculos de papel).
  - Botão "Novo perfil" abrindo um dialog com:
    - Nome, descrição, ativo/inativo.
    - Multi-select de papéis base do enum (`app_role`) que o perfil representa.
  - Ao criar um perfil, inserir linha default em `stage_permissions` (tudo `false`); admin edita a matriz depois.

### 6. Blocos 2 e 3
- Bloco 2 (Gates): permanece somente leitura.
- Bloco 3 (Usuários por papel): permanece somente leitura.

## Mudanças de arquivos
- Nova migration SQL.
- `src/lib/cedente-stages.ts`: manter `STAGE_PERMISSIONS` como fallback, marcar como `@deprecated`.
- `src/components/cedentes/CedenteStageStepper.tsx`: consultar RPC.
- `src/pages/admin/AdminPermissoes.tsx`: reescrita para matriz editável + CRUD de perfis.

## Segurança
- Tabela `stage_permissions` com RLS — só admin escreve.
- Enum `app_role` **não é alterado**; RLS policies existentes continuam intactas.
- Perfis customizados sem vínculo (`profile_role_bindings`) são apenas auditórios na matriz.