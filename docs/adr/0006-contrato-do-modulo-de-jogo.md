# 0006. Contrato do módulo de jogo

- Status: aceito (nomes atualizados pelos ADRs 0008, 0009 e 0010)
- Data: 2026-11-25

## Contexto
Só o autor adiciona jogos (sem SDK público). Ainda assim, cada jogo precisa de um formato único para a plataforma tratar
sala, pareamento e transporte sem saber nada do jogo (ADR 0001). O plano era extrair a plataforma só depois do 2º jogo,
para não adivinhar a abstração. O jogo 1 (`numbers`, "Quantos tem?") já mostra o formato mínimo.

## Decisão
Um jogo é uma pasta `games/<id>/`, com `<id>` em inglês, contendo:

- `logic.ts` (roda no **servidor**, sem I/O):
  - `meta = { id, name, theme, players: { min, max } }`. `theme` filtra o catálogo (`kids`, `board`...). `name` é o texto exibido, em português.
  - `create({ rng, ...config }) -> State`: estado **serializável em JSON e público** (a TV e os celulares veem tudo).
  - `reduce(state, action, { rng }) -> State`: **sem mutar**. Ação inválida ou fora de hora devolve o **mesmo objeto**;
    é assim que a plataforma sabe que nada mudou e evita difundir.
  - `rng(n)` é injetado (inteiro em `[0, n)`), para os testes serem determinísticos. Sem laços que dependam do `rng` terminar.
- `tv.ts` (navegador da TV): exporta o componente Preact `TvView({ state })`.
- `pad.ts` (celular): exporta o componente Preact `PadView({ state, send })`, onde `send(action)` envia `{ type, value? }`.
- `logic.test.ts`: testes com `node:test`.

A plataforma só admite ações cujo `type` está na lista de `server/rooms.ts` e cujo `value`, se houver, é inteiro.
O jogo ainda valida o conteúdo. Jogo novo = nova pasta + uma linha em `games/index.ts` + o `type` novo na lista.

## Alternativas
- Plugins carregados dinamicamente a partir de pastas: sem terceiros, não há por que pagar a complexidade.
- Estado privado por jogador (cartas na mão): ainda não há jogo que precise. Entra com o primeiro (jogos de cartas), e o contrato muda por ADR.

## Consequências
- A lista de ações aceitas vive na plataforma, então um jogo novo mexe em dois lugares. É de propósito: o limite de entrada fica visível.
- Um estado público simplifica, mas não serve a jogos com informação escondida.
- Ainda há um único jogo: o contrato será revisto ao criar o 2º (memória ou jogo da velha), conforme o plano do one-pager.
