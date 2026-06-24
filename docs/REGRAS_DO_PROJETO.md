# Regras do Projeto TacCheck

## Natureza da ferramenta

O TacCheck e uma ferramenta auxiliar para leitura visual/tecnica de disco ou fita de cronotacografo.
Nao deve ser apresentado como leitura oficial da RBMLQ-I/Inmetro.

## Regra principal de velocidade

A conferencia principal compara a velocidade frequente do disco com a velocidade registrada no relatorio ou maxima do ensaio informada pelo sistema de ensaio.

```text
referencia = velocidade_registrada_maxima_ensaio
tolerancia_analise = valor configurado pelo usuario, ate 4,000 km/h
diferenca = abs(velocidade_frequente_disco - referencia)
limite_inferior = referencia - tolerancia_analise
limite_superior = referencia + tolerancia_analise
```

O valor padrao da tolerancia e `4,000 km/h`. O usuario pode reduzir esse valor para uma analise preventiva/conservadora. O sistema nao permite tolerancia acima de `4,000 km/h`.

A classificacao, sem arredondamento previo, e:

- diferenca menor que a tolerancia configurada: dentro do limite;
- diferenca exatamente igual a tolerancia configurada: atencao critica, revisar leitura;
- diferenca maior que a tolerancia configurada: possivel reprovacao/alerta por divergencia com a velocidade registrada/maxima do ensaio.

As linhas pontilhadas principais do canvas sao os limites `referencia +/- tolerancia_analise` e so aparecem depois do calculo.

## Referencia 50 km/h

A linha de 50 km/h permanece como referencia visual/calibracao:

- orienta a regiao esperada do ensaio;
- ajuda na interpretacao do disco;
- pode aparecer como bloco secundario de referencia contra padrao 50 km/h.

A linha 50 km/h nao substitui a conferencia principal contra a velocidade registrada/maxima do ensaio.

## Escala e leitura frequente

O operador marca pelo menos dois pontos nas linhas 40 e 60 km/h. A calibracao usa coordenadas reais da imagem e projeta as demais velocidades no eixo 40 -> 60. Referencias desalinhadas devem gerar alerta pela diferenca angular.

A marca principal representa a velocidade frequente da regiao constante: centro do traco, mediana visual ou faixa predominante confirmada pelo operador. Nao usar como leitura principal ponto isolado, borda, mancha, sombra, sujeira, aceleracao, desaceleracao ou falha de impressao.

## Picos e quedas

Picos e quedas sao analise auxiliar. O fluxo principal nao pode exigir marcacao de maior ponto, menor ponto, confirmacao de pico ou confirmacao de queda para calcular.

O operador pode abrir o painel avancado e marcar o maior e o menor ponto real quando houver suspeita visual. Uma nova marca fora dos limites comeca como suspeita e exige confirmacao visual de:

- continuidade minima do traco;
- coerencia com a espessura do registro;
- ausencia de sujeira, sombra ou falha de impressao.

Pico acima do limite superior ou queda abaixo do limite inferior somente gera possivel reprovacao apos confirmacao manual. Ponto exatamente no limite gera atencao critica. O operador pode confirmar, ignorar como ruido/sujeira ou ajustar a regiao.

## Evidencia

A evidencia salva inclui imagem, velocidade registrada/maxima do ensaio, tolerancia de analise, velocidade frequente, diferenca calculada, limites da conferencia, referencia 50 km/h, marcas e classificacao de picos/quedas, confirmacoes do operador, qualidade da calibracao e status.

As linhas 40 e 60 devem aparecer com rotulo no canvas. A linha 50 deve aparecer quando calculada/marcada. Antes do calculo, nao mostrar limites, resultado ou alertas no canvas.

## Testes obrigatorios

Cobrir ao menos:

- registrada/maxima 52,101 com frequente 47,740 e tolerancia 4,000: diferenca 4,361, possivel reprovacao;
- registrada/maxima 52,000 com frequente 48,000 e tolerancia 4,000: diferenca 4,000, atencao critica;
- registrada/maxima 51,000 com frequente 48,500 e tolerancia 4,000: diferenca 2,500, dentro do limite;
- linhas pontilhadas 52,101 +/- 4,000 = 48,101 e 56,101;
- tolerancia 3,500 aplicada nos limites da velocidade registrada/maxima;
- bloqueio de tolerancia acima de 4,000;
- picos/quedas opcionais e separados da leitura principal;
- referencias 40/60 desalinhadas.
