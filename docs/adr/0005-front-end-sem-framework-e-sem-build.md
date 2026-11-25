# 0005. Front-end sem framework e sem etapa de build

- Status: substituído em parte pelo [0009](0009-preact-com-htm-sem-etapa-de-build.md) (a parte "sem framework"; "sem build" e CSS nativo continuam)
- Data: 2026-11-25

## Contexto
As telas rodam no navegador de uma TV Samsung (Tizen 8) e no celular. O teste M0 mostrou que a TV suporta WebSocket,
módulos ES, `async/await`, `fetch`, canvas e CSS grid. Os jogos precisam ser leves, previsíveis e fáceis de servir.
O Astryx (instalado antes) pede um compilador StyleX para parte dos modelos, e as regras do `AGENTS.md` dele ("sem `<div>`")
valem para páginas feitas com os componentes dele.

## Decisão
- Telas em **HTML, CSS e módulos ES nativos**, servidas como arquivos estáticos pelo Node. **Sem bundler, sem transpilador,
  sem framework**.
- Estilo com CSS nativo e variáveis (`--cor-*`, `--espaco-*`), seguindo a paleta do logo (`brand/GUIDELINES.md`).
- HTML semântico, com `button`, `main` e `section`; `div` só quando não houver elemento melhor.
- Requisitos de design para o público: sem temporizador, sem tela de "perdeu", sem som repentino, erro vira nova tentativa
  silenciosa, animação lenta e previsível, alvos de toque grandes.

## Alternativas
- Astryx + React: exige build e compilador, e é pesado para a TV.
- Preact ou Svelte: leves, mas ainda adicionam dependência e etapa de build.

## Consequências
- Uma TV mais antiga que a de hoje pode não rodar módulos ES. Se for um problema, revisitamos.
- O Astryx pode servir a um painel para adultos no futuro. Se isso acontecer, ganha ADR próprio.
- Sem build, o que está em `public/` é exatamente o que roda.
