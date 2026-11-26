# 0006. Contrato do módulo de jogo

- Status: aceito (nomes atualizados pelos ADRs 0008, 0009 e 0010; contrato estendido pelo [ADR 0012](0012-plataforma-consolidada-antes-do-primeiro-jogo.md), que o torna a referência)
- Data: 2026-11-25

## Contexto
Só o autor adiciona jogos (sem SDK público). Ainda assim, cada jogo precisa de um formato único para a plataforma tratar
sala, pareamento e transporte sem saber nada do jogo (ADR 0001). O plano era extrair a plataforma só depois do 2º jogo,
para não adivinhar a abstração. O jogo 1 (`numbers`, "Quantos tem?") já mostra o formato mínimo.

## Decisão
Um jogo é uma pasta `games/<id>/`, com `<id>` em inglês, contendo:

- `logic.ts` (roda no **servidor**, sem I/O):
  - `meta = { id, name, theme, players: { min, max }, actions, ... }` (campos completos no ADR 0012). `theme` filtra o catálogo (`kids`, `board`...). `name` é o texto exibido, em português.
  - `create({ rng, players, config }) -> State`: estado **serializável em JSON** (por padrão todos veem tudo; `view` do ADR 0012 pode esconder partes).
  - `reduce(state, action, { rng, player }) -> State`: **sem mutar**. Ação inválida ou fora de hora devolve o **mesmo objeto**;
    é assim que a plataforma sabe que nada mudou e evita difundir.
  - `rng(n)` é injetado (inteiro em `[0, n)`), para os testes serem determinísticos. Sem laços que dependam do `rng` terminar.
- `tv.ts` (navegador da TV): exporta o componente Preact `TvView({ state })`.
- `pad.ts` (celular): exporta o componente Preact `PadView({ state, send })`, onde `send(action)` envia `{ type, value? }`.
- `__test__/logic.test.ts`: testes com `node:test` (pasta `__test__/` ao lado do alvo, [ADR 0020](0020-testes-em-pasta-test-ao-lado-do-alvo.md)).

A plataforma só admite ações cujo `type` está em `meta.actions` do jogo; o jogo valida o conteúdo.
Jogo novo = nova pasta + uma linha em `games/index.ts`.

## Alternativas
- Plugins carregados dinamicamente a partir de pastas: sem terceiros, não há por que pagar a complexidade.
- Estado privado por jogador (cartas na mão): resolvido pelo ADR 0012 (`view`).

## Consequências
- A lista de ações aceitas vive no próprio jogo (`meta.actions`), mas é a plataforma que a aplica, então o limite de entrada continua visível.
- A revisão prevista para o 2º jogo foi antecipada: o ADR 0012 acrescentou menu, assentos, estado por espectador, opções e identidade visual por jogo.
