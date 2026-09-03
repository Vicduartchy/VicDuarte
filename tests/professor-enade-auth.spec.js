import { test, expect } from '@playwright/test';
import { isAllowedDomain, mapAuthError } from '../static/js/professor-enade-auth-helpers.js';

test.describe('isAllowedDomain', () => {
  test('aceita e-mail @unichristus.edu.br', () => {
    expect(isAllowedDomain('professor@unichristus.edu.br')).toBe(true);
  });

  test('aceita variações de maiúsculas/minúsculas', () => {
    expect(isAllowedDomain('Professor@Unichristus.Edu.Br')).toBe(true);
  });

  test('rejeita outros domínios', () => {
    expect(isAllowedDomain('professor@gmail.com')).toBe(false);
  });

  test('rejeita valores vazios ou não-string', () => {
    expect(isAllowedDomain('')).toBe(false);
    expect(isAllowedDomain(undefined)).toBe(false);
  });
});

test.describe('mapAuthError', () => {
  test('traduz códigos conhecidos do Firebase Auth', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' })).toBe('Esse e-mail já tem uma conta cadastrada.');
    expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha incorretos.');
    expect(mapAuthError({ code: 'auth/weak-password' })).toBe('A senha precisa ter pelo menos 6 caracteres.');
  });

  test('usa mensagem genérica para código desconhecido', () => {
    expect(mapAuthError({ code: 'auth/algo-novo' })).toBe('Não deu certo. Tente de novo.');
  });
});
