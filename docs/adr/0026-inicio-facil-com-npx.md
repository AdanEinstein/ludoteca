# 0026. Início fácil: um comando `npx`, QR no terminal e navegador aberto

- Status: aceito
- Data: 2026-11-26

## Contexto
Para usar a Ludoteca era preciso clonar o repositório, instalar o pnpm, rodar `pnpm install`/`pnpm start` e digitar à mão o endereço
na TV. Quem só quer jogar com as crianças não deveria precisar disso. O autor pediu um comando único (sem publicar em registry),
com QR code no terminal e, no computador, o navegador já aberto para parear o controle.

Medido: o Node 26 **recusa** rodar `.ts` dentro de `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), e é lá que o `npx`
instala um pacote. Sem tratamento, `npx` quebraria no primeiro arquivo (ADR 0010: o projeto roda TypeScript direto, sem build).

Outro achado: o QR da TV usa o `Host` da requisição. Com a página aberta como `localhost`, o celular receberia um link para `localhost`.

## Decisão
- **`npx github:AdanEinstein/ludoteca`**: o repositório é público, então o próprio GitHub serve de "registry" (nada a publicar no npm).
  `package.json` ganha `bin` (`ludoteca`) e `files` (só `bin`, `server`, `games`, `public`, `brand/final`).
- **`bin/ludoteca.js` em JavaScript puro** (o `.js` não passa pela restrição). Se estiver dentro de `node_modules`, copia o app para uma
  pasta temporária (sem `__test__`), liga `node_modules` a ela (junção, que funciona no Windows sem administrador) para achar `qrcode`
  e `htm`, e remove a pasta ao sair. Fora de `node_modules` (clone do repositório) roda no lugar. Exige Node 26+, com mensagem clara.
  Opções: `--port`/`-p`, `--no-open`, `--help`.
- **`server/index.ts`**: com `LUDOTECA_CLI=1` (posto pelo comando) imprime o QR do controle no terminal (`qrcode`, tipo `terminal`) e o
  endereço da TV; com `LUDOTECA_OPEN=1` abre `http://localhost:<porta>/` no navegador do computador (`xdg-open`, `open` ou `start`).
  `pnpm start` e `pnpm dev` continuam como estavam, silenciosos. Os endereços da rede de casa (192.168/10) saem primeiro, antes de Docker e VPN.
- **`lanHost` em `createApp`**: se a TV foi aberta como `localhost`/`127.x`/`::1`, o link do QR usa o IP do computador na rede. O
  celular e a aba local caem na mesma "casa" (ADR 0002), porque `127.x` já conta como rede privada.
- **README** reescrito em torno disso: um comando, o que acontece, três jeitos de usar a TV (espelhar o computador, abrir o endereço no
  navegador da TV, app Tizen) e a área de desenvolvimento separada.

## Alternativas
- **`curl ... | sh` e `irm ... | iex` (PowerShell):** executam um script remoto sem o usuário ler, e ainda assim dependeriam do Node. O `npx`
  já é o mesmo comando nos três sistemas. Descartado.
- **Publicar no registry do npm:** o autor não quer manter isso; o `github:` basta.
- **Mover o código para `.js`:** perderia os tipos e o ADR 0010 só para contornar o `npx`.
- **Executável único (Node SEA) ou instalador:** resolveria o "precisa do Node", mas é binário por sistema para manter. Fica como ideia futura.
- **Abrir o navegador também em `pnpm start`:** incomodaria quem desenvolve (reinício, `--watch`).

## Consequências
- Ainda é preciso ter o **Node 26** instalado; é o degrau que sobra para quem não é desenvolvedor.
- **Verificado:** `npm pack` + `npx` do pacote gerado (de dentro de `node_modules`) sobe o servidor, serve `/`, `/pad` e o Preact, imprime o QR
  e os endereços, entrega o link do QR com o IP da rede mesmo abrindo por `localhost`, e apaga a pasta temporária ao receber SIGTERM.
  O navegador abre no Linux (`xdg-open`) sem erro no terminal.
- **Não verificado:** `npx github:...` de verdade (depende de a branch estar no GitHub), Windows e macOS (os comandos de abrir o navegador
  e a junção de `node_modules` não foram rodados lá) e se o `npx` reaproveita uma cópia antiga em cache.
- O QR no terminal usa blocos Unicode e cores ANSI; terminais muito antigos do Windows podem mostrá-lo distorcido (o endereço sai em texto também).
