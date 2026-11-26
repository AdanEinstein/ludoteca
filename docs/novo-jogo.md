# Como adicionar um jogo

Contrato completo: [ADR 0006](adr/0006-contrato-do-modulo-de-jogo.md) e [ADR 0012](adr/0012-plataforma-consolidada-antes-do-primeiro-jogo.md).
Cada jogo tem identidade própria: a plataforma entrega uma tela em branco e não impõe cores, fonte nem botões.

1. Crie `games/<id>/` (`<id>` em inglês, minúsculas e hífen).
2. `logic.ts` (servidor, sem I/O): exporte `meta`, `create` e `reduce`. Opcionais: `join`, `leave`, `view`.
   - `meta.actions` lista os tipos de ação aceitos; `meta.theme` é uma chave de `themes` em `games/index.ts`.
   - `meta.options` cria o formulário de personalização no celular (valores validados pelo servidor).
   - `meta.styles: ['tv', 'pad']` carrega `tv.css`/`pad.css` só enquanto o jogo roda.
   - Ação inválida devolve o **mesmo objeto**. `reduce` não muta. Use o `rng` injetado.
3. `tv.ts` exporta `TvView({ state, seats })`; `pad.ts` exporta `PadView({ state, send, seat, seats })` (Preact + htm, ADR 0009). Tipos `TvProps` e `PadProps` em `games/types.ts`.
4. CSS: todo seletor começa com `[data-game="<id>"]`; `@keyframes` e `font-family` começam com `<id>-`. Fontes, imagens e sons ficam na pasta.
5. `logo.svg` (quadrado, com `<title>`, sem scripts nem referências externas; ADR 0016) com a paleta do jogo. Fluxo: 3 conceitos, teste em 64/32/16 px, escolha o que continua legível pequeno.
6. Jogos para crianças autistas seguem o [ADR 0017](adr/0017-design-sensorial-dos-jogos-infantis.md): sem relógio, placar ou erro; errar é neutro; movimento lento; som só na TV, gerado, baixo e com opção de desligar.
7. `__test__/logic.test.ts` com as regras do jogo (testes ficam em `__test__/`, ao lado do que testam; ADR 0020). O contrato geral é conferido sozinho por `games/__test__/contract.test.ts`.
8. Registre em `games/index.ts` (e o tema, se for novo). Enquanto estiver em obras, use `draft: true` e rode `pnpm dev`.
9. Áudio: só de biblioteca pública CC0, em `sounds/` com `CREDITS.md` (fonte, licença, cada arquivo); poucos arquivos curtos e tons gerados como reserva ([ADR 0018](adr/0018-sons-de-biblioteca-publica-e-confetes-gentis.md)).
10. `pnpm test` e `pnpm typecheck`.

## Jogo para mais de um controle

Cada celular aceito pela TV ocupa um **assento** (0, 1, 2…); quem reconecta com o mesmo token volta ao mesmo assento ([ADR 0023](adr/0023-jogos-com-varios-controles.md)).

- `meta.players: { min, max }` diz quantos controles o jogo aceita. O menu do celular mostra o motivo e bloqueia o jogo quando a mesa não cabe.
- `create({ players })` recebe os assentos sentados (`[0, 1, 2]`); guarde-os no estado.
- `reduce(state, action, { player })` recebe o assento de quem agiu. **De quem é a vez é regra do jogo**: o servidor não impõe turno,
  então ignore (devolva o mesmo objeto) a ação de quem não pode agir agora.
- `join(state, seat)` e `leave(state, seat)` (opcionais) tratam quem sai ou volta no meio da partida. O assento pode voltar com o mesmo número.
- `view(state, viewer)` (opcional) esconde informação: `viewer` é um assento ou `'tv'`. Cartas na mão, por exemplo.
- `PadView` recebe `seat` (o assento deste celular) e `seats` (todos os conectados); `TvView` recebe `seats`. Use para "você é o jogador 2",
  para destacar de quem é a vez e para mostrar quem saiu. Cor e nome de cada jogador são do jogo (a plataforma não impõe identidade).
- O teste de conformidade (`games/__test__/contract.test.ts`) cria o jogo com `min` e com `max` jogadores e confere cada assento (`reduce`, `view`, `join`, `leave`).
