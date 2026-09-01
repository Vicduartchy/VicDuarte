import { test, expect } from '@playwright/test';
import { parseInput, validateItem } from '../api/generate-enade.js';

const requestInput = {
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
  model: 'gemini-2.5-flash',
  generatedAt: Date.now(),
  validation: { passed: true, checks: 9, message: 'Item aprovado pelo validador estrutural e editorial.' },
};

test.describe('Contrato do Gerador ENADE', () => {
  test('aceita uma encomenda completa e sanitiza o tema', () => {
    const parsed = parseInput({ ...requestInput, subject: '  Last Planner System  ' });
    expect(parsed.subject).toBe('Last Planner System');
    expect(parsed.knowledgeObject).toBe('Construção civil');
  });

  test('rejeita encomenda sem as duas definições obrigatórias', () => {
    expect(() => parseInput({ bloomLevel: 'Analisar', difficulty: 'Média' })).toThrow('tipo de item');
  });

  test('aprova questão objetiva válida e bloqueia comando negativo', () => {
    expect(validateItem(generatedItem, requestInput)).toEqual([]);
    const invalid = { ...generatedItem, command: 'Selecione a alternativa que não representa a melhor ação.' };
    expect(validateItem(invalid, requestInput).some(issue => issue.includes('negativo'))).toBe(true);
  });
});

test.describe('Página do Gerador ENADE', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/generate-enade', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse),
    }));
    await page.goto('/gerador-enade.html');
  });

  test('mantém a geração bloqueada até tipo e objeto serem informados', async ({ page }) => {
    const select = page.locator('#knowledge-object');
    const generate = page.locator('#enade-generate');
    await expect(select).toBeDisabled();
    await expect(generate).toBeDisabled();

    await page.locator('[data-item-type="multiple-choice"]').click();
    await expect(select).toBeEnabled();
    await expect(generate).toBeDisabled();

    await select.selectOption('Construção civil');
    await expect(generate).toBeEnabled();
    await expect(page.locator('#enade-refinement')).toBeVisible();
  });

  test('gera, revisa e navega entre item, gabarito e auditoria', async ({ page }) => {
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

  test('permanece responsiva sem rolagem horizontal em celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('h1#enade-title')).toBeVisible();
  });
});
