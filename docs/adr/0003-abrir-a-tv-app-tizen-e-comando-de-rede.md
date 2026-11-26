# 0003. Abrir a Ludoteca na TV: app Tizen casca + comando de rede

- Status: aceito
- Data: 2026-11-25

## Contexto
Queremos que a TV abra a Ludoteca sozinha depois do pareamento. A TV é uma Samsung `UN65DU7700GXZD` (Tizen, 2024) e o celular
é Android. A Samsung não tem Chromecast integrado, e um site não consegue mandar a TV abrir uma URL.

Medido na própria TV (`192.168.1.4`, API em `:8001`, `:8002` com token):
- O navegador da TV é o app `3202010022079`. O `org.tizen.browser` retorna 404.
- `POST /api/v2/applications/<id>` abre o app (`visible: true`) e `DELETE` fecha.
- **Nenhuma** das 6 formas testadas de passar uma URL ao navegador funcionou (corpo texto, JSON, query, `DEEP_LINK`,
  `NATIVE_LAUNCH`). Simular teclas às cegas também falhou.
- Abrir o navegador deixa a página inicial dele, que o usuário teria de configurar à mão.

## Decisão
- Criar um **app Tizen mínimo** (`tizen/`) que espera o servidor responder e abre a Ludoteca em tela cheia.
- Abri-lo pela rede com o **mesmo comando** que funcionou para apps (`POST /api/v2/applications/LudotecaTV.Ludoteca`),
  disparado por um **servidor na LAN**.
- O app carrega o conteúdo do servidor, então atualizar jogos não exige reinstalar.

## Alternativas
- Página inicial do navegador da TV: configuração manual e o navegador abre vazio.
- Google Cast: exige Chromecast ou Google TV, domínio com HTTPS e cadastro do receiver.
- Simular teclas do controle remoto: depende do layout do navegador e é frágil.

## Consequências
- Exige o **modo desenvolvedor** na TV e um **certificado Samsung** (conta Samsung), uma única vez. Só instala na TV do autor.
- Exige um servidor **na rede da casa** para comandar a TV. Uma nuvem não alcança `192.168.x.x`.
- A API é não oficial e pode quebrar numa atualização de firmware.
- **Verificado em 2026-11-25** na TV real (Tizen 9.0, `secure_protocol` ligado): com o modo desenvolvedor e um certificado
  Samsung (autor + distribuidor, privilégio Public, DUID da TV), o app assina, instala (`tizen install`), abre (`tizen run`) e **navega
  para o servidor**, mostrando a tela da Ludoteca. Não foi preciso `allow-navigation` no `config.xml`.
- O IP da TV **muda** (era `192.168.1.4`, virou `192.168.1.5` depois de reiniciar). Reservar o IP no roteador (DHCP pelo MAC) resolve; o endereço
  da TV é configuração do servidor, não do repositório.
- Ainda não validado: a tecla Voltar fechando o app, e o servidor abrindo o app pela API da Samsung (o `tizen run` já abre pelo `sdb`).
