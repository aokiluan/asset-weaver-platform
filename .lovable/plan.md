# Adicionar logo no header

Adicionar a logo `s3-logo-secundario.png` à esquerda do bloco "S3 Capital Securitizadora S.A. / 60.353.126/0001-71" no header principal, conforme imagem de referência.

## Alteração em `src/components/AppLayout.tsx`

- Importar `logoSecundario from "@/assets/s3-logo-secundario.png"`.
- Inserir `<img src={logoSecundario} className="h-9 w-auto object-contain shrink-0" />` antes do bloco de texto da empresa.
