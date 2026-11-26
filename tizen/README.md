# App Tizen "Ludoteca" (Samsung TV)

Casca mínima: espera o servidor da Ludoteca responder e abre `http://192.168.1.10:3000/` em tela cheia.
O conteúdo vem do servidor, então atualizar jogos não exige reinstalar o app.
Depois de instalado, o servidor abre o app na TV pela rede (veja o passo 6).

Pacote `LudotecaTV`, app id `LudotecaTV.Ludoteca`. TV alvo: Samsung `UN65DU7700GXZD` (Tizen 9.0, 2024). O IP da TV muda se não houver reserva no roteador (já mudou de `.4` para `.5`);
nos comandos abaixo, `TV` é o IP atual dela.

## Instalação (uma vez)

1. **TV: modo desenvolvedor.** Tela de Apps, aperte `1 2 3 4 5` no controle remoto, ligue "Developer mode", informe como
   "Host PC IP" o IP do PC (`192.168.1.10`) e reinicie a TV. (Os nomes exatos variam por firmware.)
2. **PC: Tizen Studio (ou só o CLI).** Baixe em developer.tizen.org e, no Package Manager, instale as extensões de TV
   (TV Extensions) e o Certificate Manager. Precisa de Java (já instalado).
3. **Certificado Samsung** (precisa da sua conta Samsung, o login é com você). No Certificate Manager: perfil novo,
   Samsung, dispositivo TV, certificado de autor e de distribuidor. Ele pede o **DUID da TV**, que ele lê da TV
   conectada (passo 4). Dê um nome ao perfil, por exemplo `ludoteca`. Privilégio do distribuidor: **Public**.
4. **Conectar à TV:**
   ```bash
   sdb connect TV            # a TV precisa ter sido reiniciada por completo depois de ligar o modo desenvolvedor
   sdb devices
   ```
5. **Empacotar e instalar.** O `tizen package` grava arquivos de assinatura na pasta, então empacote numa **cópia fora do repositório**:
   ```bash
   cp -r tizen /tmp/ludoteca-tizen && cd /tmp/ludoteca-tizen
   tizen package -t wgt -s ludoteca -o /tmp/ludoteca-out -- .
   tizen install -n Ludoteca.wgt -s TV:26101 -- /tmp/ludoteca-out
   tizen run -p LudotecaTV.Ludoteca -s TV:26101
   ```
6. **Abrir pela rede** (é o mesmo comando que já abre o navegador da TV; ainda não automatizado no servidor):
   ```bash
   curl -X POST http://TV:8001/api/v2/applications/LudotecaTV.Ludoteca
   curl http://TV:8001/api/v2/applications/LudotecaTV.Ludoteca   # running/visible
   ```
   Com o servidor da Ludoteca de pé (`pnpm start`), a TV deve abrir direto na tela do QR.

## Se algo não funcionar

- **App abre e fica na tela "Conectando"**: o servidor não está acessível em `192.168.1.10:3000`. Suba com `pnpm start`.
- **Abre, mas não navega para o servidor**: no teste real não precisou de `allow-navigation`. Se um firmware novo exigir, adicione
  `<tizen:allow-navigation>*</tizen:allow-navigation>` no `config.xml` e reinstale.
- **`sdb connect` recusado (porta 26101)**: a TV só abre a porta depois de um reinício **completo** (da tomada) com o modo desenvolvedor ligado.
  Se ainda recusar, confira se o IP da TV mudou: `sdb` e a API `:8001` só respondem no IP novo.
- **IP do PC mudou**: reserve o IP no roteador, ou edite `SERVER` em `index.html` e reinstale.
- **Voltar do controle remoto não fecha o app**: o handler da tecla 10009 está na casca e em `public/tv.ts`, mas só funciona se
  o objeto `tizen` estiver disponível na página remota. Ainda não verificado.

## Limites

- Instala só na TV com modo desenvolvedor (a sua). Para outras TVs seria preciso publicar na loja da Samsung.
- O certificado de desenvolvedor tem validade. Quando expirar, gere outro e reinstale o app.
