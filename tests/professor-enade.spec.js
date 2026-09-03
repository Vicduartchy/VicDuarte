import { test, expect } from '@playwright/test';
import { parseInput, validateItem, verifyAuth } from '../api/generate-professor-enade.js';
import { mockFirebaseAuth, loginAsVerifiedProfessor } from './helpers/mock-firebase-auth.js';

const requestInput = {
  course: 'engenharia-civil',
  itemType: 'multiple-choice',
  knowledgeObject: 'Construção civil',
  subject: 'Last Planner System',
  bloomLevel: 'Analisar',
  difficulty: 'Média',
};

const generatedItem = {
  itemType: 'Múltipla Escolha',
  title: 'Planejamento semanal com Last Planner System',
  metadata: {
    competence: 'II',
    skillCode: 'II.3',
    skillDescription: 'Aplicar conceitos de gestão em obras, serviços e estudos.',
    bloomLevel: 'Analisar',
    difficulty: 'Média',
    knowledgeObject: 'Construção civil',
    subject: 'Last Planner System',
    estimatedMinutes: 6,
  },
  baseText: 'Uma construtora acompanha semanalmente o Percentual de Planos Concluídos e as causas de não cumprimento dos pacotes de trabalho.',
  command: 'Com base nos indicadores apresentados, selecione a ação gerencial que melhor estabiliza o fluxo de produção da obra.',
  options: [
    { letter: 'A', text: 'Ampliar todos os lotes de trabalho e reduzir a frequência de acompanhamento.' },
    { letter: 'B', text: 'Iniciar novas frentes antes da remoção das restrições de projeto e suprimentos.' },
    { letter: 'C', text: 'Tratar as causas recorrentes e liberar apenas pacotes sem restrições para o plano semanal.' },
    { letter: 'D', text: 'Substituir o planejamento colaborativo por controles mensais de maior abrangência.' },
    { letter: 'E', text: 'Elevar o trabalho em processo para manter todas as equipes continuamente ocupadas.' },
  ],
  correctAnswer: 'C',
  justifications: [
    { letter: 'A', status: 'INCORRETA', rationale: 'Amplia lotes e reduz a cadência de aprendizagem.' },
    { letter: 'B', status: 'INCORRETA', rationale: 'Insere tarefas sem condição de execução.' },
    { letter: 'C', status: 'CORRETA', rationale: 'Relaciona aprendizagem, remoção de restrições e compromisso confiável.' },
    { letter: 'D', status: 'INCORRETA', rationale: 'Remove o controle colaborativo de curto prazo.' },
    { letter: 'E', status: 'INCORRETA', rationale: 'Aumenta o trabalho em processo e a variabilidade.' },
  ],
  qualityAudit: Array.from({ length: 6 }, (_, index) => ({ rule: `Regra editorial ${index + 1}`, passed: true, evidence: 'Regra atendida no item.' })),
};

const apiResponse = {
  item: generatedItem,
  model: 'gemini-3.6-flash',
  generatedAt: Date.now(),
  validation: { passed: true, checks: 9, message: 'Item aprovado pelo validador estrutural e editorial.' },
};

test.describe('Contrato do PROFESSOR-ENADE', () => {
  test('aceita uma encomenda completa e sanitiza o tema', () => {
    const parsed = parseInput({ ...requestInput, subject: '  Last Planner System  ' });
    expect(parsed.subject).toBe('Last Planner System');
    expect(parsed.knowledgeObject).toBe('Construção civil');
  });

  test('rejeita encomenda sem curso ou tipo de item', () => {
    expect(() => parseInput({ bloomLevel: 'Analisar', difficulty: 'Média' })).toThrow('curso');
    expect(() => parseInput({ course: 'engenharia-civil', bloomLevel: 'Analisar', difficulty: 'Média' })).toThrow('tipo de item');
  });

  test('rejeita curso desabilitado (Engenharia de Produção)', () => {
    expect(() => parseInput({ ...requestInput, course: 'engenharia-producao' })).toThrow('curso');
  });

  test('aprova questão objetiva válida e bloqueia comando negativo', () => {
    expect(validateItem(generatedItem, requestInput)).toEqual([]);
    const invalid = { ...generatedItem, command: 'Selecione a alternativa que não representa a melhor ação.' };
    expect(validateItem(invalid, requestInput).some(issue => issue.includes('negativo'))).toBe(true);
  });
});

