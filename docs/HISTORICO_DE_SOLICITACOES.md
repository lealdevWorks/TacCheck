# Historico de Solicitacoes

Este documento resume as principais solicitacoes feitas para o TacCheck e como elas foram incorporadas ao projeto.

## 2026-06-16 - Primeira entrega MVP

Solicitacao:

- criar primeira versao do TacCheck como app web estatico;
- manter core de calculo separado da interface;
- criar testes automatizados;
- gerar evidencia visual;
- publicar no GitHub.

Resultado:

- estrutura `src/core`, `src/ui`, `tests`, `evidencias`;
- testes automatizados para geometria, tolerancia e analise;
- GitHub Pages ativado.

Commit inicial:

```text
3127370 feat: primeira entrega do TacCheck
```

## 2026-06-16 - Regra de leitura pelo topo do registro

Solicitacao:

- remover fluxo de borda superior e borda inferior;
- remover calculo de centro do registro;
- usar somente o topo do registro da velocidade;
- permitir 1, 2 ou 3 pontos no topo do registro.

Resultado:

- core atualizado para `buildRegisterTop`;
- UI atualizada para botao unico `Marcar topo do registro`;
- testes atualizados para 15 casos;
- evidencias atualizadas.

Commit:

```text
513970c fix: ler velocidade pelo topo do registro
```

## 2026-06-18 - Documentacao de regras e processo

Solicitacao:

- registrar as regras pedidas pelo usuario no repositorio;
- deixar claro como as solicitacoes sao feitas;
- versionar o modo de trabalho e as decisoes do projeto.

Resultado esperado:

- pasta `docs/`;
- regras do projeto;
- historico de solicitacoes;
- processo de versionamento;
- decisoes tecnicas;
- template para novas demandas.

## 2026-06-23 - Regra objetiva dinamica de velocidade

Solicitacao:

- comparar velocidade frequente do disco com velocidade registrada no relatorio;
- usar limites dinamicos `relatorio - 4,000` e `relatorio + 4,000`;
- classificar diferenca exatamente igual a 4,000 km/h como atencao critica;
- classificar somente diferenca superior a 4,000 km/h como possivel reprovacao;
- tratar picos e quedas separadamente da diferenca principal.

Resultado:

- versao `0.3.0`;
- regra implementada no core;
- UI atualizada para relatorio/frequente/diferenca/limites;
- testes ampliados;
- prints de evidencia gerados;
- publicacao em `main`.

Commit:

```text
6f7aa30 fix: aplicar regra dinamica de velocidade
```

## 2026-06-23 - Fluxo visual de picos e quedas

Solicitacao:

- remover maior ponto e menor ponto do fluxo principal;
- manter picos e quedas como analise avancada opcional;
- reduzir poluicao visual na imagem;
- permitir calculo apenas com imagem, escala 40/60, velocidade frequente e velocidade do relatorio.

Resultado:

- painel `Analise avancada de picos e quedas` recolhido por padrao;
- botoes de pico/queda movidos para o painel avancado;
- teste garantindo que pico/queda nao bloqueiam o calculo principal;
- prints de validacao em 1366x768;
- publicacao em `main`.

Commit:

```text
8124a22 fix: simplificar fluxo visual de picos
```

## 2026-06-23 - Icone do app instalado e versao 0.3.1

Solicitacao:

- corrigir icone do app web instalado na barra de tarefas;
- orientar reinstalacao quando o navegador mantiver cache do icone antigo.

Resultado:

- versao `0.3.1`;
- manifesto atualizado com icones `any maskable`;
- cache-buster do manifest atualizado;
- publicacao em `main`.

Commit:

```text
e878d74 fix: atualizar icone do app instalado
```

## 2026-06-23 - Guia de trabalho do dev

Solicitacao:

- documentar o modo de trabalho usado no projeto;
- deixar claro como lidar com versoes, commits, evidencias, publicacao e deploy.

Resultado:

- criado `docs/GUIA_DE_TRABALHO_DO_DEV.md`;
- `docs/PROCESSO_DE_VERSIONAMENTO.md` reforcado;
- indice de documentacao atualizado.

## 2026-06-23 - Rotulos fixos 40/60 no canvas

Solicitacao:

- restaurar rotulos visiveis diretamente no canvas para as linhas 40 km/h e 60 km/h;
- exibir 50 km/h quando calculado;
- manter os rotulos antes e depois do calculo, com zoom, pan e imagem marcada;
- nao alterar a regra matematica.

Resultado:

- versao `0.3.2`;
- camada final de rotulos de calibracao para 40/50/60;
- botao `50 calculado`;
- botao `Detalhes` para rotulos mais completos;
- prints de validacao em 1366x768.

Evidencias:

```text
evidencias/rotulos_40_60_antes_calculo_1366x768.png
evidencias/rotulos_40_60_apos_calculo_1366x768.png
evidencias/rotulos_40_60_zoom_1366x768.png
evidencias/rotulos_40_60_pan_1366x768.png
evidencias/imagem_marcada_rotulos_40_60_1366x768.png
evidencias/rotulos_40_60_sem_scroll_1366x768.png
```

## 2026-06-23 - Overlay de resultado somente apos Calcular

Solicitacao:

- antes de clicar em `Calcular`, manter o canvas limpo;
- mostrar antes do calculo apenas imagem, escala 40/60, frequente e controles de marcacao;
- nao renderizar relatorio, limite inferior, limite superior, diferenca, resultado, alertas ou picos/quedas antes da confirmacao;
- ao alterar campo de calculo depois de um resultado, exigir novo calculo e remover overlays de resultado;
- ao limpar a analise, voltar ao estado limpo.

Resultado:

- versao `0.3.3`;
- alteracao de relatorio/tolerancia invalida `lastAnalysis` e `lastSnapshot`;
- canvas volta ao estado pre-calculo ate nova acao em `Calcular`;
- demo `clear=1` para validar limpeza apos analise;
- regra matematica preservada.

Evidencias:

```text
evidencias/overlay_limpo_antes_calculo_1366x768.png
evidencias/overlay_pos_calculo_1366x768.png
evidencias/overlay_limpo_apos_limpar_1366x768.png
```

## 2026-06-23 - Regra principal contra velocidade registrada/maxima do ensaio

Solicitacao:

- usar a velocidade registrada/maxima do ensaio como referencia principal;
- permitir `Tolerancia de analise` ajustavel, com maximo de `4,000 km/h`;
- calcular limites principais como `velocidade registrada/maxima - tolerancia` e `velocidade registrada/maxima + tolerancia`;
- manter 50 km/h como referencia visual/secundaria;
- manter picos e quedas como analise auxiliar opcional;
- nao poluir o canvas antes do calculo.

Resultado:

- versao `0.4.0`;
- regra central alterada em `src/core/tolerance.js`;
- readiness exige velocidade registrada/maxima do ensaio;
- tolerancia acima de `4,000` bloqueia o calculo;
- UI renomeada para `Conferencia com velocidade registrada/maxima do ensaio`;
- linhas pontilhadas passam a usar velocidade registrada/maxima +/- tolerancia;
- testes ampliados para 42 cenarios.
