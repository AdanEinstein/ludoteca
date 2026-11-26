# 0025. "Vamos contar!": contagem sem fim e uma cor para cada número

- Status: aceito
- Data: 2026-11-26

## Contexto
O autor pediu um jogo para a criança contar do 1 "até o infinito", com a cor mudando a cada número, duas setas no controle (avançar e voltar),
som e animação. Diferente de "Quantos tem?" e "Qual começa com?", não há pergunta, acerto nem rodada: só o número e o passo.

## Decisão
- **Sem fim, sem pergunta:** o estado é só `n` (começa em 1), `dir` (sentido do último passo), `moves` (passos dados) e `sound`. Ações `next` e `prev`;
  `prev` em 1 e `next` no maior inteiro seguro (`Number.MAX_SAFE_INTEGER`, o "infinito" da criança, que mantém `n` exato) devolvem o mesmo objeto.
- **Cor por número, sem tabela:** `hueOf(n) = 30 + (n × 137,508) mod 290` (ângulo áureo). Vizinhos sempre ficam muito diferentes, serve para qualquer `n`
  e o intervalo 30° a 320° evita o vermelho (ADR 0017). O fundo é `hsl(hue 45% 28%)`, escuro o bastante para o numeral creme, e muda com uma transição lenta.
- **Dez bolinhas** sob o número acendem uma a uma de 1 a 10 e recomeçam a cada dezena (`dotsOf`), para a criança ver a quantidade crescer.
- **Animação dirigida pelo estado (ADR 0017):** `moves` é a `key` do numeral, então ele remonta e reanima a cada passo; entra deslizando do lado do sentido
  (da direita ao avançar, da esquerda ao voltar). O numeral encolhe conforme o número de dígitos (`--digits`) e sempre cabe na tela.
  `prefers-reduced-motion` desliga o deslize, o quique da bolinha e a transição de cor.
- **Som só na TV, só tons gerados (ADR 0018), sem arquivo:** uma nota suave por número, na escala pentatônica maior (a bolinha 1 a 10 define a nota),
  uma oitava acima a cada dezena ímpar; voltar toca a mesma nota uma oitava abaixo e mais curta; a cada dezena completada ao avançar, um acorde baixinho.
  Opção "Som na TV". Sem som de erro (nem existe erro). Nenhum arquivo foi baixado.
- **Sem confete:** o jogo não tem acerto para comemorar; a animação já é a recompensa de cada passo.

## Alternativas
- **Tabela de cores fixa (10 ou 12 cores que se repetem):** simples, mas "cada número" teria a mesma cor de outros; o ângulo áureo dá uma cor própria sem limite.
- **Falar o número com `speechSynthesis`:** ajudaria quem ainda não lê, mas a voz depende do que a TV Samsung tem instalado; fica como ideia futura.
- **Limite de 100 ou 1000:** esconderia a graça do "infinito" e exigiria uma tela de fim.

## Consequências
- O jogo entra direto no catálogo (sem `draft`), por pedido do autor; as crianças já o veem.
- Dois números distantes podem ter cores parecidas (o espaço de cores é finito); só vizinhos são garantidos diferentes.
- O som é gerado, então não foi validado em uma TV real; o volume (0,14 no máximo) vem do mesmo ajuste de "Quantos tem?".
