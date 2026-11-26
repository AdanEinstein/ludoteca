# Instalar o controle como app (PWA)

Decisão e limites: [ADR 0014](adr/0014-pwa-do-controle-e-https-opcional.md).

O controle (`/pad`) só é instalável em **HTTPS**. Em HTTP (`http://192.168.1.10:3000`) o celular só cria um atalho.
O servidor liga o HTTPS quando recebe um certificado:

```bash
TLS_CERT=/caminho/cert.pem TLS_KEY=/caminho/key.pem pnpm start
```

Isso abre a porta `3443` (mude com `HTTPS_PORT`). A TV continua em `http://…:3000`, e o QR passa a levar o celular para `https://…:3443/pad`.

## Qual certificado

O celular precisa **confiar** nele, senão o Chrome avisa e não instala. Duas formas sem pacotes de terceiros no projeto:

1. **Domínio próprio (confiável em qualquer celular, sem instalar nada).** Crie um nome como `ludoteca.seudominio.com` com registro `A`
   para `192.168.1.10` e emita um certificado Let's Encrypt por DNS-01 (por exemplo com `certbot` ou `acme.sh`). O endereço só resolve para um IP
   privado, então nada fica exposto. Use esse nome no celular (`https://ludoteca.seudominio.com:3443/pad`).
2. **CA local.** Crie uma autoridade própria (por exemplo com `mkcert`), gere o certificado para `192.168.1.10` e instale o certificado da
   CA no celular (Android: Configurações → Segurança → Instalar certificado da CA). Funciona sem domínio, mas é preciso mexer em cada celular.

## No celular
1. Abra o link `https://…:3443/pad` (o QR da TV já aponta para ele).
2. Depois de parear, aparece o botão **Instalar** no topo (ou "Adicionar à tela inicial" no menu do Chrome).
3. Abra pelo ícone: tela cheia, sem barra do navegador, e a tela não apaga durante o jogo.

A origem HTTPS é outra que a HTTP: na primeira vez, a TV pede o OK de novo.

## Como testar sem celular
- Em `http://localhost:PORTA/pad` o navegador trata como origem segura: o Service Worker registra e o Chrome dispara a instalação.
- O navegador embutido do app Claude **bloqueia Service Workers**; use um Chrome/Chromium comum.
- `pnpm test` cobre o manifesto, os ícones, o Service Worker (ambiente simulado) e o servidor HTTPS (se houver `openssl`).
