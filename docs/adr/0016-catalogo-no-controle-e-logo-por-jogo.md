# 0016. Catálogo no controle e uma logo por jogo

- Status: aceito
- Data: 2026-11-26

## Contexto
Depois de conectar, o celular deve abrir o catálogo para navegar e escolher o jogo (a TV só mostra). O menu já existia, mas era uma lista
de botões de texto, e um catálogo com várias identidades pede que cada jogo se reconheça de relance.

## Decisão
- **O catálogo abre sozinho** quando o controle é aceito (`ok` → `catalog` → `state: null`). Cabeçalho com a logo e "Conectado à TV <nome>"
  (o servidor manda o `name` da TV no `ok`), título "Escolha um jogo", **filtro por tema** (só quando há mais de um tema) e
  **cartões** de dois por linha: logo, nome e quantidade de jogadores. Jogo com opções abre o formulário antes (com a logo do jogo).
- A TV mostra a mesma lista, com as logos, e diz para escolher no celular.
- **Todo jogo tem `games/<id>/logo.svg`**: quadrado (`viewBox="0 0 N N"`), com `<title>`, sem scripts, manipuladores, imagens nem
  referências externas. `games/__test__/contract.test.ts` confere. A interface arredonda os cantos; o arquivo é de sangria total.
- Cada jogo escolhe sua paleta. A logo de um jogo **não** usa a paleta da Ludoteca (ADR 0012).
- Como criar a logo de um jogo (fluxo da skill `logo-design`, versão rápida): 3 conceitos em SVG preto e cores, teste em 64, 32 e 16 px
  (`concept_sheet.py`), escolha pelo que continua legível pequeno, e `svg_audit.py` limpo. A de "Quantos tem?" foi escolhida assim:
  a interrogação feita de pontos virava poeira abaixo de 32 px, e a pirâmide de 6 pontos (contar 1, 2, 3, com o do topo em amarelo) não.
- O `numbers` deixou de ser rascunho: é o jogo demonstração, visível no catálogo (o `draft` do ADR 0012 continua para jogos em obras).

## Alternativas
- **Capa ilustrada por jogo**: mais bonita, mas cada capa seria um arquivo maior e um pedido a mais por jogo. A logo quadrada serve de capa.
- **Logo opcional**: um jogo sem logo quebraria o catálogo. Obrigatória e testada.

## Consequências
- Jogo novo = incluir `logo.svg` (o teste de conformidade reprova sem ele).
- Com um único tema não há filtro, para não mostrar uma barra inútil.
