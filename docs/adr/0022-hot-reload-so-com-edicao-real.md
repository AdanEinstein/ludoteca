# 0022. Hot reload só recarrega com edição real do arquivo

- Status: aceito
- Data: 2026-11-26
- Refina: [0019](0019-hot-reload-em-desenvolvimento.md)

## Contexto
Com `pnpm dev`, tocar em **Jogar** no celular devolvia o controle ao catálogo. O `fs.watch` do ADR 0019 dispara para qualquer
evento no arquivo, não só para edição: leitura (hora de acesso), mudança de atributos, antivírus, sincronização na nuvem, indexadores.
Ao iniciar um jogo, o navegador abre `games/<id>/*.ts`, `.css` e sons; se o sistema reporta isso como evento, o servidor manda `reload`
às páginas. Recarregar a TV derruba a conexão dela, e a sala morre (consequência já descrita no ADR 0019): o celular perde o token,
volta à lista de TVs e, depois de aceito de novo, mostra o catálogo.

## Decisão
- Ao subir, o reloader guarda a assinatura (hora de modificação + tamanho) de cada arquivo das pastas observadas.
- Um evento só vira `css`/`reload` se a assinatura do arquivo **mudou**, se o arquivo é novo ou se foi apagado.
  Evento sem mudança de conteúdo (toque, leitura, atributos) é ignorado.
- Continua sem dependência: `readdirSync`/`statSync` nativos (ADR 0004).

## Alternativas
- **Filtrar pelo tipo de evento (`change` x `rename`)**: o Node não distingue acesso de modificação; ambos chegam como `change`.
- **Hash do conteúdo**: mais caro e desnecessário; hora de modificação e tamanho bastam para edição humana.
- **Recomendar `pnpm start` na TV**: já recomendado no ADR 0019, mas não protege quem testa o jogo com `pnpm dev`.

## Consequências
- Salvar um arquivo com o mesmo conteúdo, no mesmo milissegundo e com o mesmo tamanho não recarrega. Na prática não acontece ao editar.
- Teste novo em `server/__test__/dev.test.ts`: toque sem edição não envia nada; edição real continua recarregando.
