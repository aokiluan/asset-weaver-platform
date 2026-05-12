## Importação de cedentes via planilha

Adicionar fluxo de importação em massa de cedentes a partir de planilha (.xlsx/.csv), inspirado no Nibo, para acelerar a entrada de grandes volumes.

### Fluxo do usuário (wizard em 4 passos, dentro de um Dialog)

1. **Baixar modelo** — botão "Baixar planilha modelo" gera um `.xlsx` com cabeçalhos padronizados e uma linha de exemplo.
2. **Upload** — drag & drop ou seleção de `.xlsx`/`.csv` (até 5MB). Parse no cliente com `xlsx` (SheetJS).
3. **Mapeamento de colunas** — auto-detecta colunas pelo cabeçalho; permite ao usuário ajustar manualmente cada coluna da planilha → campo do cedente.
4. **Validação e preview** — tabela compacta (estilo Nibo) mostrando todas as linhas com status por linha:
   - ✅ Válida
   - ⚠️ Aviso (ex.: CNPJ duplicado no banco — será ignorada)
   - ❌ Erro (CNPJ inválido, razão social vazia)
   Resumo no topo: `X válidas · Y duplicadas · Z com erro`. Botão "Importar X cedentes" só habilita se houver válidas. Erros podem ser exportados como `.csv` para correção.
5. **Importação** — insere em lotes de 100 via `supabase.from("cedentes").insert()`, barra de progresso, toast final.

### Campos suportados na planilha

Obrigatórios: `razao_social`, `cnpj`
Opcionais: `nome_fantasia`, `email`, `telefone`, `endereco`, `cidade`, `estado`, `setor`, `status`, `limite_aprovado`, `faturamento_medio`, `observacoes`

Validações:
- CNPJ: limpa máscara, valida 14 dígitos + dígito verificador
- Email: regex básico
- `status`: enum válido (default `prospect`)
- Valores numéricos: aceita "R$ 1.234,56" e "1234.56"
- Deduplicação: por CNPJ contra base existente + dentro da própria planilha

### Acesso

Botão **"Importar planilha"** ao lado do "+ Novo cadastro" no header de `/cedentes`. Visível apenas para quem tem `canCreate` (admin, comercial, gestor_geral).

### Detalhes técnicos

- **Nova dependência**: `xlsx` (SheetJS) — parse de .xlsx/.csv e geração do template
- **Novos arquivos**:
  - `src/components/cedentes/CedenteImportDialog.tsx` — wizard completo
  - `src/lib/cedentes-import.ts` — helpers (parse, validação CNPJ, geração template, normalização)
- **Edição**: `src/pages/Cedentes.tsx` — adicionar botão "Importar planilha" e estado para abrir o dialog
- **Backend**: nenhuma migração necessária; tabela `cedentes` já existe e RLS já cobre INSERT do usuário
- **Sem edge function**: parse e validação 100% no cliente; insert direto via Supabase client (mais simples, evita upload de arquivo). Para volumes acima de ~5k linhas reavaliamos.

### Estilo visual

Segue o padrão Nibo ultracompacto já vigente no projeto:
- Dialog grande (`max-w-4xl`), passos com stepper horizontal compacto
- Tabela de preview: linhas `h-7`, fonte `text-[12px]`, ícones `size-3.5`
- Badges de status por linha em cores semânticas (success/warning/destructive)
- Botões `h-7`, ações primárias à direita, "Cancelar" ghost à esquerda

### Out of scope

- Importação assíncrona via background job
- Edição inline de células no preview (apenas remover linhas com erro)
- Suporte a múltiplas abas da planilha (usaremos só a primeira)
