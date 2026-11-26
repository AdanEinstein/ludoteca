# Ludoteca — guia de uso do logo (resumido)

## 1. O logo
- **Ideia:** uma peça de jogo apoiada no canto de um L. O jogo tem um lugar seguro. O L vem de Ludoteca e a peça redonda lembra jogo, sem desenhar TV ou controle.
- **Versões:** horizontal (principal) · vertical · só símbolo · só palavra · símbolo pequeno (16 a 48 px) · sobre fundo escuro.
- **Arquivos** (em `brand/final/`):

| Uso | Arquivo |
|---|---|
| Logo principal | `ludoteca-horizontal.svg` |
| Vertical | `ludoteca-stacked.svg` |
| Só símbolo | `ludoteca-symbol.svg` |
| Símbolo abaixo de 48 px | `ludoteca-symbol-small.svg` |
| Só palavra | `ludoteca-wordmark.svg` |
| Fundo azul-noite ou escuro | `*-reversed.svg` |
| Uma cor (preto, branco, azul-noite) | `mono/` |
| Favicon, ícones do app e da web | `web/` (com `head-snippet.html` e `site.webmanifest`) |

Os SVGs são gerados por `brand/build_logo.py` (letras construídas como paths, sem fonte). Para mudar algo, edite o script e rode `python3 brand/build_logo.py`.

## 2. Espaço livre
Deixe em volta do logo uma zona de **1 × o diâmetro da peça** (a bolinha âmbar) em todos os lados. A zona escala com o logo.

## 3. Tamanho mínimo
| Versão | Tela | Impressão |
|---|---|---|
| Horizontal | 96 px de largura | 25 mm |
| Símbolo | 16 px (use `ludoteca-symbol-small.svg`) | 6 mm |

## 4. Cor
| Nome | HEX | RGB | CMYK aproximado* |
|---|---|---|---|
| Azul-noite (primária, o L e o texto) | `#1F3B57` | 31 · 59 · 87 | 64 · 32 · 0 · 66 |
| Âmbar (a peça) | `#CC7425` | 204 · 116 · 37 | 0 · 43 · 82 · 20 |
| Creme (fundo) | `#FAF6EE` | 250 · 246 · 238 | 0 · 0 · 0 · 7 |

\* Conversão simples a partir do RGB. Pantone não definido: valide com prova impressa na gráfica.

Contrastes medidos (WCAG, para elementos gráficos, mínimo 3:1): âmbar sobre branco 3,45 · sobre creme 3,20 · sobre azul-noite 3,34. Azul-noite sobre branco 11,5.

**Pares aprovados:** colorido sobre branco ou creme · versão reversed (L creme, peça âmbar) sobre azul-noite · branco ou preto sobre qualquer fundo calmo.
**Evite:** o símbolo colorido sobre âmbar (a peça some) e sobre preto (o L azul perde contraste). Nesses casos use a versão de uma cor.

## 5. Tipografia
- A palavra "ludoteca" é desenhada à mão como paths (traço uniforme e arredondado, sem fonte), então não há licença de fonte a respeitar. Nunca redigite a palavra em outra fonte.
- Texto de interface: use uma sans-serif arredondada e legível. Sugestão: Nunito (licença OFL), ainda não instalada nem testada neste projeto.

## 6. Não faça
Não estique nem achate · não recolora fora da paleta · não gire · não adicione sombra, contorno, degradê ou efeito · não separe nem reordene as partes do lockup · não use o símbolo colorido sobre fundos ocupados sem um contêiner · não use animações piscantes ou com movimento rápido (o público é sensível a estímulos).

## 7. Testes feitos
- Auditoria de SVG: sem texto vivo, sem raster, sem filtro, 1 a 2 cores, pontuação 99 a 100 em todos os masters.
- Legibilidade a 16, 32 e 48 px (ideia legível a 16 px com o símbolo pequeno), versão de uma cor, versão reversed, desfoque, espelhado e girado 180° (sem leitura indevida).
- Concorrência: não comparei contra marcas reais de jogos infantis. **Não há garantia de registro de marca.** Faça busca de anterioridade (INPI) antes de lançar.

## 8. Limitações conhecidas
- O ícone e o favicon usam um tile azul-noite, porque o L azul sobre fundos escuros de navegador perderia contraste.
- A prancha em `brand/presentation.html` usa dados de exemplo ("Alex Morgan", `ludoteca.com`) nos mockups. Não são reais.
- Não gerei PDF, AI nem EPS (sem as ferramentas aqui). Os SVGs são os masters.

## 7. Logo animada (telas da plataforma)
Só no cabeçalho da TV e do controle, pelo componente `Logo` (`public/logo.ts`, ADR 0015): o L aparece, a peça âmbar assenta no canto,
as letras entram uma a uma (cerca de 2 s, uma vez) e a peça respira bem devagar (1 → 1,05 em 7 s). Nunca sobre um jogo, nunca piscando, e desligada
com `prefers-reduced-motion`. Os arquivos SVG da marca continuam estáticos.

