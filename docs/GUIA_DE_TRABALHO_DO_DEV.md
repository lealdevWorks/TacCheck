# Guia de Trabalho do Dev

Este guia registra como estamos trabalhando no TacCheck para que qualquer dev consiga continuar o projeto sem adivinhar o processo.

## Contexto do projeto

O TacCheck e um app web estatico para leitura auxiliar de disco de tacografo.

O app compara:

```text
velocidade_frequente_disco
velocidade_registrada_relatorio
```

A regra principal atual usa limite dinamico:

```text
limite_inferior = relatorio - 4,000 km/h
limite_superior = relatorio + 4,000 km/h
diferenca = abs(frequente - relatorio)
```

Picos e quedas sao analise complementar. Eles nao bloqueiam o calculo principal.

## Estrutura importante

- `index.html`: entrada principal servida pelo GitHub Pages.
- `src/core/`: regra matematica e calculos testaveis sem navegador.
- `src/ui/`: DOM, canvas, interacoes, historico local e imagens marcadas.
- `src/styles/main.css`: visual principal.
- `public/`: copia dos assets estaticos usados pelo Wrangler/Cloudflare.
- `tests/`: testes automatizados.
- `docs/`: regras, processo, historico e decisoes.
- `evidencias/`: prints e provas visuais de entregas.

Sempre que alterar `index.html` ou arquivos em `src/`, sincronizar tambem os equivalentes em `public/` quando existirem.

Exemplos:

```powershell
Copy-Item -LiteralPath index.html -Destination public\index.html
Copy-Item -LiteralPath src\ui\app.js -Destination public\src\ui\app.js
Copy-Item -LiteralPath src\styles\main.css -Destination public\src\styles\main.css
```

## Como recebemos demandas

As demandas normalmente chegam em texto objetivo, com:

- problema observado;
- regra esperada;
- comportamento visual;
- criterios de aceite;
- prints/evidencias obrigatorias.

O dev deve:

1. ler a demanda completa;
2. conferir o estado do Git;
3. localizar a regra ou UI afetada;
4. alterar de forma focada;
5. atualizar testes e docs quando a regra mudar;
6. gerar evidencia quando solicitado;
7. rodar verificacoes;
8. commitar e publicar somente quando o usuario pedir.

## Ordem padrao de trabalho

Use este fluxo antes de editar:

```powershell
cd C:\Sistema\TacCheck
git status --short --branch
```

Durante investigacao:

```powershell
rg -n "texto ou funcao" src public tests docs index.html
```

Depois de editar:

```powershell
npm test
git diff --check
git status --short
```

## Regras de edicao

- Preferir mudancas pequenas e focadas.
- Nao reverter alteracoes que ja estejam no workspace sem pedido explicito.
- Nao usar `git add .`, porque a pasta `evidencias/` pode ter muitos arquivos antigos nao rastreados.
- Adicionar arquivos explicitamente no commit.
- Se uma regra operacional mudar, atualizar `docs/REGRAS_DO_PROJETO.md`.
- Se o modo de trabalho mudar, atualizar este guia ou `docs/PROCESSO_DE_VERSIONAMENTO.md`.
- Se a tela mudar, sincronizar `src` e `public`.

## Testes

O comando padrao e:

```powershell
npm test
```

O teste precisa passar antes de commit/push.

Tambem rodar:

```powershell
git diff --check
```

Esse comando evita whitespace problem e outros problemas simples antes do commit.

## Evidencias visuais

Quando a demanda pedir prints, gerar imagens em `evidencias/`.

Padrao usado:

```text
evidencias/nome_descritivo_1366x768.png
```

Exemplos ja usados:

- `fluxo_principal_limpo_1366x768.png`
- `picos_quedas_aberto_1366x768.png`
- `suspeita_pico_fora_limite_1366x768.png`
- `rotulos_40_60_restaurados_1366x768.png`

Para gerar print local:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Abrir/capturar:

```text
http://127.0.0.1:8765/index.html?demo=1
```

Ao usar Chrome headless, remover qualquer pasta temporaria `.chrome-headless*` depois da captura.

## Demos uteis

URLs locais:

```text
http://127.0.0.1:8765/index.html?demo=1
http://127.0.0.1:8765/index.html?demo=1&case=critical
http://127.0.0.1:8765/index.html?demo=1&case=failure
http://127.0.0.1:8765/index.html?demo=1&case=peak
http://127.0.0.1:8765/index.html?demo=1&case=drop
http://127.0.0.1:8765/index.html?demo=1&case=peak-suspect
http://127.0.0.1:8765/index.html?demo=1&advanced=1
```

