import { test, expect } from '@playwright/test';
import { checkIsAdmin, aggregateMetrics } from '../api/admin-metrics.js';

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
