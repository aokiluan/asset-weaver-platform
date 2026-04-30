## Diagnóstico

Hoje o fluxo dos representantes legais tem dois problemas reais:

### 1. "Atualizar da Receita" apaga campos preenchidos manualmente

A edge function `sync-representantes` faz um `DELETE` em todos os registros com `fonte = 'receita'` e depois reinsere o que vem da BrasilAPI:

```ts
// supabase/functions/sync-representantes/index.ts
await adminClient
  .from("cedente_representantes")
  .delete()
  .eq("cedente_id", cedente_id)
  .eq("fonte", "receita");
```

Como os representantes vêm originalmente da Receita (`fonte = 'receita'`), qualquer dado complementar que o usuário preenche depois (RG, endereço, estado civil, cônjuge, qualificação, etc.) é apagado quando ele clica em "Atualizar da Receita". Só sobrevivem os criados manualmente.

Além disso, a sincronização automática roda sozinha quando o cedente ainda não foi sincronizado:

```ts
useEffect(() => {
  if (!loading && !jaSincronizado && !autoTried && !syncing) {
    setAutoTried(true);
    sync();   // dispara automaticamente
  }
}, [loading, jaSincronizado]);
```

Ou seja, na prática a busca já acontece uma vez automaticamente — o botão manual existe apenas para reexecutar, e é justamente o que destrói os dados.

### 2. "Salvamento incorreto" do formulário

No `save()` o payload é montado a partir de `...rest` (espalhamento de todos os campos do representante). Isso funciona, mas qualquer campo `undefined` no estado simplesmente não vai no UPDATE — então parece que o form salvou, mas valores antigos persistem. Mais grave: depois do save, se o usuário rodar "Atualizar da Receita", o registro inteiro é deletado e recriado só com nome/cpf/qualificacao/participacao, dando a impressão de que "não salvou".

A causa raiz dos dois sintomas é a mesma: o sync destrói registros existentes.

## Plano

Concordo com a sua proposta: a busca na Receita deve acontecer **uma única vez** (a primeira), e depois os representantes passam a ser editáveis sem risco de serem sobrescritos.

### Mudanças

**1. `src/components/cedentes/CedenteRepresentantesTab.tsx`**
- Remover o botão "Atualizar da Receita" do cabeçalho (e o ícone `RefreshCw` do import).
- Manter o auto-sync inicial que roda quando `!jaSincronizado` — é assim que os dados da Receita entram na primeira vez.
- Remover a função `sync()` manual e o estado `syncing` (a chamada da edge function continua existindo, mas embutida no efeito de auto-sync inicial).
- Ajustar a mensagem do estado vazio para não mencionar mais o botão ("Nenhum representante encontrado. Adicione manualmente.").

**2. `supabase/functions/sync-representantes/index.ts`**
- Trocar a estratégia destrutiva (`DELETE` + `INSERT`) por **upsert idempotente baseado em CPF**:
  - Para cada item do QSA da BrasilAPI, verificar se já existe um representante com o mesmo `cedente_id` + `cpf`.
  - Se existir: **não tocar** no registro (preserva qualquer dado já preenchido pelo usuário).
  - Se não existir: inserir com `fonte = 'receita'` e os campos básicos vindos da Receita.
- Isso torna a função segura mesmo se um dia precisar ser chamada de novo, e elimina o bug de "apagou tudo".
- Continuar atualizando `cedentes.representantes_sincronizado_em` para o stepper saber que já houve sincronização.

**3. Salvamento robusto em `save()`**
- Garantir que campos opcionais não preenchidos sejam enviados como `null` explicitamente (não `undefined`), para que o UPDATE realmente limpe valores que o usuário apagou. Hoje só as datas são tratadas; vou estender para os demais campos textuais opcionais (rg, orgao_emissor, endereço, dados do cônjuge, etc.) usando `?? null`.

### O que NÃO muda
- Estrutura do banco e RLS.
- Auto-sync na primeira visita ao cedente (continua sendo a forma de trazer os dados da Receita inicialmente).
- Autosave de rascunho local (`useFormDraft`) e indicador "Rascunho salvo".
- Layout geral da aba.

### Resultado esperado
- Os representantes vêm automaticamente da Receita na primeira vez que a aba é aberta.
- Não existe mais botão para "reatualizar" — o usuário edita à vontade sem medo de perder dados.
- O "Salvar representante" passa a persistir corretamente todos os campos, inclusive os que foram limpos.
