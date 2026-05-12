# Reorganização do Diretório no sidebar + Pasta de Investidores

## 1. Sidebar — `src/components/AppSidebar.tsx`

- Remover o item **"Diretório"** do grupo **"Operação"**.
- Criar nova seção **"Diretório"** (label uppercase via CSS, igual às demais), ícone `FolderOpen`, posicionada logo após **"Operação"**.
- Itens da nova seção:
  - **Pasta de Cedentes** → `/diretorio` (ícone `Buildings`)
  - **Pasta de Investidores** → `/diretorio/investidores` (ícone `Wallet` ou `Users`)

## 2. Backend — nova tabela `investidores`

Criar via migração com campos análogos a `cedentes` (escopo enxuto):

- `razao_social` (text, obrigatório)
- `nome_fantasia` (text)
- `cnpj` (text, obrigatório, único)
- `tipo_pessoa` (`pf` | `pj`)
- `email`, `telefone`
- `endereco`, `numero`, `bairro`, `cidade`, `estado`, `cep`
- `valor_investido` (numeric)
- `perfil` (text — ex: conservador / moderado / arrojado)
- `observacoes` (text)
- `status` (text, default `ativo`)
- `owner_id`, `created_by`, `created_at`, `updated_at`

RLS:
- SELECT: admin, gestor_geral, financeiro, comercial e owner.
- INSERT/UPDATE: admin, gestor_geral, financeiro.
- DELETE: admin, gestor_geral.

Trigger de `updated_at` reaproveitando `public.update_updated_at_column()`.

## 3. Frontend — páginas novas

### `src/pages/Investidores.tsx` (rota `/diretorio/investidores`)
Lista funcional espelhando `Diretorio.tsx`:
- `<PageTabs>` com título "Pasta de Investidores".
- Busca por razão social / CNPJ.
- Tabela ultracompacta (Nibo): Investidor, CNPJ, Tipo, Valor investido, Status, Ações (Abrir).
- Loading state, contagem de registros, link para detalhe.

### `src/pages/InvestidorDetail.tsx` (rota `/diretorio/investidores/:id`)
Detalhe simples no padrão view denso (p-2.5, label 10px, valor 12px), com dados cadastrais. Sem documentos/atas nesta primeira versão (escopo será expandido depois conforme necessidade).

### Atualizar `src/pages/Diretorio.tsx`
- Renomear título do `<PageTabs>` para **"Pasta de Cedentes"** (mantendo rota `/diretorio`).

## 4. Roteamento — `src/App.tsx`

Adicionar:
- `/diretorio/investidores` → `Investidores`
- `/diretorio/investidores/:id` → `InvestidorDetail`

## Resumo da estrutura final do sidebar

```
OPERAÇÃO
  - CRM
  - Cedentes
  - Comitê
  - Formalização

DIRETÓRIO        ← nova seção
  - Pasta de Cedentes
  - Pasta de Investidores
```
