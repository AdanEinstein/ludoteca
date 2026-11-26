# 0010. TypeScript executado direto pelo Node

- Status: aceito
- Data: 2026-11-25

## Contexto
O autor pediu TypeScript. O Node (LTS, [ADR 0013](0013-node-lts-fixado.md)) executa arquivos `.ts` removendo os tipos na hora (*type stripping*), sem compilar. Isso
combina com o ADR 0004 (nativo primeiro) e com o ADR 0009 (sem etapa de build). O navegador não entende TypeScript.

## Decisão
- **Todo o código é `.ts`**: servidor, jogos, telas e testes. O servidor sobe com `node server/index.ts`.
- **Só sintaxe apagável** (`erasableSyntaxOnly`): sem `enum`, `namespace` nem propriedades de parâmetro no construtor.
  Imports usam a extensão `.ts` e `import type` para tipos (`verbatimModuleSyntax`).
- **Testes** com `node --test` sobre arquivos `*.test.ts`, sem ferramenta extra.
- **Tipos** checados por `pnpm typecheck` (`tsc --noEmit`), com dois projetos: `tsconfig.server.json` (tipos do Node) e
  `tsconfig.browser.json` (tipos do DOM). Evita misturar as duas APIs globais.
- **Navegador:** o servidor entrega os `.ts` das telas e dos jogos **sem os tipos**, por requisição, com
  `module.stripTypeScriptTypes` do Node e cache em memória por data de modificação, como `text/javascript`.
  O strip troca tipos por espaços, então as linhas dos erros no console continuam certas e não há source map.
- Dependências de desenvolvimento, todas com versão fixada: `typescript`, `@types/node` (26.x, igual ao Node em uso) e
  `preact` (só para os tipos do `htm/preact`; em execução o Preact vem embutido no `htm`).

## Alternativas
- Compilar para `dist/` com `tsc`: cria etapa de build e dois conjuntos de arquivos.
- `tsx`, `esbuild` ou `ts-node`: dependência de terceiros para algo que o Node já faz.
- JavaScript com tipos em JSDoc: não foi o que o autor pediu.

## Consequências
- `stripTypeScriptTypes` ainda é experimental no Node 26 (o Node avisa no log). Se mudar de nome ou comportamento, só `server/app.ts` muda.
- Recursos de TypeScript que geram código (enums, `namespace`, decoradores) ficam proibidos.
- O servidor passa a depender de `node:module` para as telas. Os tipos nunca chegam ao navegador.
- A casca do app Tizen (`tizen/index.html`) continua JavaScript simples: roda na TV sem passar pelo servidor.
