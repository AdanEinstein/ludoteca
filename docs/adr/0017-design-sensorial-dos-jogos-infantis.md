# 0017. Design sensorial dos jogos infantis (som, movimento e ajuda)

- Status: aceito
- Data: 2026-11-26

## Contexto
O primeiro público são crianças autistas com interesse em números e letras: calmas, previsíveis, sensíveis a estímulos.
Ao dar sons e animações ao jogo demonstração ("Quantos tem?"), as regras abaixo valem para os jogos desse público,
para não serem redescobertas a cada jogo. O jogo de uma pessoa adulta (tabuleiro) pode ter outro tom, por ADR.

## Decisão
**Jogabilidade**
- Sem relógio, sem placar, sem tela de erro, sem "game over". Rodadas infinitas, o adulto ou a criança sai quando quiser.
- **Errar é neutro:** a opção só esmaece, e a TV **conta de novo, devagar**, como ajuda. Nunca há som ou cor de "erro", nem vermelho.
- **Contar de novo** é um botão sempre disponível, sem custo (ação `again`).
- O número aparece junto da quantidade: no celular, cada numeral mostra pontinhos embaixo; na TV, as peças entram uma a uma, contando.
- Cada rodada tem uma forma e uma cor próprias (4 formas, nunca a mesma duas vezes seguidas), para variar sem surpreender.

**Movimento**
- Lento (centenas de milissegundos a 1 s), um elemento por vez, sem piscar, só `opacity`, `transform` e `filter: brightness`.
- `prefers-reduced-motion` desliga todas as animações (regra global); o jogo precisa continuar legível sem elas.
- A animação é **dirigida pelo estado**, não por relógio do cliente: um contador no estado (`replay` + erros) muda, e o CSS reanima
  (classes `a`/`b` alternadas fazem a animação reiniciar). Reconectar não reanima nada que não mudou.

**Som**
- Gerado com a Web Audio API (nada de arquivos, nada de rede): tons de seno numa escala **pentatônica**, então qualquer sequência soa bem.
  Volume baixo (0,12), ataque suave (sem estalo), nenhum som de erro.
- **Só na TV.** O celular não faz som (ninguém ouve o toque duas vezes, e o controle fica silencioso na mão).
- Opção do jogo **"Som na TV"** (com som / sem som), escolhida pelo adulto antes de jogar e guardada no celular. Sem som é um jogo completo.
- O navegador só libera áudio depois de um gesto: o jogo escuta a primeira tecla ou toque (o OK do controle remoto ao aceitar conta).
  No app Tizen a reprodução costuma ser liberada; se não for, o jogo continua sem som, sem erro.

**Nomes**
- Todo `@keyframes` e `font-family` do CSS do jogo começa com `<id>-` (conferido pelo teste de conformidade, ADR 0012).

## Alternativas
- **Fala (`speechSynthesis`)** dizendo os números em português: ótimo para aprender, mas as vozes variam muito entre TVs e navegadores.
  Fica como evolução, atrás de uma opção.
- **Som no celular**: dobra o som na sala e é difícil de silenciar de forma previsível.
- **Arquivos de áudio**: peso, licenças e sem ganho para tons simples.

## Consequências
- Sons e animações do jogo não são cobertos por teste automático (som não se mede): a lógica que os dispara é (`replay`, `shape`, `sound`),
  e a verificação do resultado visual é no navegador e na TV. Quem ouve a TV é quem valida o volume.
- A escala tem 10 notas, o suficiente para o limite de 9 peças (`celebrate` usa uma nota acima).
