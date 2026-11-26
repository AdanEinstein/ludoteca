# 0023. Jogos com vários controles

- Status: aceito (estende o [ADR 0012](0012-plataforma-consolidada-antes-do-primeiro-jogo.md))
- Data: 2026-11-26

## Contexto
Virão jogos para mais de um celular. O contrato do ADR 0012 já tinha o essencial: assento por controle (o token o preserva),
`players.min/max`, `reduce` com o assento de quem agiu, `join`/`leave` e `view` por assento. Faltava a plataforma e o jogo **enxergarem a mesa**:

1. O `PadView` não sabia qual era o assento do próprio celular, nem quem mais estava conectado. "Você é o jogador 2" exigia truques no `view`.
2. A `TvView` não sabia quem estava conectado, só a plataforma (a TV recebia apenas a contagem).
3. O menu do celular só avisava que a mesa não servia **depois** do toque em Jogar (`notice`), e a mensagem era fácil de perder.
4. O contrato só testava o jogo com `players.min` assentos.

## Decisão
- **Protocolo:** o servidor envia a cada celular `table` `{ seat, seats }` (assento próprio e todos os conectados, em ordem) ao entrar e
  sempre que alguém entra ou sai. A TV recebe `players` `{ count, seats }` (o `count` continua, para compatibilidade).
- **Visões:** `PadView({ state, send, seat, seats })` e `TvView({ state, seats })`, com os tipos `PadProps` e `TvProps` em `games/types.ts`.
  Jogos de um controle só (`numbers`) ignoram as props novas.
- **Menu do celular:** `tableProblem` (`public/table.ts`) compara a mesa com `players.min/max` e o cartão do jogo que não cabe fica
  desabilitado, dizendo o motivo ("Precisa de 2 controles. Conectados: 1."). O servidor continua validando e mandando `notice`
  (a mesa pode mudar entre a tela e o toque). O aviso `notice` ganhou destaque visual.
- **Contrato:** `games/__test__/contract.test.ts` cria cada jogo com `min` e com `max` jogadores e confere `reduce`, `view`, `join` e `leave` por assento.
- **Vez de jogar continua sendo regra do jogo** (ADR 0012): o servidor não impõe turno. Documentado em `docs/novo-jogo.md`.

## Alternativas
- **Jogo ler o assento só pelo `view`** (injetar `you` no estado): funciona, mas cada jogo reimplementa o mesmo truque e a TV continua sem saber quem está.
- **Servidor impor a vez (`turn` no contrato)**: jogos simultâneos (todos respondem ao mesmo tempo) não teriam turno. Fica no jogo.
- **Controles extras viram espectadores** quando passam de `players.max`: decisão de produto adiada. Hoje a mesa precisa caber (`too_many`).

## Consequências
- Mensagens novas no protocolo; testes de ponta a ponta atualizados (o pad recebe `table` depois do `catalog`).
- Um jogo de vários controles é só a pasta e a linha em `games/index.ts`: assentos, vez, mão escondida e presença já têm onde morar.
- Em aberto: nome/cor por assento oferecidos pela plataforma, espectadores e escolher quem joga quando há controles demais.
