# TacCheck

Primeira entrega do TacCheck como app web estatico para conferencia rapida de disco de tacografo por escala 40/60.

## Rodar localmente

```bash
npm test
npm start
```

Depois abra:

```text
http://127.0.0.1:8765/index.html
```

Demo com o caso real `52,101 / 47,740`:

```text
http://127.0.0.1:8765/index.html?demo=1
```

## Estrutura

- `src/core/geometry.js`: retas, projecao 2D, eixo 40 -> 60, conversao tela/imagem.
- `src/core/tolerance.js`: tolerancia, divergencia, limites e aprovado/reprovado.
- `src/core/analysis.js`: orquestracao do calculo completo.
- `src/ui/viewer.js`: canvas com zoom, pan e conversao de coordenadas.
- `src/ui/app.js`: interface e geracao da evidencia marcada.
- `tests/`: testes automatizados dos casos reais, geometria e coordenadas.
- `evidencias/`: prints gerados para a entrega.

## Provas geradas

- `evidencias/tela_demo_52_101_47_740.png`
- `evidencias/imagem_marcada_demo_52_101_47_740.png`
