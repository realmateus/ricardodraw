# Guia de estilo — ricardodraw

Este documento define a linguagem visual e de movimento usada na página inicial. Use estas regras como base para as demais páginas, adaptando a composição ao conteúdo sem criar um segundo sistema visual.

## 1. Direção visual

- Minimalismo editorial, predominantemente preto e branco.
- Elementos neobrutalistas aparecem como pontos de interação: bordas pretas, cantos retos e sombras sólidas deslocadas.
- As ilustrações são os principais pontos de cor. A interface não deve competir com elas.
- Evitar gradientes decorativos, sombras difusas, excesso de arredondamento e animações contínuas sem função.

## 2. Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `--home-black` | `#0b0b0b` | Texto, bordas, fundos de alto contraste |
| `--home-white` | `#ffffff` | Fundo principal e superfícies |
| `--home-paper` | `#f5f5f1` | Alternância sutil de seções |
| `--home-gray` | `#696969` | Texto secundário e metadados |

Regras:

- Todo texto comum deve manter contraste mínimo de 4.5:1.
- Cores das ilustrações não devem ser reutilizadas como cores fixas da interface.
- Estados ativos podem inverter preto e branco.

## 3. Tipografia

### Arlon Bold

- Arquivo: `font/arlon-bold.ttf`.
- Uso: título principal do hero.
- Aplicar com peso `700`, entrelinha curta (`0.89` a `0.95`) e espaçamento negativo moderado.

### Arlon Regular

- Arquivo: `font/arlon-regular.ttf`.
- Uso: botões, navegação, títulos de seção, etiquetas e pequenas chamadas interativas.
- Botões e itens de navegação sempre em letras minúsculas.
- Não simular pesos que não existem.

### Inter

- Uso: corpo de texto, descrições, títulos editoriais e informações extensas.
- Corpo recomendado: `16px` a `18px`, entrelinha `1.6` a `1.8`.

## 4. Caixa e linguagem

- Menu: sempre minúsculo e com o mesmo nome da seção de destino.
- Botões: sempre minúsculos e escritos como ações claras, por exemplo `ver projeto`.
- Títulos de seção ligados ao menu também ficam em minúsculas.
- Títulos de conteúdo podem usar caixa normal.
- Valores monetários usam sempre `R$` com `R` maiúsculo, mesmo dentro de componentes em minúsculas.
- Evitar textos genéricos como `saiba mais` quando uma ação específica for possível.

## 5. Espaçamento e layout

- Container máximo: `1180px`.
- Margem lateral: `24px` em desktop e `16px` em telas pequenas.
- Seções principais: `96px` a `160px` de espaçamento vertical em desktop.
- Usar grid de 12 colunas em galerias editoriais e uma coluna abaixo de `720px`.
- Manter uma única hierarquia principal por seção: etiqueta, título, apoio e conteúdo.

## 6. Componentes neobrutalistas

### Botões e menu

- Borda: `2px solid #0b0b0b`.
- Raio: `0`.
- Sombra: `3px 3px 0` para controles pequenos; `5px 5px 0` para CTAs.
- Hover: deslocar o elemento pela mesma distância da sombra, remover a sombra e inverter preto/branco.
- Active: acrescentar apenas `1px` ao deslocamento do hover.

### Cards

- Borda: `2px solid #0b0b0b`.
- Sombra: `8px 8px 0 #0b0b0b`.
- Hover: deslocar `8px` nos dois eixos e zerar a sombra.
- Imagens podem ampliar até `1.035`; não ultrapassar esse valor.
- Cards sem link podem ter o mesmo feedback visual, mas nunca devem exibir texto de ação.

### Etiquetas

- Arlon Regular, minúsculas, borda de `2px`.
- Usar somente para hierarquia ou metadados, não como decoração repetitiva.

## 7. Imagens

- Imagens de projeto devem preencher o frame com `object-fit: cover`.
- Saturação inicial pode ser reduzida levemente (`0.85`) e voltar a `1` no hover.
- Retratos podem usar transição entre duas épocas, desde que o efeito também funcione por foco de teclado.
- Sempre informar `alt` descritivo. Imagens duplicadas ou decorativas usam `alt=""`.
- Usar `loading="lazy"` fora da primeira dobra.

## 8. Movimento

### Curvas

```css
--home-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--home-ease-snap: cubic-bezier(0.34, 1.56, 0.64, 1);
```

- `ease-out`: entrada de conteúdo, deslocamento de cards e mudanças de layout.
- `ease-snap`: ícones, setas e pequenos elementos com resposta mais tátil.

### Durações

| Tipo | Duração |
| --- | --- |
| Hover de botão | `180ms` |
| Ícone ou etiqueta | `300ms` a `400ms` |
| Reveal de seção | `700ms` |
| Transformação de imagem | `650ms` a `900ms` |
| Marquee institucional | `36s`, linear |

Regras:

- Revelar conteúdo apenas uma vez.
- Deslocamento de entrada máximo: `32px`.
- Não usar blur em reveals.
- Stagger entre itens: `80ms` a `120ms`.
- Não usar parallax contínuo em blocos de texto.
- Pausar marquees no hover.
- Toda animação deve respeitar `prefers-reduced-motion`.

## 9. Acessibilidade

- Foco visível: contorno preto de `3px`, afastado `4px`.
- Interações de hover importantes também devem funcionar com `:focus`.
- Não depender apenas de cor para informar estado.
- Links ativos do menu usam `aria-current="true"`.
- Respeitar a estrutura semântica: um `h1`, seguido por `h2` de seção e `h3` nos cards.

## 10. Implementação

- Estilos globais existentes: `style.css`.
- Estilos exclusivos da home: `index.css`, sempre carregado depois de `style.css`.
- Comportamentos exclusivos da home: `index.js`.
- Toda página deve receber uma classe própria no `body` para evitar conflito com páginas já publicadas.
- Novos componentes devem reutilizar os tokens e padrões deste documento antes de introduzir novas regras.
