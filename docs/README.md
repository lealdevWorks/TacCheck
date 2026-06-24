# Documentacao do Projeto TacCheck

Esta pasta registra as regras operacionais, decisoes tecnicas e solicitacoes feitas durante o desenvolvimento do TacCheck.

O objetivo e deixar claro, dentro do proprio repositorio, como o sistema deve funcionar, por que cada decisao foi tomada e como novas solicitacoes devem ser versionadas.

## Arquivos

- `REGRAS_DO_PROJETO.md`: regras atuais que orientam o funcionamento do TacCheck.
- `HISTORICO_DE_SOLICITACOES.md`: resumo cronologico das principais solicitacoes e ajustes.
- `PROCESSO_DE_VERSIONAMENTO.md`: como testar, commitar, publicar e registrar versoes.
- `GUIA_DE_TRABALHO_DO_DEV.md`: manual pratico do nosso fluxo de trabalho, versoes, commits, evidencias e deploy.
- `DECISOES_TECNICAS.md`: decisoes tecnicas importantes e seus motivos.
- `TEMPLATE_SOLICITACAO.md`: modelo para registrar novas demandas.

## Regra de manutencao

Sempre que uma regra operacional mudar, atualizar esta documentacao no mesmo commit da alteracao ou em um commit imediatamente anterior.

Sempre que um dev novo pegar o projeto, comecar por `GUIA_DE_TRABALHO_DO_DEV.md`.

Exemplo:

```text
docs: registrar regra de leitura pelo topo do registro
fix: ler velocidade pelo topo do registro
```
