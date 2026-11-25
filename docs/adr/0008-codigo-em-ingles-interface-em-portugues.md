# 0008. Código em inglês, interface em português

- Status: aceito
- Data: 2026-11-25

## Contexto
Os primeiros arquivos misturaram português e inglês (`criarSalas`, `reduzir`, `acertou`, mensagens `entrou` e `saiu`).
O autor pediu um padrão único: inglês no código e português do Brasil no que o usuário vê.

## Decisão
**Em inglês:** identificadores (variáveis, funções, classes, constantes), nomes de arquivos e pastas de código, mensagens e
campos do protocolo, chaves de estado e de ação dos jogos, ids de jogo, nomes de testes, comentários de código e mensagens de erro internas.

**Em português (PT-BR):** todo texto exibido nas telas (botões, instruções, nomes de jogos para o usuário, nomes das TVs),
a documentação (ADRs, README, guias) e as mensagens de commit.

Exemplos: o jogo `numbers` aparece como "Quantos tem?"; a ação `{ type: 'choose', value: 3 }` vira o toque no botão "3";
`denied` com `reason: 'rejected'` vira "A TV não aceitou este controle.".

## Alternativas
- Tudo em português: já havia mistura e dificulta usar bibliotecas e a documentação oficial do Node e do navegador.
- Documentação também em inglês: sem leitor que peça isso hoje. Se mudar, um ADR novo troca a regra.

## Consequências
- Foi preciso renomear o que já existia (servidor, testes, jogo `numeros` para `numbers`, mensagens do protocolo).
- Textos de interface ficam em português dentro dos componentes. Se algum dia houver outro idioma, vira uma tabela de textos (ADR novo).
- Ferramentas de marca em Python (`brand/`) já usam identificadores em inglês, mas ainda têm comentários em português. Ficam como estão até alguém mexer nelas.
