# Como adicionar um jogo

Contrato completo: [ADR 0006](adr/0006-contrato-do-modulo-de-jogo.md) e [ADR 0012](adr/0012-plataforma-consolidada-antes-do-primeiro-jogo.md).
Cada jogo tem identidade própria: a plataforma entrega uma tela em branco e não impõe cores, fonte nem botões.

1. Crie `games/<id>/` (`<id>` em inglês, minúsculas e hífen).
2. `logic.ts` (servidor, sem I/O): exporte `meta`, `create` e `reduce`. Opcionais: `join`, `leave`, `view`.
   - `meta.actions` lista os tipos de ação aceitos; `meta.theme` é uma chave de `themes` em `games/index.ts`.
   - `meta.options` cria o formulário de personalização no celular (valores validados pelo servidor).
   - `meta.styles: ['tv', 'pad']` carrega `tv.css`/`pad.css` só enquanto o jogo roda.
   - Ação inválida devolve o **mesmo objeto**. `reduce` não muta. Use o `rng` injetado.
3. `tv.ts` exporta `TvView({ state })`; `pad.ts` exporta `PadView({ state, send })` (Preact + htm, ADR 0009).
4. CSS: todo seletor começa com `[data-game="<id>"]`; `@keyframes` e `font-family` começam com `<id>-`. Fontes, imagens e sons ficam na pasta.
5. `logic.test.ts` com as regras do jogo. O contrato geral é conferido sozinho por `games/contract.test.ts`.
6. Registre em `games/index.ts` (e o tema, se for novo). Enquanto estiver em obras, use `draft: true` e rode `pnpm dev`.
7. `pnpm test` e `pnpm typecheck`.
