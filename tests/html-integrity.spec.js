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
