# 0001. A TV renderiza o estado; o servidor é a fonte da verdade

- Status: aceito
- Data: 2026-11-25

## Contexto
A ideia é a TV mostrar o jogo e o celular ser o controle. O navegador da TV é restrito e o celular não pode "espelhar" a tela
com qualidade e latência aceitáveis. O público inicial são crianças autistas, que se beneficiam de comportamento previsível.

## Decisão
- O celular **só envia entradas** (toques, escolhas). Nunca desenha o jogo.
- O **servidor aplica a lógica** (um reducer puro `(estado, ação) → estado`) e envia o estado novo.
- A **TV só renderiza** o estado recebido. O celular renderiza só os controles que o estado pede.
- Cada jogo é um módulo com lógica pura (sem I/O), uma view da TV e uma view do controle.

## Alternativas
- Espelhar vídeo do celular na TV: pesado, depende de Cast ou AirPlay e não serve para a Samsung do usuário.
- Lógica no cliente da TV: dessincroniza com os celulares e dificulta testar.

## Consequências
- A lógica dos jogos é testável sem navegador, com `node:test`.
- Funciona em qualquer navegador de TV que tenha WebSocket e JS moderno (verificado na Samsung 2024, ver ADR 0005).
- O servidor precisa estar de pé durante o jogo, mesmo com todos na mesma sala.
