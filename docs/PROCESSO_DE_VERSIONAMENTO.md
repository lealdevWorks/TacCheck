# Processo de Versionamento

Este documento define como o TacCheck deve ser testado, versionado e publicado.

## Antes de qualquer commit

1. Conferir a pasta correta:

```powershell
cd C:\Sistema\TacCheck
```

2. Conferir status:

```powershell
git status --short
```

3. Rodar testes:

```powershell
npm test
```

4. Conferir arquivos sensiveis:

- nao enviar `.env`;
- nao enviar tokens;
- nao enviar senhas;
- nao enviar credenciais;
- nao enviar certificados;
- nao enviar `node_modules/`.

## Commits

Usar mensagens claras:

```text
feat: adicionar nova funcionalidade
fix: corrigir comportamento
docs: atualizar regras do projeto
test: adicionar testes
chore: ajuste de manutencao
```

Quando a mudanca alterar regra operacional, atualizar `docs/REGRAS_DO_PROJETO.md`.

## Publicacao

Fluxo padrao:

```powershell
npm test
git status --short
git add <arquivos>
git commit -m "tipo: mensagem"
git push origin main
```

## Tags

Tags devem marcar entregas estaveis ou marcos relevantes.

Exemplo:

```powershell
git tag -a v0.1.0 -m "MVP TacCheck com calculo 40/60 validado"
git push origin v0.1.0
```

Nao mover tags ja publicadas sem decisao explicita.

## GitHub Pages

Publicacao atual:

```text
https://lealdevworks.github.io/TacCheck/
```

Demo:

```text
https://lealdevworks.github.io/TacCheck/?demo=1
```

Configuracao esperada:

- Source: Deploy from a branch;
- Branch: `main`;
- Folder: `/ root`.

## Evidencias

Evidencias demonstrativas podem ser versionadas quando comprovam uma entrega.

No futuro, se houver muitos arquivos temporarios, criar:

```text
evidencias/temp/
```

e ignorar somente essa subpasta.
