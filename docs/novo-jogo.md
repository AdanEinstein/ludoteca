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
5. `logo.svg` (quadrado, com `<title>`, sem scripts nem referências externas; ADR 0016) com a paleta do jogo. Fluxo: 3 conceitos, teste em 64/32/16 px, escolha o que continua legível pequeno.
6. Jogos para crianças autistas seguem o [ADR 0017](adr/0017-design-sensorial-dos-jogos-infantis.md): sem relógio, placar ou erro; errar é neutro; movimento lento; som só na TV, gerado, baixo e com opção de desligar.
7. `logic.test.ts` com as regras do jogo. O contrato geral é conferido sozinho por `games/contract.test.ts`.
8. Registre em `games/index.ts` (e o tema, se for novo). Enquanto estiver em obras, use `draft: true` e rode `pnpm dev`.
9. Áudio: só de biblioteca pública CC0, em `sounds/` com `CREDITS.md` (fonte, licença, cada arquivo); poucos arquivos curtos e tons gerados como reserva ([ADR 0018](adr/0018-sons-de-biblioteca-publica-e-confetes-gentis.md)).
10. `pnpm test` e `pnpm typecheck`.
