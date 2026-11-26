# 0018. Sons de biblioteca pública (CC0) e confetes gentis

- Status: aceito (substitui a parte "Som" do [ADR 0017](0017-design-sensorial-dos-jogos-infantis.md); o resto do 0017 continua)
- Data: 2026-11-26

## Contexto
Os tons gerados por código (ADR 0017) tocaram bem na TV, mas soavam sérios. O autor pediu sons mais alegres, de uma biblioteca pública,
e confetes ao acertar. Sons gravados soam mais ricos que tons de seno, e há bibliotecas com licença livre. Confete é movimento intenso por natureza,
então precisa seguir as regras do ADR 0017 (lento, sem piscar).

## Decisão
**Áudio de biblioteca pública**
- Só entra áudio **CC0** (domínio público) ou licença equivalente que permita uso e redistribuição sem condição. Fonte atual: pacotes do
  Kenney (kenney.nl), "Interface Sounds" e "Music Jingles", baixados dos espelhos no GitHub (`Calinou/kenney-interface-sounds`,
  `Boyquotes/kenney-music-jingles-for-godot`). O download foi aprovado pelo autor, e os arquivos escolhidos entram no repositório.
- Os arquivos ficam em `games/<id>/sounds/`, com **`CREDITS.md`**: fonte (URL), licença e nome de cada arquivo.
  `games/contract.test.ts` exige isso e limita a pasta a 500 KB (a TV carrega por Wi-Fi), só `.wav`, `.ogg` ou `.mp3`.
- Poucos arquivos, curtos. Em "Quantos tem?": **uma nota** (`count.wav`), tocada uma vez por peça em alturas crescentes de uma
  pentatônica maior (`playbackRate`), e **uma vinheta** de comemoração (`win.ogg`).
- Tocam por **Web Audio** (`fetch` + `decodeAudioData`, pré-carregados ao abrir o jogo): sem atraso, na hora certa da animação, e sem
  precisar de `Range` no servidor. Se um arquivo não carregar ou o navegador não decodificar, os **tons gerados** entram no lugar: o jogo nunca fica mudo por acidente.
- As regras de volume, "só na TV" e da opção "Som na TV" do ADR 0017 continuam.

**Confetes**
- Canvas na própria pasta do jogo (`confetti.ts`; a matemática, sem DOM e testada, fica em `particles.ts`). Nada de biblioteca: ~100 linhas.
- **Gentil:** poucos (70 na TV, 36 no celular), grandes, formas do jogo (círculo, quadrado, losango, estrela) e cores da paleta, caindo como chuva em 5 a 9 s,
  girando devagar, com entrada e saída suaves, sem explosão e sem brilho. Começa depois das peças acenderem e do número aparecer.
- Respeita `prefers-reduced-motion` (não aparece) e para de pedir quadros quando a última peça some.

## Alternativas
- **Baixar o pacote inteiro ou depender do site do Kenney em tempo de execução**: peso e dependência de rede. Só os arquivos usados, dentro do repositório.
- **Pixabay/Freesound**: licenças próprias (atribuição, uso restrito) pedem leitura caso a caso. CC0 evita isso.
- **Biblioteca de confete (`canvas-confetti`)**: dependência de execução para algo curto (ADR 0004), e o padrão dela é explosivo, o oposto do que queremos.
- **Elemento HTML `<audio>`**: precisa de `Range` para alguns navegadores e tem atraso e pouca precisão de tempo.

## Consequências
- O repositório passa a ter binários de áudio (cerca de 70 KB). Trocar um som é trocar o arquivo e a linha do `CREDITS.md`.
- Escolher som é gosto: não dá para testar por máquina. A página de audição foi temporária, só para o autor ouvir candidatos.
- O decodificador de OGG depende do navegador da TV; por isso o fallback gerado. Se o jingle não tocar na TV real, vale converter para `.wav` ou `.mp3`.
