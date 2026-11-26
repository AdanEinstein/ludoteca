# 0007. Segurança do servidor local

- Status: aceito
- Data: 2026-11-25

## Contexto
O público é infantil e o servidor roda na rede da casa, com a porta aberta a qualquer aparelho da LAN. Não há conta, senha
nem dado pessoal, o que reduz muito o risco, mas ainda há superfície: arquivos servidos, WebSocket, pareamento.

## Decisão
- **Arquivos:** só as pastas `public/`, `games/`, `brand/final/` e `brand/final/web/`, por prefixo. Só extensões conhecidas
  (`.html .ts .css .svg .png .ico .webmanifest`, mais o único arquivo público de `node_modules` (`/vendor/preact.js`, ADR 0009). Os `.ts` saem sem os tipos (ADR 0010)). Bloqueados: `*.test.*`, arquivos ocultos, `\0`, qualquer caminho que saia da
  pasta depois de resolvido. Somente `GET` e `HEAD`.
- **Cabeçalhos:** `Content-Security-Policy` com tudo `'self'` e sem inline, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` e `frame-ancestors 'none'`.
- **WebSocket:** só em `/ws`. Se houver `Origin`, precisa ser o mesmo host (barra páginas de terceiros abrindo conexão).
  Mensagem máxima de 1 KB, cliente sem máscara é recusado, UTF-8 inválido e binário também.
  Ping a cada 20 s derruba conexões mortas.
- **Pareamento:** ver ADR 0002 (aceite na TV, limite de 3 pendentes e 8 controles, token de 128 bits, nunca enviado a quem não foi aceito).
- **Entrada:** só `action` de quem foi aceito, com `type` na lista e `value` inteiro. Mais de 30 mensagens por segundo fecham a conexão (1008).
- `x-forwarded-for` só é confiado com `TRUST_PROXY=1`, para não deixar um cliente forjar a rede.
- **Dados:** nenhum dado pessoal, cookie ou conta. O token fica no `localStorage` do celular, por sala.

## Fora do escopo (por enquanto)
- **HTTPS/WSS:** a LAN usa HTTP. Necessário se o servidor for para a nuvem. Fica para um ADR próprio.
- **Rate limit por IP** (hoje é por conexão) e **registro de acessos**.
- **Sala com identidade fixa da TV:** hoje a sala morre quando a TV reconecta.

## Consequências
- Quem está na LAN e chega à porta pode abrir `/pad` e pedir entrada, mas só joga se a TV aceitar.
- Os testes de caminho e de protocolo vivem em `server/__test__/e2e.test.ts` e `server/__test__/ws.test.ts`.
