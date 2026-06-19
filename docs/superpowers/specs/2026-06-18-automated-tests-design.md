# Design: Testes Automatizados com Playwright

**Data:** 2026-06-18  
**Projeto:** vicduarte.site  
**Stack:** HTML/CSS/JS estático, Bootstrap 5.3, deploy via GitHub → Vercel

---

## Contexto

Site estático com 8 páginas sem npm/build system. Objetivo: garantir que mudanças feitas no Claude Code não quebrem o site antes de ir para produção. Testes rodam localmente antes do `git push`.

## Decisões de design

| Decisão | Escolha | Razão |
|---|---|---|
| Framework | Playwright | CDP nativo, headless Chromium, padrão indústria |
| Onde roda | Local (pre-push hook) | Sem CI necessário; feedback imediato |
| BaseURL | `file:///` local | Sem servidor HTTP; testa os arquivos diretamente |
| Browser | Chromium apenas | Site não tem multi-browser requirements |
| npm scope | devDependencies | Vercel ignora para sites estáticos |

## Estrutura de arquivos

```
site vic duarte/
├── tests/
│   ├── navigation.spec.js      # Links internos + navbar
│   ├── html-integrity.spec.js  # Tags malformadas, texto visível
│   └── behavior.spec.js        # JS: back-to-top, modais, lazy-load
├── playwright.config.js         # baseURL, browser, reporter
├── package.json                 # devDependencies: @playwright/test
├── .gitignore                   # node_modules/, test-results/, playwright-report/
└── .git/hooks/pre-push          # Hook que bloqueia push se testes falharem
```

## Suites de teste

### 1. navigation.spec.js

**Propósito:** garantir que todas as páginas abrem e que a navegação funciona.

Testes por página (loop nas 8 páginas):
- Página abre sem erro de JS no console
- `<title>` não está vazio
- Navbar está presente (`nav.navbar`)
- Todos os links do navbar (`nav a[href]`) resolvem para arquivos `.html` que existem no disco
- Nenhum link interno com `href="#"` sem `data-bs-toggle` associado (dead links)

### 2. html-integrity.spec.js

**Propósito:** detectar bugs de markup que geram texto visível ou comportamento errado.

Testes por página:
- `body.innerText` não contém `/h1>`, `/h2>`, `/h3>`, `/h4>`, `/h5>`, `/h6>`, `/p>` (texto de tag escapado)
- `<meta name="description">` presente e não vazia
- Não há mais de 1 `<header>`, 1 `<footer>`, 1 `<main>` por página
- Footer contém o ano `2026` (não `2025`)
- Hero `<img>` com classe `hero-logo` não tem classe `lazy-img`
- `.icon-box-modern` tem `border-radius` resolvido como `20px` (não `50%`) — valida que o CSS duplicado foi corrigido

### 3. behavior.spec.js

**Propósito:** garantir que o JavaScript funciona corretamente.

Testes:
- **Back-to-top:** `#backToTop` não tem classe `show` no load; após `window.scrollTo(0, 500)` tem classe `show`; após click retorna ao topo
- **Modal de download** (index.html, livro.html): clicar no botão de download abre modal; `[data-bs-dismiss="modal"]` fecha o modal
- **Lazy-load:** imagens com `data-src` abaixo do fold não têm `src` igual ao `data-src` antes de entrar no viewport; após scroll têm `src` preenchido
- **Navbar scroll:** após scroll de 100px, `.navbar` tem classe `scrolled` ou `navbar-scrolled`

## Comandos

```bash
npm test                   # roda todas as suites
npm run test:nav           # só navegação
npm run test:html          # só integridade HTML  
npm run test:behavior      # só comportamento JS
npm run test:report        # abre HTML report do último run
```

## Pre-push hook

Arquivo: `.git/hooks/pre-push`

```bash
#!/bin/sh
npm test
if [ $? -ne 0 ]; then
  echo "❌ Testes falharam. Push bloqueado. Use --no-verify para forçar."
  exit 1
fi
```

Push pode ser forçado com `git push --no-verify` em emergência.

## Dependências

Os testes de `html-integrity.spec.js` para `.icon-box-modern` e hero lazy-load **falharão intencionalmente** até que os bugs listados no CLAUDE.md sejam corrigidos. Isso é esperado — os testes servem como verificação de que a correção foi aplicada. Os demais testes passam no estado atual do código.

## Critérios de sucesso

- `npm test` passa com 0 falhas no estado atual do site (após corrigir os bugs conhecidos)
- Cada bug do relatório UX/UI tem ao menos 1 teste que o teria detectado
- Hook bloqueia push quando um teste falha
- Tempo de execução total < 60 segundos

## Fora do escopo

- Testes visuais de regressão (screenshots diff) — custo/benefício baixo para site estático
- CI/CD no GitHub Actions — pode ser adicionado futuramente
- Testes multi-browser (Firefox, Safari)
- Testes de performance/Lighthouse (já cobertos pelo agente UX/UI sob demanda)
