# Rotina de Revalidação Cadastral (semestral)

## Objetivo
A cada 6 meses, todo cedente ativo deve ter cadastro, documentos e parecer reavaliados — repetindo a esteira (Comercial → Cadastro → Crédito → Comitê → Formalização) **sem perder o histórico anterior** e sem criar dúvida sobre "qual é o documento/parecer válido".

## Princípio central: ciclos versionados
Cada revalidação é um **Ciclo de Revalidação** (registro próprio), com número sequencial (Ciclo #1, #2…). Documentos, parecer comercial, parecer de crédito, comitê e — se aplicável — nova minuta ficam vinculados ao ciclo. O ciclo anterior **fica congelado e visível como histórico**.

Resultado: o cedente continua "Ativo" durante a revalidação, mas tem um ciclo aberto correndo em paralelo na esteira. Não se mistura com o que já está vigente.

## Gatilho
- Status `vencida` ou `atencao` (lógica que já existe em `cadastro-renovacao.ts`).
- Disparo manual: usuário do **Cadastro** clica em **"Iniciar revalidação"** no cedente.
- Ação cria o ciclo, reabre a esteira do cedente em modo "revalidação" e notifica o owner comercial ("Atualize os documentos do cliente X").

## Fluxo da esteira em modo revalidação
Mesmas etapas atuais, com diferenças mínimas e claras:

```
Ativo  ──[Iniciar revalidação]──▶  Revalidação · Comercial
                                          │  (sobe novos docs + novo parecer comercial)
                                          ▼
                                    Revalidação · Cadastro
                                          │  (concilia docs novos)
                                          ▼
                                    Revalidação · Crédito
                                          │  (novo parecer)
                                          ▼
                                    Revalidação · Comitê
                                          │  (decisão)
                                          ▼
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                  Sem novo contrato                  Novo contrato
                  → fecha ciclo                      → Formalização (nova minuta)
                  → marca revisado                   → fecha ciclo + reset 6 meses
                  → reset 6 meses
```

Em todas as etapas o cedente continua **Ativo** para operação. Um badge "Revalidação em curso · Ciclo #N · etapa X" aparece no header.

## Como evitar conflito com o que já existe
Regra única: **sempre que estiver em ciclo aberto, o sistema mostra apenas os artefatos do ciclo corrente para edição/aprovação. Os anteriores ficam em "Histórico" (somente leitura).**

| Artefato | Comportamento |
|---|---|
| Documentos | Cada documento ganha campo `ciclo_id`. Ao iniciar revalidação, os documentos vigentes são marcados como **"Vigente · Ciclo #N-1"** e ficam read-only. Comercial sobe **novas versões** do mesmo tipo, vinculadas ao novo ciclo. Kanban de documentos exibe um filtro "Ciclo atual / Histórico". |
| Parecer comercial (visit_report) | Nova versão obrigatória no ciclo. Versão anterior fica acessível em "Versões". |
| Parecer de crédito (credit_report) | Mesmo padrão: nova versão por ciclo. |
| Comitê | Nova sessão por ciclo, ata própria. |
| Minuta / contrato | **Não é regerada por padrão.** Só nasce nova minuta se o comitê decidir alterar limite/condições. Caso contrário, contrato vigente permanece. |
| Limite aprovado | Só é atualizado quando o ciclo encerra com nova decisão de comitê. |

## Encerramento do ciclo
Ao final (com ou sem novo contrato), o sistema:
1. Marca o ciclo como `concluido` com `decisao` (mantido / alterado / encerrado).
2. Atualiza `cadastro_revisado_em = now()` no cedente → status volta a `em_dia` por mais 6 meses.
3. Registra entrada no histórico do cedente.

Se o comitê decidir **encerrar relacionamento**, cedente vai para `inativo`.

## Permissões
Mesmas da esteira atual. Apenas duas novas permissões:
- **Iniciar revalidação**: `cadastro`, `admin`, `gestor_geral` (e talvez `comercial` para o owner).
- **Cancelar ciclo em aberto**: `admin`, `gestor_geral` (registra motivo).

## Visibilidade / UX
- KPI **"Renovações pendentes"** já existe no Cedentes. Adicionar coluna no Diretório com badge do ciclo em curso.
- Página dedicada **"Revalidações"** (lista de ciclos: aberto / atrasado / concluído este semestre) para o time de Cadastro pilotar.
- No `CedenteDetail`, nova aba **"Ciclos de revalidação"** lista todos os ciclos com data, decisão e link para os artefatos daquele ciclo.

## O que NÃO muda
- Componente `MarcarRevisadoDialog` continua existindo, mas só é usado para **fechar manualmente** um ciclo que não justifica esteira completa (ex: cliente trouxe doc atualizado por conta própria) — opção avançada, não a principal.
- Cálculo de status (`em_dia / atencao / vencida`) continua igual.
- Esteira normal de **novos** cedentes não muda em nada.

---

## Detalhes técnicos (para implementação futura)

**Nova tabela `cedente_revalidacao_ciclos`**
- `id`, `cedente_id`, `numero` (sequencial por cedente), `iniciado_em`, `iniciado_por`
- `etapa_atual` (mesma enum de stages), `status` (`aberto` / `concluido` / `cancelado`)
- `decisao` (`mantido` / `alterado` / `encerrado` / `null`)
- `concluido_em`, `concluido_por`, `observacoes`

**Coluna `ciclo_id` (nullable)** em: `cedente_documentos`, `cedente_visit_reports`, `credit_reports`, `comite_sessoes`, `cedente_minutas`. `null` = pré-versionamento (legado).

**Função RPC `iniciar_ciclo_revalidacao(_cedente_id)`**: cria ciclo, snapshot de docs vigentes, retorna ciclo_id.

**Função RPC `concluir_ciclo_revalidacao(_ciclo_id, _decisao, _obs)`**: fecha ciclo, atualiza `cadastro_revisado_em`, log no history.

**Gates `evaluateGates`**: quando há ciclo aberto, gates exigem artefatos com `ciclo_id = ciclo_atual`, ignorando os do ciclo anterior.

---

## Próximo passo sugerido
Validar este desenho. Pontos para você decidir antes de eu transformar em prompt de implementação:
1. Cedente fica **Ativo** durante a revalidação (proposto) ou volta para etapa específica e **bloqueia novas operações**?
2. Documentos do ciclo anterior ficam **read-only e visíveis** (proposto) ou são **arquivados/escondidos** por padrão?
3. Página dedicada **"Revalidações"** vale a pena já no MVP, ou começamos só com badge + filtro no Diretório?
4. Quem pode **iniciar** a revalidação: só Cadastro/Admin (proposto), ou Comercial owner também?
