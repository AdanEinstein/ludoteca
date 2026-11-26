# Decisões de arquitetura (ADRs)

Um arquivo por decisão, numerado, em ordem. Status: `aceito`, `substituído por NNNN` ou `descartado`.
Uma decisão nova que muda uma antiga **não apaga a antiga**: cria outro ADR e marca o anterior como substituído.

Modelo: `NNNN-titulo-curto.md` com Contexto, Decisão, Alternativas e Consequências.

| # | Decisão | Status |
|---|---|---|
| [0001](0001-tv-renderiza-estado-servidor-autoritativo.md) | A TV renderiza o estado; o servidor é a fonte da verdade | aceito |
| [0002](0002-pareamento-iniciado-pelo-celular.md) | Pareamento iniciado pelo celular, com um OK na TV | aceito |
| [0003](0003-abrir-a-tv-app-tizen-e-comando-de-rede.md) | Abrir a Ludoteca na TV: app Tizen casca + comando de rede | aceito |
| [0004](0004-node-nativo-primeiro.md) | Node nativo primeiro, dependências só quando indispensáveis | aceito |
| [0005](0005-front-end-sem-framework-e-sem-build.md) | Front-end sem framework e sem etapa de build | aceito |
| [0006](0006-contrato-do-modulo-de-jogo.md) | Contrato do módulo de jogo | aceito (estendido pelo 0012) |
| [0007](0007-seguranca-do-servidor-local.md) | Segurança do servidor local | aceito |
| [0008](0008-codigo-em-ingles-interface-em-portugues.md) | Código em inglês, interface em português | aceito |
| [0009](0009-preact-com-htm-sem-etapa-de-build.md) | Preact com htm, sem etapa de build | aceito (substitui em parte o 0005) |
| [0010](0010-typescript-executado-direto-pelo-node.md) | TypeScript executado direto pelo Node | aceito |
| [0011](0011-remover-astryx-e-stylex.md) | Remover Astryx e StyleX | aceito |
| [0012](0012-plataforma-consolidada-antes-do-primeiro-jogo.md) | Plataforma consolidada antes do primeiro jogo: menu, assentos, identidade e opções | aceito |
| [0013](0013-node-lts-fixado.md) | Node fixado na versão LTS | aceito |
| [0014](0014-pwa-do-controle-e-https-opcional.md) | O controle como PWA e HTTPS opcional | aceito |
| [0015](0015-logo-animada-lenta-e-uma-vez.md) | Logo animada: lenta, uma vez, e nunca sobre um jogo | aceito |
| [0016](0016-catalogo-no-controle-e-logo-por-jogo.md) | Catálogo no controle e uma logo por jogo | aceito |
| [0017](0017-design-sensorial-dos-jogos-infantis.md) | Design sensorial dos jogos infantis (som, movimento e ajuda) | aceito |
| [0018](0018-sons-de-biblioteca-publica-e-confetes-gentis.md) | Sons de biblioteca pública (CC0) e confetes gentis | aceito |
| [0019](0019-hot-reload-em-desenvolvimento.md) | Hot reload em desenvolvimento | aceito |
