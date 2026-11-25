## Regras do projeto

- **TypeScript executado direto pelo Node 24**, sem build (ADR 0010): só sintaxe apagável (sem `enum`/`namespace`), imports com `.ts`,
  `import type` para tipos. `pnpm typecheck` roda `tsc` nos projetos de servidor e de navegador.
- **Node nativo primeiro** (ADR 0004): `node:http`, `node:crypto`, `node:test`, WebSocket próprio em `server/ws.ts`.
  Dependência de terceiros só se for indispensável, e com ADR. Hoje: `qrcode` e `htm` (Preact embutido, ADR 0009).
- **Telas em Preact com htm**, sem JSX e sem bundler (ADR 0009). Astryx e StyleX foram removidos (ADR 0011).
- **Código em inglês, interface e documentação em português** (ADR 0008): identificadores, arquivos, protocolo, testes e comentários
  em inglês; textos das telas, ADRs, guias e commits em português.
- **Um ADR por decisão** em `docs/adr/`, durante o trabalho. Decisão nova que muda uma antiga cria outro ADR.
- **Jogo = pasta `games/<id>/`** com `logic.ts` puro, `tv.ts`, `pad.ts` e testes (ADR 0006).
- **Verificação:** `pnpm test` e `pnpm typecheck`. Servidor: `pnpm start`.
