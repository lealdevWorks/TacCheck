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
