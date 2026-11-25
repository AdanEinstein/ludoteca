# Ludoteca

Plataforma de jogos locais: a TV mostra o jogo, o celular é o controle.
Primeiro público: crianças autistas com interesse em números e letras.

## Problem Statement

Como deixar uma criança autista jogar na TV de casa, com o celular como controle, num ambiente calmo e previsível, sem instalar nada, sem cadastro e sem coletar dados, e permitir que o autor adicione jogos novos sem refazer a infraestrutura?

## Recommended Direction

**Direção B: jogo primeiro, plataforma extraída depois do 2º jogo.**

1. Construir um jogo de números (tema `criancas`) com TV e controle fixos no código.
2. Construir um 2º jogo de gênero diferente (memória ou jogo da velha multiplayer, tema `tabuleiro`).
3. Só então extrair sala, pareamento, transporte e catálogo. Dois jogos distintos forçam a abstração certa sem especular.

Princípio central: **a TV não espelha o celular, ela renderiza o estado**. O celular manda inputs, o servidor aplica o reducer e é a fonte da verdade, a TV desenha. Isso funciona em qualquer navegador, é leve e dá duas views por jogo (TV e controle).

Princípios de design (requisitos, não features): sem timer, sem tela de "perdeu", sem som repentino, erro vira nova tentativa silenciosa, animação lenta e previsível, volume e movimento ajustáveis por um adulto. Tema (números, alfabeto, trens, planetas) trocável sobre a mesma mecânica.

Autoria única: não há SDK público nem contrato estável. Jogo é um módulo do monorepo. Tema é só um campo do jogo (`criancas`, `tabuleiro`, ...) usado para filtrar o catálogo.

### Stack

| Camada | Escolha |
|---|---|
| Repo | Monorepo TypeScript (`pnpm workspaces`): `platform/` + `games/<tema>/<jogo>/` com `logic`, `tv`, `controller` |
| Lógica | Reducer puro `(estado, input) → estado`, testado com Vitest, roda no servidor |
| Front | Vite + Preact, Canvas puro (Phaser só se um jogo de ação exigir) |
| Servidor | Node + `ws`, servindo também os estáticos, um único processo |
| Deploy | VPS pequena ou Fly/Render, HTTPS obrigatório |
| Segurança | Sala por código de 4 letras e QR com validade curta, sem conta, sem dado pessoal, toda mensagem validada (zod), limite de taxa, checagem de origem |

## Key Assumptions to Validate

- [ ] **A TV roda o site.** Teste: página HTML de ~20 linhas na TV real, abrindo uma sala e recebendo um evento via WebSocket. Fazer antes de qualquer jogo.
- [ ] **A criança consegue olhar a TV e tocar no celular.** Teste: protótipo do jogo de números com 2-3 sessões curtas. Plano B: botões grandes espelhados no controle, ou tablet como tela do jogo.
- [ ] **Latência via relay na nuvem é aceitável** (50-150 ms) para números e cartas. Teste: medir round trip celular → servidor → TV.
- [ ] **Haverá jogos suficientes** (5+) para justificar a plataforma. Se ficar em 2, manter duas pastas simples.
- [ ] **Pais/adultos conseguem configurar** som, ritmo e tema sem ajuda. Teste: observar um adulto fazendo isso sem instrução.

## MVP Scope

**Dentro**
- M0: teste de TV (página de 20 linhas).
- M1: jogo 1 (números, `criancas`), single player, celular como controle, pareamento por código/QR.
- M2: jogo 2 (memória ou velha, `tabuleiro`), multiplayer 2 jogadores.
- M3: extração da plataforma (sala, protocolo, catálogo com filtro por tema) a partir do que M1 e M2 têm em comum.
- Painel do adulto mínimo: som, ritmo, tema visual.

**Fora**
- Jogos de ação em tempo real (só depois, como modo calmo).
- Contas, perfis, histórico, analytics.

## Not Doing (and Why)

- SDK / open source / jogos de terceiros: só o autor adiciona jogos, então contrato estável e sandbox são custo sem retorno.
- Plataforma antes do jogo: sem saber se a criança joga, a abstração é chute.
- Streaming/espelhamento de vídeo do celular: a TV renderiza o estado, é mais leve e portátil.
- Appliance local (Raspberry/mini-PC): ops de hardware e difícil de compartilhar. A arquitetura permite voltar a isso depois.
- Unity/Godot/Java: pesados ou sem rodar em qualquer navegador de TV, e quebram o tipo compartilhado.
- Contas, monetização, analytics, voz, várias TVs, jogo online com desconhecidos: fora do MVP e perigosos para público infantil.
- Promessa terapêutica: o produto são "jogos calmos e personalizáveis". Quem valida efeito são pais e terapeutas.

## Open Questions

- Idade aproximada da criança (define nível de leitura, tema e o 1º jogo).
- Qual TV (marca e ano) e como o site abre nela (navegador, Chromecast, notebook por HDMI)?
- Hospedagem na nuvem desde o início ou rodar local na LAN no começo?
- Qual o 2º jogo: memória ou jogo da velha?
