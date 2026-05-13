## Problema

Hoje, quando o Cadastro processa a conciliação:

1. Ao **reprovar cada documento**, abre um diálogo "Informe o motivo" → o motivo vai para o **Histórico** como comentário (`📄 Documento reprovado · arquivo.pdf — motivo`).
2. Ao clicar em **"Devolver ao comercial"** (`RevisarCadastroActions`), abre **outro** diálogo pedindo motivo de devolução → vai para `cedentes.observacoes`.

O Cadastro acaba digitando duas vezes a mesma coisa ("documentos X e Y reprovados, faltam Z").

## Diagnóstico

Arquivos envolvidos:
- `src/components/cedentes/ConciliacaoDocumentosSheet.tsx` (linhas 233–276) — reprova doc + insere comentário no `cedente_history`.
- `src/components/cedentes/RevisarCadastroActions.tsx` (linhas 38–54) — diálogo "Devolver ao comercial" + grava em `cedentes.observacoes`.

Os dois caminhos são independentes hoje, sem conexão.

## Solução proposta

**Tornar o diálogo de devolução condicional:** se já existem documentos reprovados (status `reprovado`) para o cedente, a devolução vira **um clique único, sem abrir diálogo de motivo**, porque os motivos já estão no Histórico.

### Comportamento

Em `RevisarCadastroActions.tsx`, antes de abrir o `Dialog` de motivo:

1. Consultar `documentos` do cedente: `count(status = 'reprovado')`.
2. **Se houver ≥1 reprovado:**
   - Mostrar um `AlertDialog` curto de confirmação: "Devolver ao comercial? Os N documento(s) reprovado(s) já estão registrados no Histórico com os motivos." → botões `Cancelar` / `Devolver`.
   - Ao confirmar, executar o update direto, **sem campo de texto**.
   - Em `cedentes.observacoes`, gravar algo como `[Devolvido pela análise]: N documento(s) reprovado(s) — ver Histórico`.
3. **Se não houver reprovados** (ex.: devolução por outro motivo, como relatório de visita inconsistente): manter o diálogo atual com Textarea obrigatório.

### Bônus opcional (recomendado)

Também publicar um único marco no `cedente_history` no momento da devolução (evento `COMENTARIO` com texto curto: "Cadastro devolveu ao comercial · N documento(s) reprovado(s)"), para o comercial ver claramente a transição na timeline. Hoje a devolução só aparece como `mudanca_estagio` (cadastro→novo), sem contexto.

## O que NÃO muda

- Fluxo de reprovação de documento na conciliação permanece igual.
- Diálogo de motivo continua existindo para o caso "sem documentos reprovados".
- Nenhuma alteração de RLS, schema, ou de outras telas.
- Nenhuma mudança em `cedente-stages.ts` ou no stepper.

## Arquivos a editar

- `src/components/cedentes/RevisarCadastroActions.tsx` — adicionar consulta de docs reprovados, branch condicional (AlertDialog vs Dialog atual), update de `observacoes` adaptativo, e (opcional) insert no `cedente_history`.

Nenhuma migration necessária.
