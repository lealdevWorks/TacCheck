# Regras do Projeto TacCheck

Este documento registra as regras atuais do TacCheck para consulta e versionamento.

## Objetivo do sistema

O TacCheck e uma ferramenta web para conferencia rapida de disco de tacografo por imagem, usando calibracao por pixels na escala 40/60.

O sistema deve apoiar a verificacao operacional da velocidade indicada no disco em comparacao com a velocidade maxima real do ensaio.

## Regra principal de calculo

O resultado final deve comparar:

- velocidade indicada no disco;
- velocidade maxima real do ensaio.

Nao comparar o resultado final somente contra 50 km/h.

Formula:

```text
divergencia = velocidade_indicada - velocidade_maxima_ensaio
limite_inferior = velocidade_maxima_ensaio - tolerancia
limite_superior = velocidade_maxima_ensaio + tolerancia
```

Resultado:

- se `velocidade_indicada < limite_inferior`: reprovado por baixa indicacao;
- se `velocidade_indicada > limite_superior`: reprovado por alta indicacao;
- caso contrario: aprovado.

## Regra da escala 40/60

O operador deve marcar:

- linha 40 km/h;
- linha 60 km/h.

Cada linha deve aceitar pelo menos 2 pontos. Um terceiro ponto pode ser usado para melhorar o ajuste da reta.

O sistema deve calcular a posicao de qualquer velocidade pela projecao no eixo 40 -> 60.

Formula:

```text
velocidade = 40 + ((posicao - posicao_40) / (posicao_60 - posicao_40)) * 20
```

A linha 50 km/h deve ser calculada automaticamente como ponto medio entre 40 e 60.

## Regra correta do registro

A leitura da velocidade indicada deve ser feita marcando somente o topo do registro da velocidade.

O MVP nao deve pedir:

- borda superior;
- borda inferior;
- centro da faixa;
- media entre duas bordas.

Fluxo correto:

1. Marcar linha 40 km/h.
2. Marcar linha 60 km/h.
3. Calcular linha 50 km/h automaticamente.
4. Marcar topo do registro da velocidade.
5. Calcular velocidade indicada pela posicao do topo.
6. Comparar com a velocidade maxima real do ensaio.

A marcacao do topo deve aceitar:

- 1 ponto no modo simples;
- 2 pontos no modo recomendado;
- 3 pontos opcionalmente para ajuste medio da linha.

## Coordenadas

Nunca calcular usando coordenadas visuais da tela.

Toda marcacao feita no canvas deve ser convertida para coordenada real da imagem antes do calculo.

## Evidencia visual

A imagem marcada deve desenhar:

- linha 40 km/h;
- linha 60 km/h;
- linha 50 km/h calculada;
- velocidade maxima real do ensaio;
- limite inferior;
- limite superior;
- linha de leitura do topo do registro;
- resultado e motivo.

## Testes obrigatorios

Os testes automatizados devem cobrir:

- caso real 1: `51,173 / 46,310`;
- caso real 2: `52,101 / 47,740`;
- aprovado dentro da tolerancia;
- exatamente no limite;
- linha 40 acima e 60 abaixo;
- linha 60 acima e 40 abaixo;
- linhas inclinadas;
- zoom diferente de 100%;
- conversao tela -> imagem;
- leitura por topo do registro com 1, 2 e 3 pontos.

## Metodo de leitura documentado

Texto de referencia:

```text
A analise foi realizada por conferencia rapida em imagem digital do disco de tacografo, utilizando calibracao em pixels a partir das linhas reais de 40 km/h e 60 km/h impressas no disco. A linha de 50 km/h foi calculada automaticamente como ponto medio entre as referencias 40 km/h e 60 km/h. A velocidade indicada no disco foi obtida pela marcacao do topo do registro da velocidade, conforme criterio operacional de leitura. O resultado foi calculado pela diferenca entre a velocidade indicada no disco e a velocidade maxima real do ensaio, respeitando a tolerancia configurada.
```
