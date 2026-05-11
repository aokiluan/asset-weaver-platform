## Objetivo

Tirar duplicidade da sheet **Conciliação de documentos**, encaminhando toda a comunicação para a aba **Histórico** (que já é o canal entre os perfis Comercial / Cadastro / Crédito / Comitê / Formalização).

## Mudanças em `src/components/cedentes/ConciliacaoDocumentosSheet.tsx`

### Remover
1. Bloco **"Observações do analista"** (textarea + auto-save em `documentos.observacoes`).
   - Remover estados `obs`, `obsTimer`, função `saveObs`, `useEffect` que carrega `current.observacoes` e o `<Textarea>` correspondente.
   - O import de `Textarea` sai daqui (vai para o novo dialog, abaixo).
2. Bloco **"Dados do cedente para conferência"** (Razão social + CNPJ).
   - Já aparecem no header da sheet — eliminar a `<section>` inteira.

### Substituir comportamento de Devolver / Reprovar
Os dois botões hoje agem direto e usam o campo de observação. Passam a abrir um **Dialog único reutilizável** (componente local na própria sheet) com:
- Título dinâmico: "Devolver para reclassificar" ou "Reprovar documento"
- Descrição curta lembrando que o motivo será publicado no Histórico do cedente
- Campo **Motivo** (Textarea) — **obrigatório** em ambos os casos
- Footer: Cancelar (ghost) + ação primária (destrutiva no caso de Reprovar)

Ao confirmar:
1. Faz o `update` no `documentos` que já é feito hoje (status / categoria_id), **sem** mais escrever em `documentos.observacoes`.
2. Insere uma linha em `cedente_history`:
   - `cedente_id` = cedente atual
   - `user_id` = `auth.uid()`
   - `evento` = `'COMENTARIO'` (única `evento` permitida pela RLS atual de INSERT)
   - `detalhes` = `{ comentario: "<prefixo> · <nome do arquivo>\n\n<motivo>", documento_id, acao: 'devolvido_reclassificar' | 'reprovado' }`
   - Prefixo: "📄 Documento devolvido para reclassificar" ou "📄 Documento reprovado".
3. Chama `onChanged()` para atualizar a fila.

A RLS atual de `cedente_history` exige `evento='COMENTARIO'` para INSERT autenticado, então mantemos esse evento e usamos `detalhes.acao` para diferenciar visualmente no futuro (sem alteração de SQL nesta entrega).

### Atalhos de teclado
- `R` continua disparando o fluxo de reprovar, mas agora abre o dialog (não age direto).
- `V` (verificar) segue inalterado.

### Botão "Baixar arquivo original"
Mantido (segundo a resposta do usuário, não foi marcado para remoção).

## Renderização do comentário automático na timeline

`CedenteHistoryTab` já renderiza `detalhes.comentario` para `evento='COMENTARIO'` — então a mensagem aparece nativamente. Em iteração futura podemos adicionar um chip "Documento" lendo `detalhes.acao`/`detalhes.documento_id`, mas está **fora do escopo** desta entrega.

## Arquivos afetados

- `src/components/cedentes/ConciliacaoDocumentosSheet.tsx` — remoções + novo Dialog interno + novas chamadas a `cedente_history`.

## Fora do escopo
- Mudar RLS de `cedente_history` para aceitar eventos tipados (`DOCUMENTO_REPROVADO` etc.).
- Mostrar link clicável para o documento dentro do item da timeline.
- Migrar histórico antigo de `documentos.observacoes` para a nova timeline.
