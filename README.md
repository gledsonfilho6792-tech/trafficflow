# Traffic Flow

Aplicação privada de tracking, atribuição, campanhas Meta, vendas e financeiro.

Stack: Next.js 16.4.6, React 19, TypeScript e Supabase. A interface é em português.

## Desenvolvimento

Use uma cópia local com as dependências disponíveis em disco. Em pastas sincronizadas pelo iCloud, arquivos `dataless` em `node_modules` podem bloquear o compilador.

1. `npm ci`
2. Copie `.env.example` para `.env.local` e configure o ambiente autorizado.
3. `npm run dev`

Nunca publique `.env.local`, credenciais de serviço, tokens Meta ou arquivos de autenticação.

## Validação

```sh
npm run lint
npx tsc --noEmit
npm run build
npm audit
```

O endpoint `/api/health/supabase` verifica a conexão. O script `/traffic-flow.js` é público; as telas do painel e APIs de dados exigem autenticação. O laboratório `/tracking-e2e.html` valida sessões, eventos, token e resolução Meta sem instalar o script na página de vendas.

## Contexto

Consulte `docs/continuity.md` para as decisões confirmadas em 14/11/2026, os ambientes e os limites da validação. O histórico fornecido pelo usuário é contexto; o estado do código e dos serviços deve ser verificado antes de novas mudanças.
