# 0019. Hot reload em desenvolvimento

- Status: aceito
- Data: 2026-11-26

## Contexto
Cada ajuste de tela, jogo ou CSS pedia reiniciar o servidor e recarregar TV e celular à mão. Como as telas são módulos servidos direto
(sem build, ADR 0009 e 0010), não existe um *dev server* pronto: o servidor da Ludoteca é o dev server. O ADR 0004 pede o nativo do Node.

## Decisão
- **`pnpm dev`** sobe o servidor com `LUDOTECA_DEV=1` e `node --watch`. Só nesse modo existem as rotas e o código abaixo;
  em produção (`pnpm start`) elas dão 404 e o HTML não é alterado.
- **Servidor reinicia sozinho** quando muda um arquivo que ele importa (`server/`, `games/*/logic.ts`): é o `--watch` do Node.
- **Navegadores recarregam** (`server/dev.ts`): `fs.watch` recursivo em `public/`, `games/` e `brand/final/`, e *Server-Sent Events* em
  `/__dev/events` (nativo do navegador, `EventSource`). O servidor injeta `/__dev/client.js` nas páginas HTML.
  - Mudou um `.css`: a folha de estilo é **trocada no lugar** (`?t=`), sem recarregar, então o jogo em andamento continua.
  - Mudou qualquer outro arquivo: a página recarrega.
  - O servidor reiniciou: o `EventSource` percebe a queda e recarrega quando a conexão volta, então o código novo do servidor aparece.
  - Vários arquivos salvos juntos viram **uma** mensagem (80 ms), e um recarregamento vale mais que trocas de CSS.
- Ignora arquivos ocultos, pastas que começam com `_` (rascunho), `*.test.*` e `*.md`.
- `pnpm dev` também mostra os jogos em rascunho (`draft`, ADR 0012).

## Alternativas
- **Biblioteca (`chokidar`, `browser-sync`, `vite`)**: dependência e, no caso do Vite, um build que não temos (ADR 0004 e 0009).
- **WebSocket em vez de SSE**: o nosso WebSocket é feito à mão (ADR 0004) e pensado para o jogo; SSE é mais simples e reconecta sozinho.
- **Recarregar sempre**: derrubaria o estado do jogo a cada ajuste de CSS.

## Consequências
- Reiniciar o servidor derruba as salas: a TV reconecta e cria uma nova, e o celular volta à lista de TVs (o token da sala some).
  É o custo de mexer em código do servidor; ajustes de telas, CSS e jogos (no navegador) não passam por isso, só os de `logic.ts` e `server/`.
- Se a TV real abrir a Ludoteca de um servidor em modo dev, ela também recarrega a cada edição. Para testar na TV sem isso, use `pnpm start`.
- O reload é testado (`server/dev.test.ts`: observador real numa pasta temporária, HTTP real e a ligação no app) e foi conferido no navegador
  nos três casos (CSS no lugar, arquivo `.ts` recarrega, reinício do servidor recarrega).
