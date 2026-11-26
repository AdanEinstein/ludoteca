---
name: ludoteca-novo-jogo
description: Adiciona um jogo novo ao catálogo da Ludoteca. Entrevista o autor (tema, jogabilidade, quantos jogadores, regras, público-alvo), chama a skill logo-design para criar o logo.svg do jogo, e cria a pasta games/<id>/ completa (logic.ts, tv.ts, pad.ts, CSS, testes), registrada em games/index.ts, seguindo o padrão da plataforma. Use sempre que o usuário pedir "novo jogo", "adicionar um jogo", "criar um jogo para a Ludoteca", "quero um jogo de <algo>", "jogo da memória/velha/letras/etc. no catálogo", ou descrever a ideia de um jogo para a TV com o celular como controle, mesmo sem dizer "skill" ou "catálogo".
---

# Adicionar um jogo à Ludoteca

Um jogo é a pasta `games/<id>/` e uma linha em `games/index.ts`; a plataforma não muda. O trabalho difícil é **decidir o jogo certo** (por isso a entrevista) e **manter o padrão** (por isso as regras abaixo e o jogo `numbers` como modelo). Responda em português; código, identificadores e comentários em inglês (ADR 0008).

## 1. Entrevistar

Pergunte só o que o usuário ainda não disse, **tudo numa mensagem só** (numerada, curta, com uma sugestão sua em cada item para ele poder responder "pode ser" ou "você decide"):

1. **Tema/assunto**: do que é o jogo (números, letras, trens, memória, tabuleiro...)? Isso define também o tema do catálogo (`kids`, `board` ou um novo).
2. **Jogabilidade**: o que o jogador faz na rodada, e o que a TV e o celular mostram? Como termina (ou não termina)?
3. **Jogadores**: quantos no mínimo e no máximo (`players: { min, max }`)? Se for mais de um: alternam a vez, jogam juntos, ou há informação escondida (cartas na mão)?
4. **Regras**: como se acerta, erra, pontua ou vence? Há opções para o adulto escolher antes (nível, "até quantos", som)?
5. **Público-alvo**: crianças autistas (o primeiro público da Ludoteca), outras crianças, família, adultos? Idade aproximada e se já lê. Isso muda o tom inteiro (ver 3).

Se a ideia já vier detalhada, não repita perguntas: confirme em duas linhas e siga. Se alguma resposta deixar uma regra ambígua, prefira perguntar a inventar: refazer um jogo é caro, uma pergunta não.

## 2. Confirmar o plano antes de codar

Devolva uma ficha curta e espere o "ok":

- `id` (inglês, minúsculas e hífen, também o nome da pasta), nome em português, tema do catálogo (existente ou novo)
- `players`, lista de `actions`, `options` (se houver)
- estado do jogo em uma frase, regra de fim/vitória (ou "sem fim")
- tom (infantil sensorial ou outro) e se terá som
- se algum item exige um ADR novo (ver 6)

## 3. Público decide o tom

- **Crianças autistas ou pequenas**: siga o [ADR 0017](../../../docs/adr/0017-design-sensorial-dos-jogos-infantis.md) à risca: sem relógio, placar, tela de erro ou "game over"; errar é neutro (esmaece, a TV mostra de novo, sem som ou cor de erro, sem vermelho); movimento lento, um elemento por vez, sem piscar, só `opacity`/`transform`/`filter: brightness`; `prefers-reduced-motion` desliga tudo e o jogo continua legível; animação dirigida pelo estado (um contador muda e o CSS reanima), nunca por relógio do cliente; se o jogo tiver som, só na TV, baixo, com a opção "Som na TV" para desligar (sem áudio, não crie a opção nem prometa "ouvir" nos botões), e confete gentil se houver (ADR 0018). Figuras e formas precisam de contraste com o fundo do botão onde aparecem (um desenho creme some num botão creme).
- **Outros públicos** (tabuleiro, adultos): podem ter pontuação, turnos e tom próprio, mas isso é uma decisão nova: registre em ADR (6).
- Cada jogo tem **identidade própria** (paleta, fonte, formas). A plataforma entrega tela em branco; não copie a paleta da Ludoteca nem a do `numbers`.

## 4. Logo: chame a skill `logo-design`

O `logo.svg` é obrigatório (o teste de conformidade reprova sem ele) e aparece nos cartões do catálogo no celular e na TV (ADR 0016). Invoque a skill **logo-design:logo-design** no modo rápido, com o briefing já na mão (nome, tema, público, paleta do jogo; sem precisar reentrevistar). Os scripts ficam em `~/.claude/plugins/cache/logo-design-skill/logo-design/<versão>/skills/logo-design/scripts/` (ache com `ls`; a versão muda):

1. Três conceitos em SVG, primeiro em preto, depois com a paleta do jogo (a folha em preto é uma segunda rodada do mesmo comando).
2. Teste em **64, 32 e 16 px**: `python3 <scripts>/concept_sheet.py a.svg b.svg c.svg --names ... --notes ... -o folha.png` (um SVG por conceito). Fique com o que continua legível pequeno (pontinhos finos viram poeira; formas grandes e poucas cores sobrevivem).
3. `python3 <scripts>/svg_audit.py a.svg b.svg c.svg` sem alertas importantes.
4. **Mostre a folha de conceitos ao usuário e deixe ele escolher** (é o único ponto de gosto pessoal do fluxo; o resto você decide). Se não há ninguém na conversa para escolher (sessão automatizada ou teste), escolha o mais legível a 16 px e diga qual e por quê.