test.describe('verifyAuth', () => {
  test('rejeita requisição sem header Authorization', async () => {
    const result = await verifyAuth({ headers: {} }, async () => ({}));
    expect(result).toEqual({ ok: false, status: 401, error: 'Login necessário.' });
  });

  test('rejeita token inválido ou expirado', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => { throw new Error('token inválido'); },
    );
    expect(result).toEqual({ ok: false, status: 401, error: 'Sessão expirada. Faça login novamente.' });
  });

  test('rejeita e-mail não verificado', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => ({ uid: 'u1', email: 'prof@unichristus.edu.br', email_verified: false }),
    );
    expect(result).toEqual({ ok: false, status: 403, error: 'Confirme seu e-mail antes de gerar questões.' });
  });

  test('rejeita domínio fora da Unichristus', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => ({ uid: 'u1', email: 'prof@gmail.com', email_verified: true }),
    );
    expect(result).toEqual({ ok: false, status: 403, error: 'Acesso restrito a e-mails da Unichristus.' });
  });

  test('aceita e-mail Unichristus verificado, ignorando maiúsculas', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => ({ uid: 'u1', email: 'Prof@Unichristus.edu.br', email_verified: true }),
    );
    expect(result).toEqual({ ok: true, uid: 'u1' });
  });
});

test.describe('Página do PROFESSOR-ENADE', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/generate-professor-enade', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse),
    }));
    await page.goto('/professor-enade.html');
    await loginAsVerifiedProfessor(page);
  });

  test('mantém a geração bloqueada até curso, tipo e objeto serem informados', async ({ page }) => {
    const select = page.locator('#knowledge-object');
    const generate = page.locator('#enade-generate');
    await expect(select).toBeDisabled();
    await expect(generate).toBeDisabled();

    await page.locator('[data-course="engenharia-civil"]').click();
    await expect(page.locator('[data-item-type="multiple-choice"]')).toBeEnabled();

    await page.locator('[data-item-type="multiple-choice"]').click();
    await expect(select).toBeEnabled();
    await expect(generate).toBeDisabled();

    await select.selectOption('Construção civil');
    await expect(generate).toBeEnabled();
    await expect(page.locator('#enade-refinement')).toBeVisible();
  });

  test('gera, revisa e navega entre item, gabarito e auditoria', async ({ page }) => {
    await page.locator('[data-course="engenharia-civil"]').click();
    await page.locator('[data-item-type="multiple-choice"]').click();
    await page.locator('#knowledge-object').selectOption('Construção civil');
    await page.locator('#enade-generate').click();

    await expect(page.locator('#enade-output')).toBeVisible();
    await expect(page.locator('#output-title')).toContainText('Planejamento semanal');
    await expect(page.locator('.enade-option')).toHaveCount(5);

    await page.locator('[data-tab="answer"]').click();
    await expect(page.locator('.enade-answer-hero strong')).toHaveText('C');

    await page.locator('[data-tab="audit"]').click();
    await expect(page.locator('.enade-audit-row')).toHaveCount(6);
  });

  test('curso Engenharia de Produção aparece desabilitado (em construção)', async ({ page }) => {
    const card = page.locator('[data-course="engenharia-producao"]');
    await expect(card).toBeDisabled();
  });

  test('permanece responsiva sem rolagem horizontal em celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('h1#enade-title')).toBeVisible();
  });
});

test.describe('Gate de autenticação do PROFESSOR-ENADE', () => {
  test('esconde o Estúdio e mostra o login para visitante deslogado', async ({ page }) => {
    await page.goto('/professor-enade.html');
    await expect(page.locator('#enade-auth-form-wrap')).toBeVisible();
    await expect(page.locator('#enade-workspace-content')).toBeHidden();
  });

  test('bloqueia cadastro com e-mail fora do domínio Unichristus', async ({ page }) => {
    await page.goto('/professor-enade.html');
    await page.locator('#enade-auth-toggle').click();
    await page.locator('#enade-auth-email').fill('professor@gmail.com');
    await page.locator('#enade-auth-password').fill('senha123456');
    await page.locator('#enade-auth-submit').click();
    await expect(page.locator('#enade-auth-alert')).toContainText('@unichristus.edu.br');
    await expect(page.locator('#enade-workspace-content')).toBeHidden();
  });

  test('mostra a tela de confirmação para e-mail não verificado', async ({ page }) => {
    await page.goto('/professor-enade.html');
    await mockFirebaseAuth(page, { email: 'professor@unichristus.edu.br', verified: false });
    await page.locator('#enade-auth-email').fill('professor@unichristus.edu.br');
    await page.locator('#enade-auth-password').fill('senha123456');
    await page.locator('#enade-auth-submit').click();
    await expect(page.locator('#enade-auth-verify')).toBeVisible();
    await expect(page.locator('#enade-workspace-content')).toBeHidden();
  });

  test('permite logout e volta pro login', async ({ page }) => {
    await page.goto('/professor-enade.html');
    await loginAsVerifiedProfessor(page);
    await page.locator('#enade-user-signout').click();
    await expect(page.locator('#enade-auth-form-wrap')).toBeVisible();
    await expect(page.locator('#enade-workspace-content')).toBeHidden();
  });
});
