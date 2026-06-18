# Decisoes Tecnicas

Este documento registra decisoes importantes do TacCheck.

## App web estatico

Decisao:

- implementar a primeira entrega como app web estatico.

Motivo:

- facilita publicacao via GitHub Pages;
- evita instalacao de dependencias desktop;
- permite validar rapidamente o motor de calculo.

## Core separado da UI

Decisao:

- manter calculos em `src/core`;
- manter DOM, canvas e interacoes em `src/ui`.

Motivo:

- testes automatizados nao dependem de navegador;
- a regra matematica fica isolada da interface;
- reduz risco de regressao visual afetar calculo.

## Calculo por geometria 2D

Decisao:

- calcular no eixo 40 -> 60 por projecao 2D.

Motivo:

- nao assumir que a imagem esta perfeitamente horizontal;
- aceitar linha 40 acima ou abaixo da linha 60;
- permitir imagens inclinadas.

## Leitura pelo topo do registro

Decisao:

- a velocidade indicada no disco e obtida pelo topo do registro da velocidade.

Motivo:

- segue o criterio operacional informado pelo usuario;
- remove a interpretacao anterior de centro da faixa;
- simplifica o fluxo do MVP.

## Coordenada real da imagem

Decisao:

- converter cliques do canvas para coordenadas reais da imagem.

Motivo:

- zoom e pan nao podem afetar calculo;
- a evidencia precisa ser rastreavel;
- testes devem comprovar a conversao.

## GitHub Pages

Decisao:

- publicar a versao navegavel pelo GitHub Pages.

Motivo:

- acesso simples por navegador;
- permite validacao operacional rapida;
- mantem o projeto publico enquanto for necessario para testes.
