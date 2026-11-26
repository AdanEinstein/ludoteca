<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/final/ludoteca-horizontal-reversed.svg">
    <img src="brand/final/ludoteca-horizontal.svg" alt="Ludoteca" width="420">
  </picture>
</p>

<p align="center">
  <strong>Jogos locais: a TV mostra o jogo, o celular é o controle.</strong>
</p>

## O que é

A Ludoteca é uma plataforma de jogos para jogar em casa. A TV exibe o jogo e cada celular vira um controle, sem instalar
nada, sem cadastro e sem coletar dados. O primeiro público são crianças autistas com interesse em números e letras, por isso
os jogos seguem princípios de design calmo e previsível: sem relógio, sem placar, sem tela de "perdeu", movimento lento e
som baixo, só na TV e com opção de desligar ([ADR 0017](docs/adr/0017-design-sensorial-dos-jogos-infantis.md)).

## Como funciona

- O celular **só envia entradas** (toques e escolhas). Quem desenha o jogo é a TV.
- O **servidor aplica a lógica** (um reducer puro `(estado, ação) → estado`) e é a fonte da verdade.
- A **TV só renderiza** o estado recebido, então funciona em qualquer navegador de TV com WebSocket.
- O pareamento é iniciado pelo celular, lendo o QR code exibido na TV ([ADR 0002](docs/adr/0002-pareamento-iniciado-pelo-celular.md)).
- Há também um app Tizen (`tizen/`) que abre a Ludoteca direto na TV Samsung.

## Jogos

| Jogo | Descrição |
|---|---|
| **Quantos tem?** (`games/numbers/`) | Jogo de contagem para crianças, com sons gravados CC0 e confetes gentis. |

Cada jogo é uma pasta em `games/<id>/` com lógica pura, view da TV, view do controle, logo e testes. Passo a passo em
[docs/novo-jogo.md](docs/novo-jogo.md).

## Como rodar

Requer Node LTS 26 e pnpm (versões em `.tool-versions` e `package.json`).

```bash
pnpm install
pnpm start
```

O servidor imprime os endereços na rede local: abra `http://<ip>:3000/` na TV e `/pad` no celular.
`pnpm dev` liga o hot reload e mostra jogos em rascunho. HTTPS opcional (necessário para instalar o controle como app):
[docs/pwa.md](docs/pwa.md).

```bash
pnpm test        # testes com node:test
pnpm typecheck   # tsc nos projetos de servidor e de navegador
```

## Tecnologia

TypeScript executado direto pelo Node, sem build ([ADR 0010](docs/adr/0010-typescript-executado-direto-pelo-node.md)).
Node nativo primeiro (`node:http`, `node:crypto`, WebSocket próprio) e telas em Preact com htm, sem bundler
([ADR 0004](docs/adr/0004-node-nativo-primeiro.md), [ADR 0009](docs/adr/0009-preact-com-htm-sem-etapa-de-build.md)).
As dependências de terceiros são só `qrcode` e `htm`.

## Documentação

- Decisões de arquitetura: [docs/adr/](docs/adr/)
- Identidade visual e uso do logo: [brand/GUIDELINES.md](brand/GUIDELINES.md)
- Como adicionar um jogo: [docs/novo-jogo.md](docs/novo-jogo.md)
