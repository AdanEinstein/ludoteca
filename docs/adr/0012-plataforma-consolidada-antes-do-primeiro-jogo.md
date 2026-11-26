# 0012. Plataforma consolidada antes do primeiro jogo

- Status: aceito (estende o ADR 0006; o contrato de jogo passa a ser o descrito aqui)
- Data: 2026-11-25

## Contexto
Cada jogo da Ludoteca deve ter **identidade própria**, e o autor quer a plataforma pronta antes de o primeiro jogo real entrar.
O ADR 0006 pretendia rever o contrato só no 2º jogo, mas uma auditoria mostrou cinco lacunas que travariam jogos diferentes
do `numbers`, e que ficariam mais caras de corrigir depois:

1. Não havia menu: o servidor abria o `defaultGame` ao entrar o primeiro controle.
2. A lista de ações aceitas (`choose`, `next`) vivia na plataforma e o `value` só podia ser inteiro.
3. O jogo não sabia quem jogou (`reduce` sem jogador), nem quando alguém entrava ou saía, nem podia esconder informação.
4. A plataforma impunha visual (logo fixo, fundo, fonte e botões globais) e o CSS do jogo entrava solto.
5. Não havia configuração por jogo ("personalizáveis").

## Decisão
**Menu e ciclo de vida.** A sala nasce no menu. O celular escolhe o jogo (`start`) e sai dele (`exit`); a Back do controle remoto
da TV também sai (`exit` da TV). O servidor envia o `catalog` (temas e jogos) e `state: null` significa "menu". Um jogo só
começa se a mesa couber em `players.min..max`; senão o celular recebe `notice` (`too_few`/`too_many`). Com um jogo rodando,
`players.max` limita novas entradas. `start` só vale no menu. Na TV, enquanto ninguém entrou aparece o QR; depois, a lista de jogos.

**Contrato do jogo (v2).** `meta` ganha `actions` (os únicos tipos aceitos, validados pela plataforma), `options`, `styles` e `draft`.
`Action.value` passa a ser JSON qualquer (o jogo valida o conteúdo, o limite de 1 KB do WebSocket continua). Funções:
`create({ rng, players, config })`, `reduce(state, action, { rng, player })`, e opcionais `join`, `leave` e `view(state, viewer)`.
- **Assentos:** cada controle aceito ganha um assento (0, 1, 2…), e o token lembra o assento, então quem reconecta volta ao mesmo lugar.
- **Informação escondida:** o servidor guarda o estado completo e envia a cada espectador o resultado de `view(state, 'tv' | assento)`.
  Sem `view`, todos veem tudo. Isto resolve a pendência de "estado privado por jogador" do ADR 0006.
- **Personalização:** `meta.options` descreve escolhas (rótulo e valores em português). O celular mostra o formulário, lembra a escolha
  por jogo (`localStorage`) e o servidor troca qualquer valor fora das opções pelo padrão antes de chamar `create`.
- **Rascunho:** `draft: true` esconde o jogo do catálogo, salvo com `LUDOTECA_DRAFTS=1` (`pnpm dev`). O `numbers` nasceu como rascunho, bancada de teste do contrato; deixou de ser ([ADR 0016](0016-catalogo-no-controle-e-logo-por-jogo.md)) e é o jogo demonstração.

**Identidade por jogo.** A plataforma só pinta as próprias telas (pareamento, menu, avisos), dentro de `.shell` e `.overlay`.
O jogo roda em `<div class="game-root" data-game="<id>">`, uma tela em branco (`all: initial`), com o CSS da pasta do jogo
(`tv.css`/`pad.css`, declarados em `meta.styles`) carregado só enquanto ele roda e removido ao sair.
- Todo seletor do CSS do jogo começa com `[data-game="<id>"]`; `@keyframes` e `font-family` levam o prefixo `<id>-`; `@import` é proibido.
  O teste de conformidade (`games/__test__/contract.test.ts`) confere isso e o resto do contrato para **todo** jogo registrado.
- O jogo pode ter na pasta fontes, imagens, sons e JSON (`.woff2`, `.png`, `.webp`, `.mp3`, `.ogg`, `.json`...), todos servidos de `'self'`.
  Sem cabeçalhos `Range`: o áudio toca, mas não avança/retrocede.
- A única interface da plataforma sobre o jogo, no celular, é o botão "Menu", que pede dois toques em 3 segundos para sair
  (uma criança tocando ao acaso não encerra o jogo).

## Alternativas
- **Shadow DOM ou `@scope`** para isolar o CSS: não dependem de prefixo, mas o suporte em TVs Samsung antigas é incerto e `@scope`
  é recente. O prefixo com teste automático funciona em qualquer navegador.
- **iframe por jogo**: isolamento total, mas pesa, complica o foco do controle remoto e a comunicação. Não compensa para jogos nossos.
- **Escolher o jogo na TV**: o público (crianças) usa o celular como controle e a TV só mostra, então a escolha fica no celular (e a TV a espelha).
- **Estado privado só na TV ou só no celular**: não cobre cartas na mão. `view` por espectador cobre os dois.

## Consequências
- Um jogo novo é a pasta, uma linha em `games/index.ts` e, se for de um tema novo, o nome do tema. Não mexe mais na plataforma.
- Em tempo real (jogos de ação com relógio) o contrato ainda **não** tem `tick`: entra por ADR quando houver um jogo que precise.
- `reduce` recebe o assento, mas o servidor não impõe "vez de jogar": é regra do jogo (o estado guarda de quem é a vez).
- O botão "Menu" do celular e o aviso de entrada na TV são as duas peças de plataforma que aparecem por cima de um jogo.
- Pendências fora deste ADR: iniciar a Ludoteca na TV pelo app Tizen (ADR 0003, depende do modo desenvolvedor) e um painel de adultos.
