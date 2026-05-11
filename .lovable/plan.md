# Download do contrato assinado real (em vez da minuta)

Hoje, na aba **"Contratos assinados"** da página `/formalizacao`, o botão **Minuta** chama `downloadMinutaPDF`, que regera o template em branco para subir no CRDC. O correto é baixar o **PDF assinado pelas partes** que foi anexado pelo time de formalização dentro do cedente.

## Como o contrato assinado é armazenado hoje

Em `CedenteDetail.tsx` (aba Formalização), o usuário faz upload do PDF assinado:

- Bucket de storage: **`cedente-docs`**, em `<cedente_id>/contratos/<timestamp>_<nome>.pdf`.
- Registrado em `public.documentos` com `categoria_id` da categoria fixa **"Contrato de cessão assinado"** (criada na migration `20260508141338`).
- Vários uploads são possíveis; o mais recente (`order by created_at desc`) é o vigente.

## Mudanças

### `src/pages/Formalizacao.tsx`

1. **Carregar os documentos do contrato assinado** junto com o histórico:
   - Buscar o `id` da categoria `"Contrato de cessão assinado"` (uma vez).
   - Após carregar `historico`, fazer `select` em `documentos` filtrando `cedente_id IN (...)` + `categoria_id = catId`, ordenado por `created_at desc`.
   - Montar `Record<cedente_id, { storage_path, nome_arquivo }>` mantendo apenas o mais recente por cedente.

2. **Substituir a ação de download na linha do histórico:**
   - Trocar o handler `handleGerarPDF(c)` por um novo `handleBaixarContrato(c)` que:
     - Pega `contratosAssinados[c.id]`.
     - Chama `supabase.storage.from("cedente-docs").createSignedUrl(path, 60)`.
     - Dispara o download via `<a download>` com o `nome_arquivo` original.
     - Se não houver documento (caso raro: marcado como assinado sem upload), mostra `toast.info("Contrato assinado não anexado — abra o cadastro para anexar.")` e desabilita o botão.
   - Renomear o rótulo do botão de **"Minuta"** para **"Contrato"** e ícone continua `Download`.
   - O botão fica desabilitado (visual `opacity-50`) quando não há contrato anexado para aquele cedente; tooltip explicando.

3. **Permissão:** download liberado para qualquer usuário que já enxergue a página (`admin`, `formalizacao`, `gestor_geral`) — não mais restrito a `canGenerate`, já que não está gerando PDF, está baixando o documento já existente. RLS de `documentos` + storage continuam regendo o acesso.

4. **Aba "Em formalização" continua igual** — ali o botão **"Gerar minuta (PDF)"** ainda faz sentido (template em branco para subir no CRDC).

### Fora de escopo

- Sem mudanças em banco, RLS, ou no fluxo de upload em `CedenteDetail.tsx`.
- Sem mudanças em `minuta-pdf.ts`.

## Arquivos a editar

- `src/pages/Formalizacao.tsx` — carregar contratos assinados, novo handler de download, ajuste do botão na tabela do histórico.
