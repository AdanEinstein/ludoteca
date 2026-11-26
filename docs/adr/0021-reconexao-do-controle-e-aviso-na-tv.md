# 0021. Reconexão do controle retoma o assento e a TV avisa quando fica sem controle

- Status: aceito
- Data: 2026-11-26

## Contexto
O celular que dorme some sem fechar a conexão; o servidor só percebe no heartbeat (até 40 s). Se ele voltava antes disso, o controle
antigo ainda ocupava o assento e o jogo de 1 jogador (`players.max: 1`) respondia `full`. O celular desistia de vez
(`gaveUp`) e ainda apagava o token. Além disso, com um jogo rodando e nenhum controle, a TV não mostrava como conectar.

## Decisão
- Um token válido é dono do seu assento: ao voltar, a conexão antiga desse assento é derrubada (com o `leave` do jogo) e a nova entra.
- Com jogo rodando e 0 controles, a TV mostra por cima do jogo o nome da TV e o QR. O estado do jogo não é perdido.

## Alternativas
- Voltar ao menu quando o último controle sai: perderia o jogo da criança a cada soneca do celular (contra o ADR 0017).
- Encurtar o heartbeat: só diminui a janela, não a elimina.

## Consequências
- Quem tem o token pode tomar o assento de outra conexão com o mesmo token; o token é secreto (128 bits), então só o mesmo celular faz isso.
