# 0002. Pareamento iniciado pelo celular, com um OK na TV

- Status: aceito
- Data: 2026-11-25

## Contexto
O pareamento precisa ser o mais simples possível. O primeiro desenho tinha a TV mostrando um QR para o celular escanear.
O usuário pediu que o pareamento parta do celular e exija, no máximo, uma confirmação na TV.

## Decisão
- A TV, ao abrir, registra uma **sala** no servidor e ganha um nome curto (Lua, Sol, Estrela...).
- O celular abre `/pad`, vê **as TVs da mesma rede** e toca numa. Com uma única TV, entra direto nela.
- A TV mostra "um controle quer entrar" e aceita com **OK no controle remoto**. É a única confirmação.
- Aceito, o celular recebe um **token** guardado em `localStorage` e reconecta sozinho depois (celular que dormiu).
- Um pedido pendente não consegue enviar entradas. Há limite de 3 pedidos pendentes e 8 controles por sala.
- O QR continua como **atalho de primeira vez**: leva ao mesmo fluxo, via `?room=<id>`, e funciona fora da rede da TV.
- "Mesma rede" é uma heurística: IP privado vira `lan`; senão vale o IP público (IPv6 por /64). Ver `server/net.ts`.

## Atualização (2026-11-25, implementação)
- O servidor nega a entrada com um **motivo**: `room_gone` (a sala não existe mais), `rejected` (a TV disse não) ou `full` (limite).
- O celular guarda a **última sala** em `localStorage`. Ao recarregar ou acordar, tenta voltar nela com o token, sem lista e
  sem novo OK na TV. Se a sala sumiu (`room_gone`), **volta à lista** de TVs em vez de desistir. `rejected` e `full` não repetem
  a tentativa, para uma TV que disse não não ser incomodada de novo.

## Alternativas
- Código digitado no celular: mais passos para quem tem dificuldade motora ou de atenção.
- Aceitar o primeiro celular sem confirmação: qualquer pessoa na rede entraria.
- mDNS: exige pacote de terceiros no Node e não funciona dentro do navegador do celular.

## Consequências
- Falha com VPN, CGNAT ou celular no 4G. O QR cobre esses casos.
- A sala vive enquanto a TV está conectada. Recarregar a TV cria sala nova e os celulares precisam aceitar de novo.
  Uma identidade fixa da TV (com segredo) é a evolução natural, ainda não decidida.
