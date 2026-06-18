<p align="center">
  <img src="./assets/brand/taccheck-logo-horizontal-light.png" alt="TacCheck - Analise de Disco de Tacografo" width="520">
</p>

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
- `docs/`: regras, historico de solicitacoes, decisoes tecnicas e processo de versionamento.

## Documentacao

- `docs/REGRAS_DO_PROJETO.md`
- `docs/HISTORICO_DE_SOLICITACOES.md`
- `docs/PROCESSO_DE_VERSIONAMENTO.md`
- `docs/DECISOES_TECNICAS.md`
- `docs/TEMPLATE_SOLICITACAO.md`

## Metodologia

A analise foi realizada por conferencia rapida em imagem digital do disco de tacografo, utilizando calibracao em pixels a partir das linhas reais de 40 km/h e 60 km/h impressas no disco. A linha de 50 km/h foi calculada automaticamente como ponto medio entre as referencias 40 km/h e 60 km/h. A velocidade indicada no disco foi obtida pela marcacao do topo do registro da velocidade, conforme criterio operacional de leitura. O resultado foi calculado pela diferenca entre a velocidade indicada no disco e a velocidade maxima real do ensaio, respeitando a tolerancia configurada.

## Provas geradas

- `evidencias/tela_demo_52_101_47_740.png`
- `evidencias/imagem_marcada_demo_52_101_47_740.png`

## Direitos autorais

© 2026 Leal DevWorks. Todos os direitos reservados.

TacCheck é uma ferramenta desenvolvida pela Leal DevWorks para análise técnica de discos de tacógrafo.

Rodapé padrão para relatórios futuros:

Gerado pelo TacCheck — © 2026 Leal DevWorks. Todos os direitos reservados.
