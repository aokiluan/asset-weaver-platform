## Diagnóstico

Erro: `new row violates row-level security policy for table "cedentes"` ao clicar em **Enviar para Crédito** (cadastro → análise).

A política `Editar cedentes` da tabela `public.cedentes` é apenas:

```
USING (can_edit_cedente(auth.uid(), stage, owner_id))
```

Sem `WITH CHECK` explícito, o Postgres reaplica a mesma expressão na linha **nova**. Ou seja:

- `USING` (linha antiga, `stage='cadastro'`) → exige role `cadastro` ✅
- `WITH CHECK` (linha nova, `stage='analise'`) → exige role `credito` ❌

O analista de cadastro não tem `credito`, então qualquer avanço de etapa quebra. O mesmo acontece em todas as transições para frente (analise→comite, comite→formalizacao, formalizacao→ativo) e nas devoluções.

A função `can_edit_cedente` (definida em `db-functions`) decide quem edita por etapa — ela está correta para "quem pode mexer enquanto está nessa etapa", mas não modela "quem pode mover para essa etapa".

## Correção

Adicionar `WITH CHECK` à policy `Editar cedentes` que valide a permissão **com base no stage atual da linha** (não no stage novo), usando subquery na própria tabela:

```sql
ALTER POLICY "Editar cedentes" ON public.cedentes
  USING (public.can_edit_cedente(auth.uid(), stage, owner_id))
  WITH CHECK (
    public.can_edit_cedente(
      auth.uid(),
      (SELECT c.stage FROM public.cedentes c WHERE c.id = cedentes.id),
      (SELECT c.owner_id FROM public.cedentes c WHERE c.id = cedentes.id)
    )
  );
```

Efeito:
- Quem pode editar na etapa **atual** pode salvar a linha mesmo que ela mude de stage / owner.
- A regra de quais transições são válidas continua sendo aplicada no front (`CedenteStageActions.TRANSITIONS` + gates), que já restringe os botões por role/etapa.
- Sem mudança em código React, sem nova função no banco.

## Fora de escopo

- Não mexer em outras policies (`Visibilidade`, `Comercial cria`, `Admin/Gestor removem`).
- Não alterar `can_edit_cedente` nem o fluxo de transições do front.
- Não tocar nas RLS de `documentos`, `cedente_history` etc.

## Validação

Após aplicar a migration, repetir o fluxo: cadastro → **Enviar para Crédito** com usuário que tem role `cadastro`. Deve mover para `analise` sem erro de RLS, e o trigger `log_cedente_stage_change` registra no histórico normalmente.
