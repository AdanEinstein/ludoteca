# 0024. "Qual começa com?": sorteio em sacola e cinco palavras por letra

- Status: aceito
- Data: 2026-11-26

## Contexto
O jogo tinha uma palavra por letra e sorteava o alvo e as opções sem memória (só evitava repetir o alvo da rodada anterior). Com 13 letras,
a criança via as mesmas palavras, e as mesmas opções erradas, o tempo todo. O autor também pediu sons e animações ao acertar, como em "Quantos tem?".

## Decisão
- **Catálogo:** cinco palavras por letra (65 no total), cada uma com a sua figura de formas simples em `art.ts`. Um teste exige pelo menos cinco por letra
  e que a primeira letra de cada palavra (sem acento) seja a letra declarada.
- **Alvo sorteado em sacola, não ao acaso:** as letras vêm em voltas (cada letra uma vez por volta, em ordem aleatória, nunca a mesma letra duas vezes
  seguidas, nem na virada da volta). Dentro da letra, as palavras rodam: uma só volta a aparecer depois de todas as outras quatro. O estado guarda
  `lap` (letras que faltam na volta) e `seen` (palavras já usadas), e o jogo continua sendo função pura de `(estado, ação, rng)`.
- **Opções erradas:** uma palavra sorteada de cada uma de `count - 1` letras diferentes da letra alvo. As letras das opções são todas diferentes,
  então nunca há duas respostas certas, e como cada letra tem cinco palavras, as opções variam muito mais.
- **Som (só na TV, opção "Som na TV"):** os mesmos arquivos CC0 de "Quantos tem?" (copiados para `games/letters/sounds/`, cada jogo é uma pasta
  independente, ADR 0006). Uma nota suave quando a letra aparece (rodada nova, erro, "Ver a letra de novo") e, ao acertar, um arpejo ascendente
  (dó-mi-sol-dó) seguido de palmas. Continua sem som de erro (ADR 0017), e tons gerados entram se o arquivo falhar (ADR 0018).
- **Animação ao acertar:** a letra dá um pulo suave, um halo dourado se abre atrás dela, a figura entra com um pequeno quique e caem confetes
  (70 na TV, 36 no celular, mesmo código de "Quantos tem?", copiado). Tudo lento, sem piscar; `prefers-reduced-motion` desliga o pulo, o halo e o confete.

## Alternativas
- **Embaralhar as 65 palavras num saco só:** mais simples, mas a mesma letra pode vir três vezes em dez rodadas. A volta por letra dá a variedade que a criança nota.
- **Compartilhar `audio.ts`/`confetti.ts` entre os jogos:** tiraria a duplicação, mas faria um jogo depender de outro. Se um terceiro jogo precisar, vale extrair para a plataforma com outro ADR.
- **Emojis no lugar das figuras:** dependem da fonte da TV Samsung e fogem do visual próprio do jogo.

## Consequências
- O estado cresce um pouco (`lap` e `seen`, no máximo 13 + 65 números), irrelevante para o WebSocket.
- Existe agora código duplicado entre `games/numbers/` e `games/letters/` (confetes e áudio). A matemática dos confetes continua testada só em `numbers/__test__/particles.test.ts`.
- Letra nova no catálogo: acrescentar cinco palavras e as figuras; o resto (voltas, opções) segue sozinho.
