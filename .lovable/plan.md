## Objetivo

1. Ajustar o template `generateBoletimHtml` em `src/lib/boleta-document-templates.ts` para o **Boletim de Subscrição de Debêntures Simples** caber sempre em uma única página A4.
2. Garantir que a informação **"Classe: Sênior"** apareça com destaque claro em "Característica da Emissão" (hoje está pequena, em itálico, no meio de outra linha).

## Mudanças no CSS (1 página A4)

Em `src/lib/boleta-document-templates.ts`, dentro de `generateBoletimHtml`:

- `@page { size: A4; margin: 12mm 15mm; }` (era `20mm 25mm`)
- Remover `padding: 20px` do `body` (margens duplicadas hoje deixam a área útil minúscula)
- `body` 9.5pt (era 11pt)
- `h1` 12pt, `margin: 0 0 6px`
- `td/th` 8.5pt, `padding: 2px 4px`, `vertical-align: middle`
- `p` 8.5pt, `margin: 2px 0`
- `.section-title` `margin: 6px 0 2px`
- `table { margin-bottom: 4px; }`
- `.signature-block { margin-top: 14px; }`
- `.signature-line { margin: 22px auto 2px; width: 240px; }`
- `<hr>` com `margin: 10px 0`
- Parágrafo declaratório a 8pt com `line-height: 1.25`
- `body { page-break-inside: avoid; }`

Texto, dados e estrutura permanecem idênticos — só CSS muda.

## Destacar "Classe Sênior"

Hoje a linha "Característica da Emissão" mistura Classe + Série + Indexador + Vencimento em um único parágrafo, com tudo em itálico de 10pt:

```
Classe: Sênior. Série: 2025-1. Indexador: CDI + 2%. Data Vencimento: 05/05/2026.
```

Vou trocar por um bloco mais claro, com a **Classe Sênior em destaque** logo abaixo do título da seção:

```
Característica da Emissão
Classe: SÊNIOR
Emissão privada, aprovada pela AGE da EMISSORA realizada em 28 de Abril de 2025.
Data da Emissão: 05/05/2025. Valor Total da Emissão: R$ 20.000.000,00 (VINTE MILHÕES DE REAIS), em 11 (ONZE) séries.
Série: <nome>. Indexador: <idx>. Data Vencimento: <data>.
```

Implementação: adicionar um `<p>` dedicado logo após `<p class="section-title">Característica da Emissão</p>`:

```html
<p><strong>Classe:</strong> <strong>SÊNIOR</strong></p>
```

E remover o trecho `Classe: <span class="italic">Sênior.</span>` da linha que hoje agrupa tudo, mantendo apenas Série/Indexador/Vencimento ali.

## Validação

Após aprovação, abrir uma boleta concluída → "Ver" no boletim → confirmar no `PdfPreview` in-app que:
- O documento renderiza em **1 página A4**, mesmo com nome/endereço longo.
- "Classe: SÊNIOR" aparece em negrito, destacado, na seção Característica da Emissão.

Se algum caso extremo ainda quebrar, reduzo a fonte global em mais 0.5pt como fallback.
