# 0013. Node fixado na versão LTS

- Status: aceito
- Data: 2026-11-25

## Contexto
O projeto roda TypeScript direto pelo Node (ADR 0010) e usa o servidor WebSocket e o HTTP nativos (ADR 0004), então o comportamento
do Node faz parte do produto. Até aqui a versão não estava fixada: eu testava no Node 24.0.1 e o terminal do autor usava o 26.13.1.
Em 2026-11-25 a linha LTS ativa é a **26 ("Lithium")**, versão 26.13.1 (conferido em `nodejs.org/dist/index.json`); a 24 está em manutenção.

## Decisão
- Fixar o Node na **LTS ativa, 26.13.1**: `.tool-versions` (asdf, `nodejs 26.13.1`) e `engines.node = "^26.13.1"` no `package.json`.
- `@types/node` na linha 26, versão exata (`26.6.11`), como as demais dependências.
- Usar só versões LTS (número par, já promovido a LTS). Versões "Current" não entram.
- A troca de LTS é um ADR curto: sobe `.tool-versions`, `engines` e `@types/node` juntos e roda `pnpm test` e `pnpm typecheck`.

## Alternativas
- **Node 24** (LTS em manutenção): já testado, mas sai de suporte antes e o terminal do autor já usa o 26.
- **Sem fixar**: foi o que gerou a diferença entre o ambiente testado e o do autor.

## Consequências
- Testes e `tsc` passaram no Node 26.13.1 com `@types/node` 26 (um tipo de teste do socket foi ajustado em `server/__test__/ws.test.ts`).
- `module.stripTypeScriptTypes`, usado em `server/app.ts`, continua experimental no 26 e o Node avisa no log. Só esse arquivo depende dele.
- Quem usa outro gerenciador de versões (nvm, fnm) precisa criar o arquivo equivalente. `engines` avisa se a versão não bate.
