# 0014. O controle (pad) como PWA, e HTTPS opcional

- Status: aceito
- Data: 2026-11-26

## Contexto
O celular é o controle e é aberto muitas vezes: pelo QR, pelo link, ou pela última TV lembrada. Instalado como app, o controle abre
direto, em tela cheia (sem a barra do navegador), e a tela não apaga no meio do jogo.
Um PWA só é **instalável em origem segura** (HTTPS, ou `localhost`). A rede da casa fala HTTP (`http://192.168.1.10:3000`), então o
Service Worker não registra e o Chrome não oferece a instalação nela. Em HTTP o celular só consegue um atalho na tela inicial.
O app Tizen da TV continua em HTTP e não precisa disso.

## Decisão
- O controle ganha manifesto próprio, `public/pad.webmanifest`: `start_url` e `scope` em `/pad`, `display: standalone`, `orientation: portrait`,
  ícones `any` e `maskable` (os da marca, em `brand/final/web`). O `site.webmanifest` continua sendo o da marca.
- **Service Worker** `public/sw.ts`, registrado só pelo controle, com escopo `/pad`. Estratégia **rede primeiro**: jogos mudam
  sempre e nunca devemos servir um jogo antigo por engano. Sem rede, abre a casca do cache e mostra "Reconectando…". Não toca o WebSocket,
  outras origens nem requisições que não sejam GET. A versão do cache (`CACHE`) é trocada quando a lista da casca muda.
- **HTTPS opcional, nativo** (`node:https`): `TLS_CERT` e `TLS_KEY` (caminhos) ligam uma segunda porta, `HTTPS_PORT` (3443). O mesmo app
  (salas, rotas, WebSocket) atende as duas portas. A TV segue em HTTP e o **QR aponta o celular para o HTTPS** (`httpsPort`).
  O servidor manda `Strict-Transport-Security` nas respostas HTTPS. Sem certificado tudo funciona como antes, só não instala.
- No controle: botão **Instalar** (usa o `beforeinstallprompt`, só aparece quando o navegador permite), `wakeLock` de tela enquanto
  há jogo, `viewport-fit=cover` com áreas seguras, sem puxar-para-atualizar nem seleção de texto ao tocar.
- Como obter o certificado (guia em `docs/pwa.md`): um certificado de CA local instalado no celular, ou um domínio próprio com registro
  A para `192.168.1.10` e certificado por DNS-01 (confiável em qualquer celular, sem instalar nada).

## Alternativas
- **Só atalho na tela inicial (HTTP)**: abre em aba do navegador, sem tela cheia estável. É o que sobra sem certificado.
- **Cache primeiro**: abre mais rápido, mas serviria jogos velhos depois de uma atualização. Rejeitado.
- **Biblioteca de PWA (Workbox)**: dependência para umas 40 linhas (ADR 0004).
- **`tailscale cert`**: certificado real, mas o celular precisaria estar na tailnet e o nome resolve para o IP da tailnet, não da LAN.

## Consequências
- O PWA completo depende de um certificado que **não está no repositório**. O código está pronto e testado, e a instalação no celular
  fica pendente até haver certificado.
- Verificado em Chromium real (Playwright, `localhost`): o SW ativa e controla a página, a casca fica em cache (12 arquivos) e o
  navegador dispara `beforeinstallprompt`. O navegador embutido do app **bloqueia Service Workers**, então ali só o teste unitário
  (`server/sw.test.ts`, ambiente simulado) vale.
- Instalar o controle não muda o pareamento: o token continua no `localStorage` da origem instalada. Quem mudar de HTTP para HTTPS
  é outra origem e precisa aceitar na TV de novo uma vez.
