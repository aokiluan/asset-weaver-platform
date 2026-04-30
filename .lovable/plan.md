## Objetivo

Hoje a aba **Representantes legais** apenas lista o que veio da Receita (nome, CPF mascarado, qualificação, % capital). Quero que cada representante possa ser **expandido e editado** com o mesmo conjunto de campos que usamos no cadastro de sócios (RG, filiação, endereço, estado civil, cônjuge, etc.), além de permitir adicionar representantes manualmente.

A boa notícia: a tabela `cedente_representantes` no banco **já tem todas as colunas** necessárias (sexo, data_nascimento, rg, orgao_emissor, naturalidade, nome_pai/mae, endereço completo, estado_civil e bloco completo de cônjuge). Não precisa de migration.

## O que vai mudar

### 1. `src/components/cedentes/CedenteRepresentantesTab.tsx` (refatorar)

Transformar a tabela atual em uma **lista de cards expansíveis** (Accordion). Cada card mostra no cabeçalho o que já aparece hoje (nome, CPF, qualificação, % capital, badge da fonte) e, ao expandir, exibe o formulário completo do representante.

- Reaproveita o componente `SocioFormCard` (renomeando uso interno para "Representante"), que já tem todos os campos pedidos:
  - Identificação: nome, sexo, data nascimento, CPF, RG, órgão emissor, data expedição, naturalidade, nacionalidade, nome do pai, nome da mãe
  - Endereço completo com auto-preenchimento via CEP
  - Estado civil + bloco de cônjuge (aparece quando casado/união estável)
- Adiciona dois campos extras no topo do card: **Qualificação** (texto livre, ex: "Diretor", "Sócio-administrador") e **% Capital** (numérico).
- Botão **"Salvar"** por card → faz `update` na linha em `cedente_representantes`. Toast de confirmação.
- Botão **"+ Adicionar representante"** no rodapé → cria card vazio em memória; ao salvar, faz `insert` com `fonte = 'manual'`.
- Botão **"Remover"** (já existe no SocioFormCard) → confirmação + delete.
- Botão **"Atualizar da Receita"** continua igual; ao sincronizar, mantém os campos extras já preenchidos manualmente (a edge function `sync-representantes` já faz upsert por CPF/nome, então dados manuais não são apagados — vou validar isso).

### 2. Pequeno ajuste no `SocioFormCard.tsx`

Tornar o título configurável via prop opcional (`title?: string`) para mostrar "Representante N" ao invés de "Sócio N", sem duplicar o componente. Mudança mínima e retrocompatível.

### 3. Persistência

Nada de novo no schema. Os updates usam o cliente Supabase normal — RLS já permite edição para admin, gestor comercial, analista de cadastro e dono do cedente.

## Layout (referência ASCII)

```text
Representantes legais                 [ Atualizar da Receita ]
──────────────────────────────────────────────────────────────
▾ EVERALDO FERNANDO SILVERIO   ***926008**   Diretor   —   [Receita]
   ┌─────────────────────────────────────────────────────────┐
   │ Qualificação [______]   % Capital [___]                 │
   │ Nome [_________________]  Sexo [▾]  Nascimento [__]     │
   │ CPF [____]  RG [____]  Órgão [__]  Data exp. [__]       │
   │ Naturalidade / Nacionalidade / Pai / Mãe                │
   │ Endereço completo (CEP autopreenche)                    │
   │ Estado civil [▾]  → se casado: bloco do cônjuge         │
   │                                       [Remover] [Salvar]│
   └─────────────────────────────────────────────────────────┘
▸ LUAN AOKI HELENA SCHUWARTEN  ***428128**   Diretor   —   [Receita]

[ + Adicionar representante ]
```

## Arquivos afetados

- `src/components/cedentes/CedenteRepresentantesTab.tsx` — refatoração principal
- `src/components/cedentes/SocioFormCard.tsx` — adicionar prop `title?` opcional

Posso seguir com a implementação?
