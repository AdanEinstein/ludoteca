# 0015. Logo animada: lenta, uma vez, e nunca sobre um jogo

- Status: aceito
- Data: 2026-11-26

## Contexto
O guia da marca já proibia animações piscantes ou rápidas, porque o público (crianças autistas) é sensível a estímulos. Queremos a logo
com vida nas telas da plataforma sem quebrar isso, e sem cada tela inventar a sua animação.

## Decisão
- A logo animada é o componente `Logo` (`public/logo.ts`): SVG **inline**, com a mesma geometria de `brand/final/ludoteca-horizontal.svg`.
  Inline porque as partes (o L, a peça âmbar, cada letra) precisam de classes. O CSS fica em `public/base.css`.
- **Sequência única, de cerca de 2 s:** o L sobe e aparece (700 ms), a peça âmbar cai e assenta no canto com um único assentamento
  curto (1,4 s), as letras entram uma a uma (90 ms entre elas). Depois a peça **respira** (escala 1 → 1,05 em 7 s, sem parar).
- Regras para qualquer animação da marca: sem piscar, sem movimento rápido, nada acima de 1,05 de escala em laço, só `opacity` e
  `transform`, e `prefers-reduced-motion` desliga tudo (regra global em `base.css`).
- Só aparece **nas telas da plataforma** (cabeçalho da TV e do controle), com `animate`. Nunca sobre um jogo: o jogo tem a sua identidade (ADR 0012).
- Os arquivos SVG da marca continuam estáticos. A animação vive no componente, não no arquivo.

## Alternativas
- **SVG animado em arquivo (`<img>`)**: o `<style>` do SVG bate na política de segurança (`style-src 'self'`) e perde o controle de `animate`.
- **Lottie/GIF/vídeo**: peso e dependência para algo que CSS faz.
- **Animar em laço mais forte**: contraria o guia da marca.

## Consequências
- Mudar a logo (geometria) exige mudar `brand/final` **e** `public/logo.ts` (ficam no mesmo formato de propósito).
- A logo reanima quando a tela da plataforma remonta (por exemplo, ao voltar de um jogo). É curto e previsível.
