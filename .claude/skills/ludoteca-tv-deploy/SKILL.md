---
name: ludoteca-tv-deploy
description: Atualiza, reinstala ou relança o app Tizen da Ludoteca (LudotecaTV.Ludoteca) na TV Samsung do autor. Descobre o IP atual da TV na rede (ele muda por DHCP), confere o modo desenvolvedor, empacota uma cópia de tizen/ fora do repositório com o perfil de certificado 'ludoteca', conecta por sdb, instala, reabre o app e valida. Use sempre que o usuário pedir para "atualizar o pacote/app na TV", "reinstalar o app Tizen", "mandar para a TV", "relançar a Ludoteca na TV", "publicar na TV", mudar tizen/ (config.xml, index.html, ícone, IP do servidor), ou relatar que a TV não abre a Ludoteca, que o sdb recusa conexão (porta 26101) ou que o IP da TV mudou, mesmo sem citar Tizen ou sdb.
---

# Atualizar o app da Ludoteca na TV

O app da TV (`tizen/`) é só uma **casca**: espera o servidor da Ludoteca responder e abre `http://<IP do PC>:3000/` em tela cheia.
Todo o conteúdo (telas, jogos, sons) vem do servidor. Por isso há dois casos bem diferentes, e escolher o certo poupa tempo e evita mexer na TV à toa:

| O que mudou | O que fazer |
|---|---|
| Código do servidor, `public/`, `games/` (telas, jogos, sons, CSS) | **Só relançar** o app. Reinicie o servidor se o código do servidor mudou, e rode com `--relaunch-only`. |
| Algo em `tizen/` (`config.xml`, `index.html`, `icon.png`) ou o IP do PC mudou | **Reempacotar e reinstalar** (fluxo completo). |

## Como usar

O script faz tudo e é seguro por padrão. Ele fica em `.claude/skills/ludoteca-tv-deploy/scripts/deploy_tv.py` (Python, só biblioteca padrão).

1. **Rode primeiro o ensaio**, que não toca na TV (só lê a página de informações da TV e empacota numa pasta temporária):
   ```bash
   python3 .claude/skills/ludoteca-tv-deploy/scripts/deploy_tv.py --dry-run
   ```
   Ele mostra o IP e o modelo da TV, confere o modo desenvolvedor, o `SERVER` do `tizen/index.html` e o servidor, e gera `Ludoteca.wgt` assinado.
2. **Aplique** quando o usuário confirmar (instalar e reabrir é uma ação na TV dele; se ele não pediu para aplicar agora, pare no ensaio):
   ```bash
   python3 .claude/skills/ludoteca-tv-deploy/scripts/deploy_tv.py               # reempacota, instala e relança
   python3 .claude/skills/ludoteca-tv-deploy/scripts/deploy_tv.py --relaunch-only   # só reabre o app (conteúdo novo do servidor)
   ```
3. **Leia o resumo final.** "TVs registradas no servidor" lista as salas: a da TV real é a que mostra o QR; as outras são abas de navegador ou a página antiga de teste. Peça ao usuário para confirmar o que a TV mostra, porque a tela e o som não dá para ver daqui.

Opções úteis: `--ip <ip>` (pula a descoberta), `--model <prefixo>` (escolhe entre várias TVs), `--profile <nome>`, `--port <porta do servidor>`.
Variáveis: `TV_IP`, `TIZEN_STUDIO` (padrão `~/tizen-studio`).

## Por que o script faz assim

- **Descobre o IP:** a TV pega IP por DHCP e já mudou (`.4` virou `.5`). O script varre a /24 do PC pela porta 8001 e confere o modelo. Com mais de uma TV, exige `--ip`.
- **Empacota uma cópia:** `tizen package` grava arquivos de assinatura na pasta onde roda; empacotar `tizen/` direto sujaria o repositório. O `README.md` também fica de fora do pacote.
- **Relança pela API da Samsung** (`DELETE` e `POST /api/v2/applications/LudotecaTV.Ludoteca`), o mesmo comando que o servidor da Ludoteca vai usar para abrir a TV. Se a API falhar, cai para `tizen run` pelo sdb.
- **Valida de dois jeitos:** a API diz `running`, e o servidor mostra se a TV registrou uma sala (a página carregou de verdade).

## Quando algo dá errado

Leia `references/troubleshooting.md`. Os casos mais comuns, resumidos:

- **Porta 26101 recusada:** o modo desenvolvedor está ligado, mas a TV nunca foi reiniciada **por completo**. Tirar da tomada por uns 15 s resolve (standby não basta).
- **TV não aparece na varredura:** ela estava em standby ou com outro IP. Ligue a tela, ou passe `--ip`.
- **Perfil `ludoteca` não existe ou expirou:** crie no Certificate Manager. O login Samsung e as senhas são do usuário: **nunca digite credenciais por ele**, peça que faça e avise.
- **Aviso de `SERVER`:** o `tizen/index.html` tem o IP do PC fixo (`192.168.1.10`). Se o PC mudou de IP, edite e reinstale.

## O que não fazer

- Não instalar nem reiniciar o app na TV sem o usuário ter pedido nesta conversa (ele já disse "não aplique nada na TV" antes: respeite e fique no `--dry-run`).
- Não matar o servidor do usuário (porta 3000) sem perguntar: o processo pode estar no terminal dele. Se o servidor precisa reiniciar, avise e peça o OK.
- Não commitar `.wgt`, `author-signature.xml`, `signature1.xml` nem a pasta `SamsungCertificate`: ficam fora do repositório.
