# Problemas conhecidos ao atualizar o app na TV

Tudo aqui foi visto de verdade na TV Samsung `UN65DU7700GXZD` (Tizen 9.0, 2024). Veja também `tizen/README.md` e o ADR 0003.

## Conectar (sdb)

| Sintoma | Causa e solução |
|---|---|
| `failed to connect to remote target` e `Connection refused` em `26101` | O modo desenvolvedor está ligado, mas o serviço de depuração só sobe depois de um **reinício completo**. Tire da tomada por ~15 s (ou segure o power do controle até reiniciar). Standby não conta. |
| Todas as portas recusam (inclusive `8001`), mas o ping responde, com atraso alto (~200 ms) | A TV está em standby ou ainda iniciando. Ligue a tela e espere na tela inicial. |
| A TV responde em `8001`, mas não no IP antigo | O IP mudou por DHCP. Rode sem `--ip` para descobrir de novo, e considere reservar o IP no roteador pelo MAC. |
| `developerMode: "0"` | Apps > `1 2 3 4 5` no controle > Developer mode **On** > Host PC IP = IP deste PC (hoje `192.168.1.10`) > reiniciar por completo. |
| `unauthorized` ou `offline` em `sdb devices` | `sdb disconnect <ip>`, `sdb kill-server`, `sdb start-server`, `sdb connect <ip>`. Confira o Host PC IP na janela Developer mode. |

## Certificado e assinatura

- A TV tem `secure_protocol: enabled`: só aceita app assinado por certificado **Samsung** (autor + distribuidor, privilégio **Public**) que inclua o DUID dela.
- O perfil se chama `ludoteca` (`tizen security-profiles list`). Para criar de novo: `~/tizen-studio/tools/certificate-manager/certificate-manager` > **+** > Samsung > TV > certificado de autor novo > distribuidor com o login Samsung do usuário > marcar a TV na lista (o DUID entra sozinho, o sdb precisa estar conectado).
- O certificado de desenvolvedor expira. Se a instalação falhar com erro de assinatura ou de certificado, gere outro perfil e reinstale.
- Quem digita senha e faz o login é o usuário. O agente nunca digita credenciais.

## Empacotar e instalar

- `tizen package` escreve `author-signature.xml` e `signature1.xml` na pasta de origem: por isso o script empacota uma **cópia temporária**.
- `tizen install -n Ludoteca.wgt -s <ip>:26101 -- <pasta do pacote>` imprime `Installed the package: Id(LudotecaTV.Ludoteca)` quando dá certo.
- O ícone é `tizen/icon.png` (117×117, quadrado, a TV aplica a máscara). Depois de trocar o ícone, a Home da TV pode demorar a atualizar.

## Abrir e fechar o app

```bash
curl -X DELETE http://<ip-da-tv>:8001/api/v2/applications/LudotecaTV.Ludoteca   # fecha
curl -X POST   http://<ip-da-tv>:8001/api/v2/applications/LudotecaTV.Ludoteca   # abre
curl           http://<ip-da-tv>:8001/api/v2/applications/LudotecaTV.Ludoteca   # {"running":..,"visible":..}
```

Alternativa pelo sdb: `tizen run -p LudotecaTV.Ludoteca -s <ip>:26101`.

## A TV abre o app mas a tela é a errada

- **Fica em "Conectando à Ludoteca…":** o servidor não responde em `SERVER` (`tizen/index.html`). Suba com `pnpm start` e confira o IP do PC (`ip -4 addr`).
- **Mostra a página antiga:** o app abriu antes de o servidor ser reiniciado. Reinicie o servidor e relance o app (`--relaunch-only`).
- **Duas ou três TVs no catálogo do celular:** salas de abas de navegador abertas em `http://<pc>:3000/`. Feche as abas; a TV real é a que mostra o QR.

## Limites

- O som só toca na TV depois do primeiro OK/tecla do controle remoto (política de autoplay do navegador).
- A API `8001` da Samsung é não oficial e pode mudar com uma atualização de firmware; o fallback `tizen run` cobre isso.