URL publica:

```text
https://lealdevworks.github.io/TacCheck/
```

## Versionamento

Usamos uma estrategia simples baseada em SemVer enquanto o projeto esta em `0.x`:

- `0.3.0`: mudanca de regra objetiva/dinamica de velocidade.
- `0.3.1`: correcoes de fluxo visual, PWA/icone instalado e ajustes patch.
- `0.3.2`: rotulos fixos 40/60/50 no canvas e evidencias dessa correcao visual.

Quando mudar a versao, atualizar todos estes pontos:

- `package.json`
- `src/ui/app.js` (`APP_VERSION`)
- `public/src/ui/app.js`
- `index.html` rodape
- `public/index.html` rodape
- query string de CSS/JS no HTML (`?v=...`)
- query string do manifest quando PWA/cache for afetado

Exemplos:

```html
<link rel="stylesheet" href="./src/styles/main.css?v=0.3.2">
<script type="module" src="./src/ui/app.js?v=0.3.2"></script>
<link rel="manifest" href="./assets/brand/site.webmanifest?v=0.3.2">
```

## Commits

Usar mensagens curtas e claras:

```text
feat: adicionar recurso
fix: corrigir comportamento
docs: atualizar processo
test: adicionar cobertura
chore: manutencao
```

Commits recentes importantes:

```text
6f7aa30 fix: aplicar regra dinamica de velocidade
8124a22 fix: simplificar fluxo visual de picos
e878d74 fix: atualizar icone do app instalado
```

Antes de commitar, revisar staging:

```powershell
git diff --cached --stat
git status --short
```

Adicionar explicitamente:

```powershell
git add README.md docs\REGRAS_DO_PROJETO.md src\ui\app.js public\src\ui\app.js
```

Evitar:

```powershell
git add .
```

## Publicacao

Quando o usuario disser "pode lancar", "pode subir" ou equivalente:

```powershell
npm test
git diff --check
git add <arquivos-da-entrega>
git diff --cached --stat
git commit -m "fix: mensagem clara"
git push origin main
```

Depois confirmar:

```powershell
git status --short --branch
git log -1 --oneline --decorate
```

Estado esperado:

```text
main...origin/main
HEAD -> main, origin/main
```

## GitHub Pages e cache

O GitHub Pages publica:

```text
https://lealdevworks.github.io/TacCheck/
```

Pode haver atraso/cache. Para conferir se o GitHub recebeu o arquivo, usar o raw:

```text
https://raw.githubusercontent.com/lealdevWorks/TacCheck/main/index.html
```

Se `raw.githubusercontent.com` tem a alteracao mas Pages ainda nao tem, o push esta correto e falta propagacao/cache.

## Cloudflare/Wrangler

Existe `wrangler.jsonc` apontando assets para:

```text
./public
```

Deploy manual:

```powershell
npx --yes wrangler deploy
```

Observacao: neste ambiente o Wrangler exigiu `CLOUDFLARE_API_TOKEN`. Sem esse token, o deploy Cloudflare nao conclui.

## App instalado/PWA

O app usa:

```text
assets/brand/site.webmanifest
public/assets/brand/site.webmanifest
```

Para problema de icone do app instalado:

- conferir `manifest`;
- conferir `purpose: "any maskable"` nos icones 192 e 512;
- atualizar cache-buster do manifest no HTML;
- orientar reinstalar o app web, porque Windows/Edge/Chrome podem cachear icone antigo.

## Cuidados com evidencias nao rastreadas

A pasta `evidencias/` pode conter muitos arquivos antigos nao rastreados.

Antes de commit:

```powershell
git status --short
```

Adicionar apenas as evidencias da tarefa atual.

Exemplo:

```powershell
git add evidencias\rotulos_40_60_restaurados_1366x768.png
```

Nao adicionar todos os arquivos da pasta sem revisar.

## Checklist de aceite antes de entregar

- A regra solicitada foi implementada?
- A UI ainda cabe em 1366x768 quando isso for requisito?
- `src` e `public` foram sincronizados?
- `npm test` passou?
- `git diff --check` passou?
- Docs foram atualizados quando houve mudanca de regra/processo?
- Evidencias solicitadas foram geradas?
- O commit inclui apenas arquivos da tarefa?
- O push foi feito apenas quando o usuario pediu?
