import { test, expect } from '@playwright/test';
import { parseInput, validateItem, verifyAuth, classifyGeminiError, logGenerationEvent, reorderOptionsByLength, COURSES } from '../api/generate-professor-enade.js';
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

  test('aceita encomenda de Engenharia de Produção (Portaria 163/2026)', () => {
    const parsed = parseInput({ ...requestInput, course: 'engenharia-producao', knowledgeObject: 'Pesquisa operacional' });
    expect(parsed.course).toBe('engenharia-producao');
    expect(parsed.knowledgeObject).toBe('Pesquisa operacional');
  });

  test('Engenharia de Produção tem 20 objetos e habilidades I.1–I.6 e II.1–II.5', () => {
    expect(COURSES['engenharia-producao'].knowledgeObjects).toHaveLength(20);
    expect(COURSES['engenharia-producao'].skillCodes).toEqual(['I.1', 'I.2', 'I.3', 'I.4', 'I.5', 'I.6', 'II.1', 'II.2', 'II.3', 'II.4', 'II.5']);
  });

  test('rejeita objeto de conhecimento de outro curso', () => {
    expect(() => parseInput({ ...requestInput, course: 'engenharia-producao', knowledgeObject: 'Construção civil' })).toThrow();
  });

  test('aprova questão objetiva válida e bloqueia comando negativo', () => {
    expect(validateItem(generatedItem, requestInput)).toEqual([]);
    const invalid = { ...generatedItem, command: 'Selecione a alternativa que não representa a melhor ação.' };
    expect(validateItem(invalid, requestInput).some(issue => issue.includes('negativo'))).toBe(true);
  });
});

test.describe('reorderOptionsByLength', () => {
  test('reordena opções da maior para a menor e realinha gabarito e justificativas', () => {
    const item = {
      options: [
        { letter: 'A', text: 'curta' },
        { letter: 'B', text: 'a mais longa de todas as opções aqui' },
        { letter: 'C', text: 'média mais ou menos' },
        { letter: 'D', text: 'bem curtinha' },
        { letter: 'E', text: 'penúltima em tamanho de texto aqui ó' },
      ],
      correctAnswer: 'A',
      justifications: [
        { letter: 'A', status: 'CORRETA', rationale: 'Era a certa, curta mesmo.' },
        { letter: 'B', status: 'INCORRETA', rationale: 'Longa mas errada.' },
        { letter: 'C', status: 'INCORRETA', rationale: 'Média e errada.' },
        { letter: 'D', status: 'INCORRETA', rationale: 'Curtinha e errada.' },
        { letter: 'E', status: 'INCORRETA', rationale: 'Penúltima e errada.' },
      ],
    };

    const result = reorderOptionsByLength(item);

    expect(result.options.map(option => option.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.options.map(option => option.text)).toEqual([
      'a mais longa de todas as opções aqui',
      'penúltima em tamanho de texto aqui ó',
      'média mais ou menos',
      'bem curtinha',
      'curta',
    ]);
    for (let i = 0; i < result.options.length - 1; i++) {
      expect(result.options[i].text.length).toBeGreaterThanOrEqual(result.options[i + 1].text.length);
    }

    expect(result.correctAnswer).toBe('E');
    expect(result.justifications.map(entry => entry.letter)).toEqual(['A', 'B', 'C', 'D', 'E']);
    const correctJustification = result.justifications.find(entry => entry.status === 'CORRETA');
    expect(correctJustification.letter).toBe('E');
    expect(correctJustification.rationale).toBe('Era a certa, curta mesmo.');
  });

  test('mantém a ordem original em caso de empate de tamanho (sort estável)', () => {
    const item = {
      options: [
        { letter: 'A', text: 'xxxxx' },
        { letter: 'B', text: 'yyyyy' },
        { letter: 'C', text: 'zzzzzzzzzz' },
        { letter: 'D', text: 'wwwww' },
        { letter: 'E', text: 'vvvvv' },
      ],
      correctAnswer: 'D',
      justifications: [
        { letter: 'A', status: 'INCORRETA', rationale: 'a' },
        { letter: 'B', status: 'INCORRETA', rationale: 'b' },
        { letter: 'C', status: 'INCORRETA', rationale: 'c' },
        { letter: 'D', status: 'CORRETA', rationale: 'd' },
        { letter: 'E', status: 'INCORRETA', rationale: 'e' },
      ],
    };

    const result = reorderOptionsByLength(item);
    expect(result.options.map(option => option.text)).toEqual(['zzzzzzzzzz', 'xxxxx', 'yyyyy', 'wwwww', 'vvvvv']);
    expect(result.correctAnswer).toBe('D');
  });

  test('não altera itens sem 5 opções (ex.: item discursivo)', () => {
    const item = { itemType: 'Discursiva', expectedAnswer: 'texto' };
    expect(reorderOptionsByLength(item)).toBe(item);
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
    expect(result).toEqual({ ok: true, uid: 'u1', email: 'Prof@Unichristus.edu.br' });
  });
});

test.describe('classifyGeminiError', () => {
  test('não classifica erros que não são 429', () => {
    expect(classifyGeminiError(500, { error: { message: 'Erro interno' } })).toBeNull();
    expect(classifyGeminiError(400, { error: { message: 'Requisição inválida' } })).toBeNull();
  });

  test('classifica 429 com violação "PerDay" como limite diário', () => {
    const data = {
      error: {
        message: 'You exceeded your current quota',
        details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }],
      },
    };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador atingiu o limite diário gratuito de uso. Tente novamente amanhã.',
    });
  });

  test('classifica 429 cuja mensagem menciona "per day" como limite diário', () => {
    const data = { error: { message: 'Quota exceeded for quota metric requests per day.' } };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador atingiu o limite diário gratuito de uso. Tente novamente amanhã.',
    });
  });

  test('classifica 429 sem indicação de "dia" como sobrecarga temporária', () => {
    const data = {
      error: {
        message: 'You exceeded your current quota',
        details: [{ violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] }],
      },
    };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
    });
  });

  test('classifica 429 sem detalhes nenhum como sobrecarga temporária', () => {
    expect(classifyGeminiError(429, {})).toEqual({
      status: 503,
      message: 'O gerador está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
    });
  });

  test('prioriza retryDelay curto sobre quotaId "PerDay" (caso real de produção)', () => {
    const data = {
      error: {
        message: 'You exceeded your current quota, please check your plan and billing details. '
          + 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, '
          + 'limit: 20, model: gemini-3.6-flash. Please retry in 57.342290859s.',
        details: [
          { violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '57.342290859s' },
        ],
      },
    };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador atingiu um limite temporário de uso. Aguarde 58s e tente novamente.',
    });
  });

  test('mantém mensagem de limite diário quando retryDelay é longo mesmo com quotaId "PerDay"', () => {
    const data = {
      error: {
        message: 'You exceeded your current quota',
        details: [
          { violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '18000s' },
        ],
      },
    };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador atingiu o limite diário gratuito de uso. Tente novamente amanhã.',
    });
  });

  test('extrai retryDelay via regex na mensagem quando não há RetryInfo estruturado', () => {
    const data = { error: { message: 'You exceeded your current quota. Please retry in 12.5s.' } };
    expect(classifyGeminiError(429, data)).toEqual({
      status: 503,
      message: 'O gerador atingiu um limite temporário de uso. Aguarde 13s e tente novamente.',
    });
  });
});

