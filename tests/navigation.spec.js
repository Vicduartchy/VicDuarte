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
    page.on('pageerror', err => {
      // Filter out "Unexpected token '<'" errors from failed script loads (e.g., Vercel Analytics 404)
      if (err.message === "Unexpected token '<'") return;
      if (err.message.includes('/_vercel/') || err.stack?.includes('/_vercel/')) return;
      errors.push(err.message);
    });
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
