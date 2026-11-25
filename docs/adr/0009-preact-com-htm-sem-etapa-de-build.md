# 0009. Preact com htm, sem etapa de build

- Status: aceito (substitui em parte o ADR 0005)
- Data: 2026-11-25

## Contexto
O ADR 0005 escolheu telas sem framework. O autor pediu que os fronts usem um framework leve (Preact, SolidJS ou similar).
As telas têm estado que muda por mensagem (lista de TVs, pedido de entrada, estado do jogo, reconexão), e vão ganhar mais jogos e um
painel para adultos. Componentes declarativos reduzem o código que redesenha o DOM à mão. O ADR 0004 pede evitar etapas e
dependências sem necessidade, e a TV Samsung roda módulos ES nativos (ADR 0005, verificado no M0).

## Decisão
- Usar **Preact** com templates **htm** (`html` em template literal), **sem JSX e sem bundler**.
- O pacote é `htm`, e o arquivo `htm/preact/standalone.module.js` já traz Preact, hooks e `html` num único módulo ES.
  O servidor o publica como `/vendor/preact.js`, a partir de `node_modules`, e nenhum outro arquivo de `node_modules` é público.
- Telas e jogos importam `html`, `render` e os hooks de `/vendor/preact.js`.
- Um jogo exporta componentes: `TvView({ state })` em `tv.js` e `PadView({ state, send })` em `pad.js` (ADR 0006).
- Continua valendo do ADR 0005: sem etapa de build, CSS nativo com variáveis, requisitos de design para o público
  (sem tempo, sem placar, erro silencioso, movimento lento, alvos grandes).

## Alternativas
- **SolidJS**: o ganho vem do compilador (JSX), o que exige build. O modo sem compilador é mais lento e menos usado.
- **Preact com JSX e bundler (esbuild)**: ergonomia melhor, mas cria etapa de build e dependências de ferramenta.
- **Lit ou Alpine**: também leves, mas o modelo de componentes de Preact é o mais conhecido e menor.

## Consequências
- Uma dependência de execução nova: `htm` (cerca de 10 KB no navegador, Preact incluso). Versão fixada (sem `^`).
- Sem JSX nem checagem de tipos. Erros de template aparecem na execução, então os fluxos são cobertos pelos testes e pela verificação no navegador.
- O servidor precisa de `node_modules` presente para servir `/vendor/preact.js`.
- Astryx e StyleX ficaram sem uso (o Astryx é baseado em React) e foram removidos pelo [ADR 0011](0011-remover-astryx-e-stylex.md).