Exigências do arquivo: quadrado (`viewBox="0 0 N N"`), sangria total (a interface arredonda os cantos), `<title>` com o nome do jogo, sem `<script>`, manipuladores (`onclick`), `<image>`, `<a>` nem referência externa, sem texto vivo que dependa de fonte (converta em formas). Rascunhos e PNGs de teste ficam fora do repositório (pasta temporária); só o `logo.svg` final entra em `games/<id>/`.

## 5. Construir a pasta do jogo

Antes de escrever, **leia o `numbers`** (`games/numbers/logic.ts`, `tv.ts`, `pad.ts`, `tv.css`, `__test__/logic.test.ts`) e `games/types.ts`: é o modelo de estilo, e copiar a forma dele é como o padrão se mantém. Convenções que não estão escritas em lugar nenhum: a raiz de cada tela é `<section class="tv">`/`<section class="pad">` dentro de `[data-game]`, com um `.title` (logo + nome); e `key=${state.round}` na raiz faz a tela remontar e reanimar a cada rodada. Mais o passo a passo em `docs/novo-jogo.md` (e a seção "Jogo para mais de um controle", se `players.max > 1`).

Arquivos:

| Arquivo | O que tem |
|---|---|
| `logic.ts` | `meta`, `create`, `reduce` (puro, sem I/O, sem mutar, `rng` injetado; ação inválida ou fora da vez devolve o **mesmo objeto**). Opcionais: `join`, `leave`, `view` |
| `tv.ts` / `pad.ts` | `TvView` / `PadView` em Preact + htm (`import { html } from '/vendor/preact.js'`), sem JSX. Logo por `new URL('./logo.svg', import.meta.url).pathname` |
| `tv.css` / `pad.css` | declarados em `meta.styles`; todo seletor começa com `[data-game="<id>"]`; `@keyframes` e `font-family` começam com `<id>-`; sem `@import` |
| `logo.svg` | da etapa 4 |
| `__test__/logic.test.ts` | as regras do jogo com `node:test` e `rng` determinístico (acerto, erro, ação inválida devolve o mesmo objeto, fim, opções fora da lista, jogadores entrando e saindo se houver) |
| `sounds/` + `CREDITS.md` | só se houver áudio (abaixo) |

Regras de código do projeto (ADRs 0004, 0008, 0009, 0010): TypeScript direto no Node, só sintaxe apagável (sem `enum`/`namespace`), imports com `.ts`, `import type` para tipos; Node nativo e **nenhuma dependência nova**; `meta.name`, rótulos, textos das telas e `aria-label` em português; identificadores e comentários em inglês.

Jogo para mais de um controle: de quem é a vez é **regra do jogo** (o servidor não impõe turno); guarde os assentos em `create({ players })`, ignore a ação de quem não pode agir, esconda informação privada em `view(state, viewer)` e mostre "você é o jogador N" a partir de `seat`/`seats`.

**Áudio**: por padrão, nenhum ou tons gerados (Web Audio, como no `numbers/audio.ts`). Arquivo gravado só se o usuário quiser, só de licença **CC0**, poucos e curtos (pasta até 500 KB), com `CREDITS.md` (URL da fonte, licença, cada arquivo), e sempre com fallback gerado. **Baixar arquivo é ação a confirmar com o usuário**: diga o nome, a fonte e o tamanho antes.

Registro: uma linha em `games/index.ts` (`import * as <id> from './<id>/logic.ts'` e a chave em `games`); se o tema for novo, a chave e o nome em português em `themes`. Durante a obra, `draft: true` em `meta` e `pnpm dev` (hot reload, mostra rascunhos).

## 6. ADR quando houver decisão

O projeto guarda **um ADR por decisão**, durante o trabalho, em `docs/adr/` (próximo número livre, nome `NNNN-assunto-em-minusculas.md`, formato dos existentes: título, Status, Data, Contexto, Decisão, Alternativas, Consequências, em português). Escreva um quando o jogo trouxer algo que o próximo jogo vai precisar saber: tema de catálogo novo, tom ou regras de público diferente do ADR 0017, mecânica de turno ou informação escondida, uso de áudio ou fonte novos. Jogo que só segue os padrões existentes não precisa de ADR, e um ADR nunca repete o que outro já diz (aponte para ele).

## 7. Verificar e entregar

1. `pnpm test` e `pnpm typecheck` verdes. Em worktree novo, rode antes `pnpm install --frozen-lockfile` (sem `node_modules` o teste e2e fica pendurado esperando `/vendor/preact.js`). O `games/__test__/contract.test.ts` confere o contrato, o CSS escopado, o logo e o áudio sozinho; se reprovar, corrija o jogo, não o teste.
2. Rode `PORT=<porta livre> pnpm dev` (não colida com o servidor do autor) e abra duas abas: `/` (TV) e `/pad` (celular). Na TV, aceite o controle; no celular, escolha o jogo no catálogo. Dicas que custaram tempo: o servidor reinicia sozinho (`node --watch`) quando você edita, e a sala se perde, então pareie de novo; e abas em segundo plano congelam as animações, então traga a aba para a frente antes de olhar ou tirar screenshot. Confira legibilidade, o ritmo das animações e `prefers-reduced-motion`. Som e a tela real da TV você **não consegue** validar daqui: diga isso.
3. Tire o `draft: true` só se o usuário quiser o jogo no catálogo agora (pergunte; é o que as crianças verão).
4. Não commite, não empurre, não mexa na TV. Para mandar à TV, o conteúdo vem do servidor (basta relançar o app; veja a skill `ludoteca-tv-deploy`, que começa por `--dry-run`).
5. Feche com um resumo curto: pasta criada, ficha final do jogo, ADRs novos, resultado dos testes, o que ficou sem verificar.
