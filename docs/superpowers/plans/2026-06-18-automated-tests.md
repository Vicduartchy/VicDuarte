# Automated Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar testes Playwright que rodam localmente antes de cada `git push` e verificam links, integridade de HTML e comportamento JS em todas as 8 páginas do site.

**Architecture:** Playwright com Chromium headless serve o site localmente via `serve` na porta 3000 (integrado ao `playwright.config.js`). Três suites independentes por domínio. Pre-push git hook bloqueia push se qualquer teste falhar.

**Tech Stack:** `@playwright/test` ^1.48, `serve` ^14.2, Node.js (apenas devDependencies — Vercel ignora para sites estáticos)

## Global Constraints

- Apenas Chromium — sem multi-browser
- baseURL: `http://localhost:3000` (via `serve`)
- Nenhuma modificação nos arquivos HTML/CSS/JS do site neste plano — testes só leem
- Alguns testes falharão até os bugs do CLAUDE.md serem corrigidos (esperado)
- Comandos executados de dentro de `/Users/vicduarte/site vic duarte/`

---

### Task 1: Setup — package.json, playwright.config.js, .gitignore

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm test` funcional; `baseURL = http://localhost:3000`; servidor sobe automaticamente nos testes

- [ ] **Step 1: Criar package.json**

```json
{
  "name": "vic-duarte-site",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:nav": "playwright test navigation",
    "test:html": "playwright test html-integrity",
    "test:behavior": "playwright test behavior",
    "test:report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "serve": "^14.2.0"
  }
}
```

Salvar em: `package.json`

- [ ] **Step 2: Criar playwright.config.js**

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx serve . -p 3000 -s',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 10000,
  },
});
```

Salvar em: `playwright.config.js`

- [ ] **Step 3: Atualizar .gitignore**

Criar `.gitignore` se não existir, ou adicionar ao existente:

```
node_modules/
test-results/
playwright-report/
.playwright/
```

- [ ] **Step 4: Instalar dependências e browser**

```bash
npm install
npx playwright install chromium
```

Saída esperada: Playwright instalado, Chromium baixado (~150MB).

- [ ] **Step 5: Verificar que o servidor sobe**

```bash
npx serve . -p 3000 -s &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/index.html
kill %1
```

Saída esperada: `200`

- [ ] **Step 6: Commit**

```bash
git add package.json playwright.config.js .gitignore
git commit -m "chore: configurar Playwright e serve para testes automatizados"
```

---

### Task 2: navigation.spec.js — Links e navbar

**Files:**
- Create: `tests/navigation.spec.js`

**Interfaces:**
- Consumes: `baseURL = http://localhost:3000` do playwright.config.js
- Produces: testes que verificam que todas as páginas abrem e todos os links do navbar existem

- [ ] **Step 1: Criar tests/navigation.spec.js**

```javascript
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  'index.html',
  'consultorias.html',
  'disciplinas.html',
  'livro.html',
  'download-livro.html',
  'palestras.html',
  'publicacoes.html',
  'ferramentas.html',
];

for (const pageName of PAGES) {
  test(`${pageName}: abre sem erro de JS`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(`/${pageName}`);
    expect(errors, `Erros JS em ${pageName}: ${errors.join(', ')}`).toHaveLength(0);
  });

  test(`${pageName}: title não está vazio`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const title = await page.title();
    expect(title.trim().length, `<title> vazio em ${pageName}`).toBeGreaterThan(0);
  });

  test(`${pageName}: navbar está visível`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    await expect(page.locator('nav.navbar')).toBeVisible();
  });

  test(`${pageName}: links do navbar resolvem para arquivos existentes`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const hrefs = await page.locator('nav.navbar a[href]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );
    for (const href of hrefs) {
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) continue;
      const cleanPath = href.split('?')[0].split('#')[0];
      const filePath = path.join(ROOT, cleanPath);
      expect(fs.existsSync(filePath), `Link do navbar não encontrado: ${href} (em ${pageName})`).toBe(true);
    }
  });
}

test('nenhuma página tem links href="#" sem data-bs-toggle', async ({ page }) => {
  for (const pageName of PAGES) {
    await page.goto(`/${pageName}`);
    const deadLinks = await page.locator('a[href="#"]:not([data-bs-toggle])').count();
    expect(deadLinks, `${pageName}: ${deadLinks} links mortos sem modal associado`).toBe(0);
  }
});
```

- [ ] **Step 2: Rodar e verificar que os testes de estrutura passam**

```bash
npm run test:nav
```

Saída esperada: a maioria passa; o teste de "links mortos" falha nas páginas que têm `href="#"` sem modal. Anote quais falham — são bugs a corrigir.

- [ ] **Step 3: Commit**

```bash
git add tests/navigation.spec.js
git commit -m "test: adicionar suite de navegação e links do navbar"
```

