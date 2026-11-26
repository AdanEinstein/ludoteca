# 0020. Testes em `__test__/`, ao lado do alvo

- Status: aceito
- Data: 2026-11-26

## Contexto
Os testes ficavam misturados aos arquivos que testam (`server/rooms.test.ts` ao lado de `rooms.ts`, `games/numbers/logic.test.ts` ao lado de `logic.ts`),
e um teste de `public/sw.ts` morava em `server/`. Pastas com código e testes lado a lado ficam poluídas, e o teste do Service Worker estava longe do alvo.

## Decisão
- Todo teste fica numa pasta **`__test__/` no mesmo nível do alvo testado**, e o nome é `<alvo>.test.ts`:
  - `server/rooms.ts` → `server/__test__/rooms.test.ts` (o mesmo para `ws`, `dev` e o teste de ponta a ponta, `e2e`, do `app.ts`);
  - `games/numbers/logic.ts` → `games/numbers/__test__/logic.test.ts` (e `particles.test.ts`);
  - `public/sw.ts` → `public/__test__/sw.test.ts`;
  - o teste de conformidade, que cobre todos os jogos, em `games/__test__/contract.test.ts`.
- Os testes importam o alvo por caminho relativo (`../rooms.ts`) e podem usar `import.meta.url` para ler arquivos vizinhos (`../sw.ts`).
- **Jogo novo** tem `games/<id>/__test__/logic.test.ts` (o teste de conformidade exige).
- O servidor **não publica** `__test__/` (nem qualquer `*.test.*`), e o observador do hot reload (ADR 0019) os ignora.
- Ferramentas: `pnpm test` roda `node --test` sobre `server/**`, `games/**` e `public/**` (`*.test.ts`); `tsconfig.server.json` inclui os testes
  (eles usam tipos do Node) e `tsconfig.browser.json` exclui `**/__test__`.

## Alternativas
- **Uma pasta `test/` única na raiz**: separa tudo, mas afasta o teste do alvo e duplica a árvore de pastas.
- **Testes ao lado do arquivo (como estava)**: mais curto, mas mistura código e teste na mesma pasta.

## Consequências
- Mover um alvo de pasta pede mover a pasta `__test__/` junto (ou os imports quebram, o que o `pnpm test` e o `tsc` acusam).
- Um alvo em `public/` pode ter teste Node sem ele ir para o navegador: o servidor bloqueia `__test__/` e o projeto de navegador o exclui.
