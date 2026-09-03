import { test, expect } from '@playwright/test';
import { checkIsAdmin, aggregateMetrics } from '../api/admin-metrics.js';
import { loginAsVerifiedProfessor } from './helpers/mock-firebase-auth.js';

test.describe('checkIsAdmin', () => {
  test('true quando o doc admins/{uid} existe', async () => {
    const isAdmin = await checkIsAdmin('u1', async () => ({ exists: true }));
    expect(isAdmin).toBe(true);
  });

  test('false quando o doc nao existe', async () => {
    const isAdmin = await checkIsAdmin('u1', async () => ({ exists: false }));
    expect(isAdmin).toBe(false);
  });

  test('false se a consulta falhar', async () => {
    const isAdmin = await checkIsAdmin('u1', async () => { throw new Error('Firestore indisponível'); });
    expect(isAdmin).toBe(false);
  });
});

test.describe('aggregateMetrics', () => {
  const now = new Date('2026-09-03T12:00:00Z');
  const diasAtras = n => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  test('soma total, por professor e por curso', () => {
    const events = [
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(1) },
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(2) },
      { email: 'B@unichristus.edu.br', curso: 'arquitetura-urbanismo', criadoEm: diasAtras(1) },
    ];
    const result = aggregateMetrics(events, now);
    expect(result.total).toBe(3);
    expect(result.porProfessor).toEqual({ 'a@unichristus.edu.br': 2, 'b@unichristus.edu.br': 1 });
    expect(result.porCurso).toEqual({ 'engenharia-civil': 2, 'arquitetura-urbanismo': 1 });
  });

  test('separa ultimos 7 e 30 dias corretamente', () => {
    const events = [
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(1) },
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(10) },
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(40) },
    ];
    const result = aggregateMetrics(events, now);
    expect(result.total).toBe(3);
    expect(result.ultimos7Dias).toBe(1);
    expect(result.ultimos30Dias).toBe(2);
  });

  test('lista vazia devolve zeros', () => {
    expect(aggregateMetrics([], now)).toEqual({
      total: 0, porProfessor: {}, porCurso: {}, ultimos7Dias: 0, ultimos30Dias: 0,
    });
  });
});

test.describe('Página do painel administrativo', () => {
  test('usuário logado mas sem ser admin vê mensagem de restrição', async ({ page }) => {
    await page.route('**/api/admin-metrics', route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Acesso restrito a administradores.' }),
    }));
    await page.goto('/professor-enade-admin.html');
    await loginAsVerifiedProfessor(page);
    await expect(page.locator('#admin-restricted')).toBeVisible();
    await expect(page.locator('#admin-metrics-content')).toBeHidden();
  });

  test('admin vê as métricas renderizadas', async ({ page }) => {
    await page.route('**/api/admin-metrics', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 12,
        porProfessor: { 'prof@unichristus.edu.br': 12 },
        porCurso: { 'engenharia-civil': 8, 'arquitetura-urbanismo': 4 },
        ultimos7Dias: 5,
        ultimos30Dias: 12,
      }),
    }));
    await page.goto('/professor-enade-admin.html');
    await loginAsVerifiedProfessor(page, 'admin@unichristus.edu.br');
    await expect(page.locator('#admin-metrics-content')).toBeVisible();
    await expect(page.locator('#admin-total')).toHaveText('12');
    await expect(page.locator('#admin-7d')).toHaveText('5');
    await expect(page.locator('#admin-30d')).toHaveText('12');
    await expect(page.locator('#admin-por-professor li')).toHaveCount(1);
    await expect(page.locator('#admin-por-curso li')).toHaveCount(2);
  });
});
