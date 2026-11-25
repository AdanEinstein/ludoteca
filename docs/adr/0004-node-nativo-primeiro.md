# 0004. Node nativo primeiro, dependências só quando indispensáveis

- Status: aceito
- Data: 2026-11-25

## Contexto
O autor quer um projeto pequeno, seguro e fácil de manter, preferindo o que o Node já traz (v24) a pacotes de terceiros.
Menos dependências significam menos superfície de ataque, menos atualizações e menos código que não entendemos.
O público é infantil, então a segurança pesa mais.

## Decisão
- Usar `node:http`, `node:crypto`, `node:test`, `node:assert`, `node:fs` e o `WebSocket` cliente global do Node (nos testes).
- **Servidor WebSocket próprio**, em `server/ws.js` (subconjunto do RFC 6455: handshake, quadros de texto, ping/pong, fechamento,
  tamanho máximo, exigência de máscara do cliente). Substitui o pacote `ws`.
- Testes com `node --test`, sem framework de teste.
- Uma dependência de terceiros só entra se for **indispensável** e se o código próprio for arriscado ou caro. Todo caso vira um ADR.

## Exceções aceitas
- **`qrcode`** (QR do atalho de pareamento): um codificador de QR próprio exige Reed-Solomon e máscaras, e não temos
  um leitor de QR aqui para validá-lo. Manter o pacote é mais seguro do que um QR incorreto.

## Situação das dependências existentes
- `ws`: **removido**; `server/ws.ts` o substituiu.
- `@astryxdesign/*` e `@stylexjs/stylex`: instalados antes desta decisão e **removidos** (ADR 0011).

## Consequências
- Mais código nosso para manter (WebSocket), compensado por testes.
- Sem `ws`, perdemos extensões e casos raros (compressão, fragmentação complexa). Rejeitamos o que não suportamos, e não o ignoramos.