---

### Task 3: html-integrity.spec.js — Integridade do markup

**Files:**
- Create: `tests/html-integrity.spec.js`

**Interfaces:**
- Consumes: `baseURL = http://localhost:3000`
- Produces: testes que detectam texto de tag vazado, meta description ausente, copyright errado, hero lazy-load indevido

- [ ] **Step 1: Criar tests/html-integrity.spec.js**

```javascript
import { test, expect } from '@playwright/test';

const PAGES = [
  'index.html',
  'consultorias.html',
  'disciplinas.html',
  'livro.html',
  'download-livro.html',
  'palestras.html',
  'publicacoes.html',
  'ferramentas.html',
];

const TAG_LEAK = /\/h[1-6]>|\/p>|\/div>|\/span>|\/li>|\/a>/;

for (const pageName of PAGES) {
  test(`${pageName}: sem texto de tag vazado`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const bodyText = await page.locator('body').innerText();
    expect(
      TAG_LEAK.test(bodyText),
      `Texto de tag HTML vazado encontrado em ${pageName}:\n${
        bodyText.split('\n').filter(l => TAG_LEAK.test(l)).join('\n')
      }`
    ).toBe(false);
  });

  test(`${pageName}: meta description presente e não vazia`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const content = await page.locator('meta[name="description"]').getAttribute('content');
    expect(content, `Meta description ausente ou vazia em ${pageName}`).toBeTruthy();
    expect(content.trim().length).toBeGreaterThan(10);
  });

  test(`${pageName}: footer contém copyright 2026`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const footerText = await page.locator('footer').innerText();
    expect(footerText, `Copyright desatualizado em ${pageName}`).toContain('2026');
  });

  test(`${pageName}: estrutura única (1 footer, máx 1 header)`, async ({ page }) => {
    await page.goto(`/${pageName}`);
    const footers = await page.locator('footer').count();
    const headers = await page.locator('header').count();
    expect(footers, `${pageName}: mais de 1 footer`).toBe(1);
    expect(headers, `${pageName}: mais de 1 header`).toBeLessThanOrEqual(1);
  });
}

test('index.html: hero logo não usa lazy-load (acima do fold)', async ({ page }) => {
  await page.goto('/index.html');
  const heroLogo = page.locator('img.hero-logo');
  const classes = await heroLogo.getAttribute('class') ?? '';
  expect(classes, 'Hero logo não deve ter classe lazy-img').not.toContain('lazy-img');
});

test('index.html: sem definição duplicada de icon-box-modern com border-radius 50%', async ({ page }) => {
  await page.goto('/index.html');
  const borderRadius = await page.evaluate(() => {
    const el = document.querySelector('.icon-box-modern');
    if (!el) return null;
    return window.getComputedStyle(el).borderRadius;
  });
  if (borderRadius !== null) {
    expect(borderRadius, '.icon-box-modern não deve ser círculo (50%)').not.toBe('50%');
  }
});
```

- [ ] **Step 2: Rodar e documentar falhas esperadas**

```bash
npm run test:html
```

Saída esperada: testes de "texto de tag vazado" falham em `index.html` e `publicacoes.html`; testes de meta description falham em todas as páginas; copyright falha em todas. São bugs conhecidos — os testes estão corretos.

- [ ] **Step 3: Commit**

```bash
git add tests/html-integrity.spec.js
git commit -m "test: adicionar suite de integridade do markup HTML"
```

---

### Task 4: behavior.spec.js — Comportamento JavaScript

**Files:**
- Create: `tests/behavior.spec.js`

**Interfaces:**
- Consumes: `baseURL = http://localhost:3000`; `#backToTop` em todas as páginas; `#downloadModal` em `index.html` e `livro.html`; classe `navbar-scrolled` adicionada pelo `main.js` após `scrollY > 50`
- Produces: testes que detectam back-to-top sem handler, modal quebrado, navbar scroll sem efeito

- [ ] **Step 1: Criar tests/behavior.spec.js**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Back-to-Top', () => {
  test('invisível no topo da página', async ({ page }) => {
    await page.goto('/index.html');
    const btn = page.locator('#backToTop');
    await expect(btn).toBeAttached();
    const classes = await btn.getAttribute('class') ?? '';
    expect(classes, '#backToTop não deve ter classe "show" no topo').not.toContain('show');
  });

  test('visível após scroll de 500px', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(400);
    const btn = page.locator('#backToTop');
    const classes = await btn.getAttribute('class') ?? '';
    expect(classes, '#backToTop deve ter classe "show" após scroll').toContain('show');
  });

  test('volta ao topo ao clicar', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(400);
    await page.locator('#backToTop').click({ force: true });
    await page.waitForTimeout(700);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY, 'Página deve retornar ao topo após clique').toBe(0);
  });
});

