## Objetivo

Você relatou que, mesmo sendo `admin`, não conseguiu mover um cedente de **Crédito → Comitê**. A investigação confirmou que a permissão de papel está correta, mas você foi bloqueado pelos **gates** da etapa (parecer de crédito não concluído). Para evitar essa confusão no futuro, vamos:

1. **Manter o comportamento atual** dos gates (admin não faz bypass — decisão sua).
2. Criar uma **matriz de permissões por papel × etapa** dentro de Configurações, para você auditar de forma clara quem pode fazer o quê e por que um botão pode ficar desabilitado.

Nenhuma regra de RLS, gate ou papel será alterada — é uma página de leitura/diagnóstico.

---

## O que será construído

### Nova aba em Configurações: "Permissões"

Rota: `/configuracoes/permissoes` (adicionar tab em `src/pages/Configuracoes.tsx`).

A página terá **três blocos**:

**Bloco 1 — Matriz Papel × Etapa (quem ENVIA para a próxima etapa)**

Tabela compacta cruzando `AppRole` (linhas) × `CedenteStage` (colunas), montada a partir de `STAGE_PERMISSIONS` em `src/lib/cedente-stages.ts`. Célula marcada quando o papel tem permissão para avançar a partir daquela etapa. Linha extra para "Owner do cedente" (caso especial da etapa "Novo").

```text
              Novo  Cadastro  Análise  Comitê  Formalização
admin          ✓       ✓        ✓       ✓         ✓
comercial      ✓       —        —       —         —
cadastro       —       ✓        —       —         —
credito        —       —        ✓       ✓         —
comite         —       —        —       ✓         —
formalizacao   —       —        —       —         ✓
gestor_geral   ✓       ✓        ✓       ✓         ✓
Owner          ✓ (*)   —        —       —         —
```

(*) Apenas quando ainda em "Novo".

**Bloco 2 — Gates por etapa (o que precisa estar pronto para avançar)**

Lista textual derivada de `evaluateGates`:

- **Novo → Cadastro**: documentos obrigatórios anexados; relatório comercial preenchido.
- **Cadastro → Análise**: zero documentos rejeitados; todos os obrigatórios validados.
- **Análise → Comitê**: parecer de crédito concluído (completude=8 + recomendação preenchida).
- **Comitê → Formalização**: decisão do comitê registrada.
- **Formalização → Ativo**: minuta gerada e assinada.

Aviso destacado no topo do bloco: **"Gates valem para todos, inclusive admin e gestor_geral. Se um botão estiver desabilitado, verifique as pendências no tooltip do próprio botão."**

**Bloco 3 — Usuários por papel (snapshot)**

Para cada papel (`admin`, `comercial`, `cadastro`, `credito`, `comite`, `formalizacao`, `financeiro`, `gestor_geral`), listar os usuários ativos com aquele papel. Útil para responder rápido perguntas como "quem pode votar no comitê hoje?". Dados via `admin_list_users` (já existe) — agrupar no front.

---

## Detalhes técnicos

- **Nenhuma migração de banco.** Sem alteração de RLS, funções ou tabelas.
- **Nenhuma mudança em** `cedente-stages.ts`, `CedenteStageActions.tsx` ou `useAuth.tsx`.
- Nova página: `src/pages/admin/AdminPermissoes.tsx` — só leitura.
- Adicionar entrada em `src/pages/Configuracoes.tsx` (`PageTabs`) e rota correspondente em `src/App.tsx` protegida por `RoleGuard role="admin"`.
- Visual: padrão Nibo ultracompacto (cards `p-2.5`, label `text-[10px]`, valor `text-[12px]`, `space-y-2`).

---

## Fora de escopo

- Bypass de gates para admin (você optou por manter como está).
- Adicionar papel `comite` automaticamente ao admin.
- Alterar a tela `Configurações > Usuários` (atribuição já está adequada).
- Mudanças nas RLS do banco.

---

## Validação após implementação

- Acessar `/configuracoes/permissoes` como admin → ver matriz, gates e snapshot.
- Tentar como não-admin → redirecionado pelo `RoleGuard`.
- Conferir que a matriz reflete fielmente `STAGE_PERMISSIONS` (testar adicionando um console.log temporário se necessário).
- `bun run build` limpo.