test.describe('logGenerationEvent', () => {
  test('grava o evento com os campos esperados', async () => {
    const calls = [];
    const ok = await logGenerationEvent(
      async data => { calls.push(data); },
      { uid: 'u1', email: 'prof@unichristus.edu.br', curso: 'engenharia-civil', tipoItem: 'multiple-choice' },
    );
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      uid: 'u1',
      email: 'prof@unichristus.edu.br',
      curso: 'engenharia-civil',
      tipoItem: 'multiple-choice',
    });
  });

  test('nao propaga erro se a escrita falhar — a geracao deve seguir normalmente', async () => {
    const ok = await logGenerationEvent(
      async () => { throw new Error('Firestore indisponível'); },
      { uid: 'u1', email: 'prof@unichristus.edu.br', curso: 'engenharia-civil', tipoItem: 'multiple-choice' },
    );
    expect(ok).toBe(false);
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

  test('curso Engenharia de Produção habilita seus objetos de conhecimento', async ({ page }) => {
    const card = page.locator('[data-course="engenharia-producao"]');
    await expect(card).toBeEnabled();
    await card.click();
    await page.locator('[data-item-type="multiple-choice"]').click();
    const select = page.locator('#knowledge-object');
    await expect(select.locator('option', { hasText: 'Pesquisa operacional' })).toHaveCount(1);
    await select.selectOption('Pesquisa operacional');
    await expect(page.locator('#enade-generate')).toBeEnabled();
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

test.describe('Painel administrativo na mesma página', () => {
  test('professor comum não vê o botão de painel administrativo', async ({ page }) => {
    await page.route('**/api/admin-metrics', route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Acesso restrito a administradores.' }),
    }));
    await page.goto('/professor-enade.html');
    await loginAsVerifiedProfessor(page);
    await expect(page.locator('#enade-admin-toggle')).toBeHidden();
  });

  test('admin vê o botão e alterna entre gerador e painel sem sair da página', async ({ page }) => {
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
    await page.goto('/professor-enade.html');
    await loginAsVerifiedProfessor(page, 'admin@unichristus.edu.br');

    const toggle = page.locator('#enade-admin-toggle');
    await expect(toggle).toBeVisible();
    await expect(page.locator('#enade-workspace-content')).toBeVisible();
    await expect(page.locator('#enade-admin-panel')).toBeHidden();

    await toggle.click();
    await expect(page.locator('#enade-admin-panel')).toBeVisible();
    await expect(page.locator('#enade-workspace-content')).toBeHidden();
    await expect(page.locator('#admin-total')).toHaveText('12');
    await expect(page.locator('#admin-por-professor li')).toHaveCount(1);
    await expect(page.locator('#admin-por-curso li')).toHaveCount(2);
    await expect(toggle).toHaveText('Voltar ao gerador');

    await toggle.click();
    await expect(page.locator('#enade-workspace-content')).toBeVisible();
    await expect(page.locator('#enade-admin-panel')).toBeHidden();
    await expect(toggle).toHaveText('Painel administrativo');
  });
});