test.describe('Modal de Download', () => {
  for (const pageName of ['index.html', 'livro.html']) {
    test(`${pageName}: modal abre ao clicar no botão`, async ({ page }) => {
      await page.goto(`/${pageName}`);
      await page.locator('[data-bs-target="#downloadModal"]').first().click();
      await expect(page.locator('#downloadModal')).toBeVisible({ timeout: 3000 });
    });

    test(`${pageName}: modal fecha com botão X`, async ({ page }) => {
      await page.goto(`/${pageName}`);
      await page.locator('[data-bs-target="#downloadModal"]').first().click();
      await expect(page.locator('#downloadModal')).toBeVisible({ timeout: 3000 });
      await page.locator('#downloadModal [data-bs-dismiss="modal"]').click();
      await expect(page.locator('#downloadModal')).not.toBeVisible({ timeout: 3000 });
    });
  }
});

test.describe('Navbar Scroll', () => {
  test('sem classe navbar-scrolled no topo', async ({ page }) => {
    await page.goto('/index.html');
    const navbar = page.locator('nav.navbar');
    const classes = await navbar.getAttribute('class') ?? '';
    expect(classes).not.toContain('navbar-scrolled');
  });

  test('com classe navbar-scrolled após scroll de 100px', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(300);
    const navbar = page.locator('nav.navbar');
    await expect(navbar).toHaveClass(/navbar-scrolled/);
  });
});

test.describe('Lazy Load de Imagens', () => {
  test('imagens com data-src carregam ao entrar no viewport', async ({ page }) => {
    await page.goto('/index.html');
    // Pega a primeira imagem lazy abaixo do fold
    const lazyImg = page.locator('img[data-src]:not(.hero-logo)').first();
    const count = await lazyImg.count();
    if (count === 0) return; // sem imagens lazy, teste não aplicável
    
    // Antes do scroll: src pode ser placeholder ou igual ao data-src (bootstrap de src)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    
    // Após scroll até o fim: todas as imagens lazy devem ter sido carregadas (classe loaded)
    const unloaded = await page.locator('img[data-src]:not(.loaded):not(.hero-logo)').count();
    expect(unloaded, `${unloaded} imagens lazy não carregaram após scroll`).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e documentar resultados**

```bash
npm run test:behavior
```

Saída esperada: testes de Back-to-Top "visível após scroll" e "volta ao topo" **falham** (bug conhecido — handler não existe em `main.js`). Testes de modal e navbar **passam**.

- [ ] **Step 3: Commit**

```bash
git add tests/behavior.spec.js
git commit -m "test: adicionar suite de comportamento JS (back-to-top, modal, navbar)"
```

---

### Task 5: Pre-push git hook

**Files:**
- Create: `.git/hooks/pre-push` (não commitado — hooks ficam locais)

**Interfaces:**
- Consumes: `npm test` do package.json
- Produces: hook que bloqueia `git push` se algum teste falhar; `git push --no-verify` ignora o hook em emergência

- [ ] **Step 1: Criar o hook**

```bash
cat > .git/hooks/pre-push << 'EOF'
#!/bin/sh
echo "🧪 Rodando testes antes do push..."
npm test
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Testes falharam. Push bloqueado."
  echo "   Use 'git push --no-verify' para forçar (não recomendado)."
  exit 1
fi
echo "✅ Todos os testes passaram. Push liberado."
EOF
chmod +x .git/hooks/pre-push
```

- [ ] **Step 2: Verificar que o hook está executável**

```bash
ls -la .git/hooks/pre-push
```

Saída esperada: `-rwxr-xr-x` (com `x` de executável)

- [ ] **Step 3: Testar o hook manualmente**

```bash
.git/hooks/pre-push
```

Saída esperada: testes rodam; saída mostra quais passam e quais falham; exit code 1 se houver falhas.

- [ ] **Step 4: Commitar documentação do hook no README ou CLAUDE.md**

Adicionar ao `CLAUDE.md` na seção de CI/CD:

```markdown
## Testes

```bash
npm test              # roda todos os testes
npm run test:nav      # só navegação e links
npm run test:html     # só integridade HTML
npm run test:behavior # só comportamento JS
npm run test:report   # abre relatório HTML do último run
```

O pre-push hook bloqueia `git push` se testes falharem.
Use `git push --no-verify` para forçar em emergência.

**Testes que falham intencionalmente** (bugs conhecidos a corrigir):
- back-to-top visível após scroll (handler ausente em main.js)
- meta description ausente em todas as páginas
- copyright 2025 → 2026
- tags HTML malformadas em index.html e publicacoes.html
```

```bash
git add CLAUDE.md
git commit -m "docs: documentar comandos de teste e pre-push hook no CLAUDE.md"
```
