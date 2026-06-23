# Regras do Projeto TacCheck

## Regra objetiva de velocidade

O TacCheck compara a velocidade frequente estimada no disco/fita com a velocidade registrada no relatório de ensaio:

```text
diferença = abs(velocidade_frequente_disco - velocidade_registrada_relatorio)
limite_inferior = velocidade_registrada_relatorio - 4,000
limite_superior = velocidade_registrada_relatorio + 4,000
```

A classificação, sem arredondamento prévio, é:

- diferença até 3,500 km/h: dentro do limite;
- diferença maior que 3,500 e menor que 4,000 km/h: atenção, próximo do limite;
- diferença exatamente igual a 4,000 km/h: atenção crítica, revisar;
- diferença superior a 4,000 km/h: possível reprovação.

A linha de 50 km/h é referência visual do ensaio. Ela e a faixa 45–55 km/h não são limites de reprovação. O sistema nunca deve apresentar reprovação automática.

## Escala e leitura frequente

O operador marca pelo menos dois pontos nas linhas 40 e 60 km/h. A calibração usa coordenadas reais da imagem e projeta as demais velocidades no eixo 40 → 60. Referências desalinhadas devem gerar alerta pela diferença angular.

A marca principal representa a velocidade frequente da região constante: centro do traço, mediana visual ou faixa predominante confirmada pelo operador. Não usar como leitura principal ponto isolado, borda, mancha, sombra ou falha de impressão.

## Picos e quedas

O operador pode marcar o maior e o menor ponto real. Uma nova marca fora dos limites começa como suspeita e exige confirmação visual de:

- continuidade mínima do traço;
- coerência com a espessura do registro;
- ausência de sujeira, sombra ou falha de impressão.

Pico acima do limite superior ou queda abaixo do limite inferior somente gera possível reprovação após confirmação manual. Ponto exatamente no limite gera atenção crítica. O operador pode confirmar, ignorar como ruído/sujeira ou ajustar a região.

## Evidência

A evidência salva inclui imagem, velocidade do relatório, velocidade frequente, diferença absoluta, limites dinâmicos, marcas e classificação de picos/quedas, confirmações do operador, qualidade da calibração e status. As linhas 40, 50, 60, relatório ±4 e leitura frequente devem aparecer na imagem marcada.

## Testes obrigatórios

Cobrir ao menos os pares relatório/disco `52/56`, `52/56,001`, `52/47,999`, `50/46` e `50/45,999`; picos em `56` e `56,001`; queda em `47,999`; marca isolada pendente de confirmação; e referências 40/50/60 desalinhadas.
