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

## Começar em um minuto

Você precisa do [Node 26](https://nodejs.org) (ou mais novo) no computador que vai ficar ligado durante o jogo. Funciona igual no
Windows (PowerShell), macOS e Linux. Depois, **um comando só**:

```bash
npx github:AdanEinstein/ludoteca
```

Na primeira vez o `npx` pergunta se pode baixar o programa (responda `y`). Não precisa clonar o repositório nem instalar nada.
O que acontece:

1. O computador **abre o navegador na tela da TV** da Ludoteca, com um QR code.
2. O terminal mostra outro QR code e o endereço do **controle**. Leia com a câmera do celular (ele precisa estar no mesmo Wi-Fi).
3. O celular lista a TV, a criança escolhe o jogo e joga. Para parar, `Ctrl+C` no terminal.

> No Windows, na primeira vez o firewall pergunta se o Node pode usar a rede. Permita em **redes privadas**, senão o celular não alcança o computador.

Opções do comando:

| Opção | Efeito |
|---|---|
| `--port 8080` (ou `-p`) | Muda a porta (padrão 3000). |
| `--no-open` | Não abre o navegador (útil se a TV é outra tela, veja abaixo). |
| `--help` | Mostra a ajuda. |

## Usar numa TV de verdade

A tela da TV é só uma página web, então qualquer TV com navegador serve. Três caminhos, do mais simples ao mais bonito:

1. **Espelhar o computador na TV.** Deixe a página aberta no computador e mande a tela para a TV: cabo HDMI, ou "Transmitir" do Chrome para um
   Chromecast/Google TV, ou o Smart View em TVs Samsung. Não exige configurar nada na TV.
2. **Abrir o endereço no navegador da TV.** Rode com `--no-open` e digite na TV o endereço que o terminal mostra
   (`http://192.168.1.10:3000/`). Dicas para digitar uma vez só: reserve o IP do computador no roteador (para o endereço não mudar) e,
   se quiser um endereço curto, use `--port 80` e a TV só precisa de `192.168.1.10`. Salve nos favoritos da TV.
3. **App na TV Samsung (Tizen).** Abre sozinho em tela cheia, sem digitar nada, mas exige modo desenvolvedor e certificado Samsung
   uma única vez: veja [tizen/README.md](tizen/README.md).

Sem TV, dá para jogar só no computador: a aba que o comando abre faz o papel da TV, e o controle pode ser o celular ou outra aba em `/pad`.

Não achou a TV no celular? Confira se os dois estão no mesmo Wi-Fi (sem "rede de convidados") e se o firewall deixou o Node usar a rede.

## Como funciona

- O celular **só envia entradas** (toques e escolhas). Quem desenha o jogo é a TV.
- O **servidor aplica a lógica** (um reducer puro `(estado, ação) → estado`) e é a fonte da verdade.
- A **TV só renderiza** o estado recebido, então funciona em qualquer navegador de TV com WebSocket.
- O pareamento é iniciado pelo celular, lendo o QR code exibido na TV ([ADR 0002](docs/adr/0002-pareamento-iniciado-pelo-celular.md)).
- Há também um app Tizen (`tizen/`) que abre a Ludoteca direto na TV Samsung.

## Jogos

| Jogo | Descrição |
|---|---|
| **Quantos tem?** (`games/numbers/`) | Contagem para crianças: quantos objetos há na tela? Sons gravados CC0 e confetes gentis. |
| **Qual começa com?** (`games/letters/`) | Alfabeto de A a Z: qual figura começa com a letra mostrada? Cinco palavras por letra. |
| **Vamos contar!** (`games/count/`) | Contagem sem fim, com uma cor para cada número e duas setas no controle (avançar e voltar). |

Cada jogo é uma pasta em `games/<id>/` com lógica pura, view da TV, view do controle, logo e testes. Passo a passo em
[docs/novo-jogo.md](docs/novo-jogo.md).

## Para quem desenvolve

Requer Node 26 e pnpm (versões em `.tool-versions` e `package.json`).

```bash
pnpm install
pnpm start       # servidor (jogos em rascunho ficam escondidos)
pnpm dev         # hot reload e jogos em rascunho (ADR 0019)
pnpm test        # testes com node:test
pnpm typecheck   # tsc nos projetos de servidor e de navegador
```

`pnpm start` só imprime os endereços na rede local. O comando `ludoteca` (acima) faz o mesmo e ainda mostra o QR code e abre o navegador.
HTTPS opcional (necessário para instalar o controle como app): [docs/pwa.md](docs/pwa.md).

## Tecnologia

TypeScript executado direto pelo Node, sem build ([ADR 0010](docs/adr/0010-typescript-executado-direto-pelo-node.md)).
Node nativo primeiro (`node:http`, `node:crypto`, WebSocket próprio) e telas em Preact com htm, sem bundler
([ADR 0004](docs/adr/0004-node-nativo-primeiro.md), [ADR 0009](docs/adr/0009-preact-com-htm-sem-etapa-de-build.md)).
As dependências de terceiros são só `qrcode` e `htm`.

## Documentação

- Decisões de arquitetura: [docs/adr/](docs/adr/)
- Identidade visual e uso do logo: [brand/GUIDELINES.md](brand/GUIDELINES.md)
- Como adicionar um jogo: [docs/novo-jogo.md](docs/novo-jogo.md)
