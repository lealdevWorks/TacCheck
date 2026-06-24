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

5. Se houver alteracao em `src/` ou `index.html`, conferir se tambem e necessario sincronizar `public/`.

Exemplos:

```powershell
Copy-Item -LiteralPath index.html -Destination public\index.html
Copy-Item -LiteralPath src\ui\app.js -Destination public\src\ui\app.js
Copy-Item -LiteralPath src\styles\main.css -Destination public\src\styles\main.css
```

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

Nao usar `git add .` por padrao. A pasta `evidencias/` pode conter arquivos antigos nao rastreados. Adicionar explicitamente os arquivos da entrega.

Antes de fechar o commit:

```powershell
git diff --cached --stat
```

## Versoes

Quando a entrega muda a versao, atualizar:

- `package.json`;
- `src/ui/app.js` (`APP_VERSION`);
- `public/src/ui/app.js`;
- rodape de `index.html`;
- rodape de `public/index.html`;
- query strings de CSS/JS no HTML;
- query string do `site.webmanifest` quando houver ajuste PWA/cache.

Regra pratica:

- mudanca de regra principal ou marco funcional: nova versao minor dentro de `0.x`;
- correcao visual, PWA, textos, fluxo ou bug sem mudar regra principal: patch.

Exemplo:

```text
0.3.0 -> regra objetiva/dinamica de velocidade
0.3.1 -> correcoes visuais/PWA/fluxo
0.3.2 -> rotulos fixos 40/60/50 no canvas
```

## Publicacao

Fluxo padrao:

```powershell
npm test
git status --short
git add <arquivos>
git diff --cached --stat
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

## Guia completo do dev

O fluxo detalhado de trabalho esta em:

```text
docs/GUIA_DE_TRABALHO_DO_DEV.md
```
