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

    const lazyImgs = page.locator('img[data-src]:not(.hero-logo)');
    const count = await lazyImgs.count();
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      await lazyImgs.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
    }

    const unloaded = await page.locator('img[data-src]:not(.loaded):not(.hero-logo)').count();
    expect(unloaded, `${unloaded} imagens lazy não carregaram após scroll`).toBe(0);
  });
});
