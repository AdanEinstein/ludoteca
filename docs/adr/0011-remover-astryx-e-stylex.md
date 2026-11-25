# 0011. Remover Astryx e StyleX

- Status: aceito
- Data: 2026-11-25

## Contexto
O Astryx (`@astryxdesign/core`, `theme-neutral`, `cli`) e o StyleX foram instalados no começo, antes das decisões de
Node nativo (ADR 0004), Preact com htm (ADR 0009) e TypeScript sem build (ADR 0010). O Astryx é baseado em React, pede um
compilador StyleX para parte dos modelos e vem com regras próprias (`AGENTS.md`, `GEMINI.md`) que contradizem as do projeto, como "sem `<div>`".
Nenhum arquivo do projeto os importa.

## Decisão
- Remover `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli` e `@stylexjs/stylex`.
- Remover `AGENTS.md` e `GEMINI.md`, que só continham o bloco gerado pelo Astryx. O `CLAUDE.md` deixa de importar o `AGENTS.md`
  e passa a ser a única fonte das regras para agentes.
- Fixar a versão do `qrcode` (`1.5.4`), como as demais dependências.

## Alternativas
- Manter para um futuro painel de adultos: o painel também será em Preact (ADR 0009), e o Astryx exigiria React.
  Se um dia fizer falta, volta por ADR.

## Consequências
- Dependências de execução: `htm` e `qrcode`. De desenvolvimento: `typescript`, `@types/node` e `preact` (só tipos).
- A paleta e os tokens continuam em `public/base.css` e vêm do guia do logo (`brand/GUIDELINES.md`).
