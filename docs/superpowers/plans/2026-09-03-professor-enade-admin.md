# Painel Administrativo do PROFESSOR-ENADE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar cada geração aprovada em Firestore e expor um painel `professor-enade-admin.html` — visível só a quem estiver na coleção `admins` — com métricas de uso (total, por professor, por curso, últimos 7/30 dias).

**Architecture:** Firestore (Spark, novo no projeto) guarda os eventos de uso e a lista de admins. Um módulo compartilhado `api/_lib/firebase-admin.js` centraliza a inicialização do Admin SDK e `verifyAuth` (reaproveitado por `generate-professor-enade.js` e pelo novo `admin-metrics.js`). O cliente nunca toca o Firestore diretamente — regras negam tudo por padrão; toda leitura/escrita passa pelas funções serverless com Admin SDK.

**Tech Stack:** `firebase-admin/firestore` (já é parte da dependência `firebase-admin` já instalada), Playwright (testes existentes do repo).

**Spec:** `docs/superpowers/specs/2026-09-03-professor-enade-admin-design.md`

## Global Constraints

- Plano gratuito em tudo — Firestore Spark, sem cartão vinculado (CLAUDE.md). Se qualquer passo pedir cartão, parar e perguntar pra Vic.
- Cliente nunca lê/escreve Firestore diretamente — regras negam tudo (`allow read, write: if false`); só as funções serverless (Admin SDK) acessam.
- A escrita do evento de uso é **`await`ada** antes da resposta, e vive num **try/catch isolado** do try/catch da geração — falha ao gravar métrica nunca derruba a resposta 200 pro professor.
- Domínio `@unichristus.edu.br` e e-mail verificado continuam sendo pré-requisito de qualquer endpoint (herdado da auth já existente).
- Fluxo de git: branch → PR → CI (`Testes (Playwright)`) verde → merge. A branch `feat/professor-enade-admin` já existe com o spec commitado.

---

### Task 1: Provisionar o Firestore no projeto Firebase

**Files:** nenhum arquivo de código — infraestrutura + o primeiro doc de admin.

**Interfaces:**
- Produces: banco Firestore ativo no projeto `professor-enade-vicduarte`, regras publicadas, primeiro doc em `admins/{uid da Vic}` — necessário pra Task 4/7 funcionarem de ponta a ponta.

- [ ] **Step 1: Criar o banco Firestore**

Run: `firebase firestore:databases:create '(default)' --location=nam5 --project professor-enade-vicduarte`

Se pedir confirmação de modo (Native vs Datastore), usar Native (padrão do Admin SDK). Confirmar que não pede cartão em nenhum momento — se pedir, parar e perguntar pra Vic.

- [ ] **Step 2: Criar e publicar as regras de segurança**

Criar `firestore.rules` na raiz do repo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /geracoes/{docId} {
      allow read, write: if false;
    }
    match /admins/{uid} {
      allow read, write: if false;
    }
  }
}
```

Run: `firebase deploy --only firestore:rules --project professor-enade-vicduarte`

- [ ] **Step 3: Descobrir o uid da Vic e criar o primeiro admin**

Pedir pra Vic o `uid` dela (Console do Firebase → Authentication → Users → clicar na linha do e-mail dela → copiar o UID), já que ela precisa ter feito login pelo menos uma vez pra esse uid existir. A CLI do `firebase-tools` não tem um comando genérico pra criar documento arbitrário no Firestore (só `firestore:delete`, `export`, `import`), então o caminho é o Console: Firestore Database → Data → "Start collection" → Collection ID `admins` → Document ID = o uid copiado → adicionar campo `email` (tipo string) = o e-mail dela → Save. Um fluxo de cliques, sem script.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "chore: cria banco Firestore e regras (nega acesso direto do cliente)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 2: Extrair helpers compartilhados de Admin SDK (`api/_lib/firebase-admin.js`)

**Files:**
- Create: `api/_lib/firebase-admin.js`
- Modify: `api/generate-professor-enade.js`
- Test: `tests/professor-enade.spec.js` (atualiza as expectativas de `verifyAuth` que já existem)

**Interfaces:**
- Produces: `getAdminAuth(): Auth`, `getAdminFirestore(): Firestore`, `verifyAuth(req, verifyIdToken): Promise<{ok:true, uid, email} | {ok:false, status, error}>` — `email` é novo no retorno de sucesso (antes só devolvia `uid`). Consumido por `generate-professor-enade.js` (Task 3) e `admin-metrics.js` (Task 4).
- Consumes: nada de outras tasks.

`api/_lib/firebase-admin.js` (arquivos/pastas com `_` na frente dentro de `api/` não viram rota na Vercel — é o jeito padrão de ter código compartilhado ali):

- [ ] **Step 1: Criar o módulo compartilhado**

```js
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_EMAIL_DOMAIN = '@unichristus.edu.br';

function ensureAdminApp() {
  if (getApps().length === 0) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT ausente.');
    const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

export function getAdminFirestore() {
  ensureAdminApp();
  return getFirestore();
}

export async function verifyAuth(req, verifyIdToken) {
  const header = String(req.headers?.authorization || req.headers?.Authorization || '');
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return { ok: false, status: 401, error: 'Login necessário.' };

  let decoded;
  try {
    decoded = await verifyIdToken(match[1]);
  } catch {
    return { ok: false, status: 401, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (decoded?.email_verified !== true) {
    return { ok: false, status: 403, error: 'Confirme seu e-mail antes de gerar questões.' };
  }
  if (!String(decoded?.email || '').toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    return { ok: false, status: 403, error: 'Acesso restrito a e-mails da Unichristus.' };
  }

  return { ok: true, uid: decoded.uid, email: decoded.email };
}
```

- [ ] **Step 2: Atualizar `generate-professor-enade.js` pra usar o módulo compartilhado**

Remover de `api/generate-professor-enade.js` (linhas atuais no topo do arquivo): os imports `cert, getApps, initializeApp` de `firebase-admin/app` e `getAuth` de `firebase-admin/auth`, a constante `ALLOWED_EMAIL_DOMAIN`, a função `getAdminAuth`, e a função `verifyAuth` (a definição inteira, do `export async function verifyAuth` até o fechamento).

No lugar, adicionar no topo do arquivo:

```js
import { getAdminAuth, verifyAuth } from './_lib/firebase-admin.js';

export { verifyAuth };
```

(o `export { verifyAuth }` mantém `tests/professor-enade.spec.js` funcionando sem mudar o import de lá — ele já importa `verifyAuth` de `'../api/generate-professor-enade.js'`.)

- [ ] **Step 3: Atualizar as expectativas dos testes de `verifyAuth` existentes**

Em `tests/professor-enade.spec.js`, dentro do `test.describe('verifyAuth', ...)`, o teste `'rejeita e-mail não verificado'` e o teste `'rejeita domínio fora da Unichristus'` continuam iguais (retorno de erro não mudou). Só o teste de sucesso muda — trocar:

```js
  test('aceita e-mail Unichristus verificado, ignorando maiúsculas', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => ({ uid: 'u1', email: 'Prof@Unichristus.edu.br', email_verified: true }),
    );
    expect(result).toEqual({ ok: true, uid: 'u1' });
  });
```

por:

```js
  test('aceita e-mail Unichristus verificado, ignorando maiúsculas', async () => {
    const result = await verifyAuth(
      { headers: { authorization: 'Bearer abc' } },
      async () => ({ uid: 'u1', email: 'Prof@Unichristus.edu.br', email_verified: true }),
    );
    expect(result).toEqual({ ok: true, uid: 'u1', email: 'Prof@Unichristus.edu.br' });
  });
```

- [ ] **Step 4: Rodar os testes**

Run: `npx playwright test professor-enade -g "verifyAuth|Contrato do PROFESSOR-ENADE|classifyGeminiError"`

Expected: PASS em todos (o comportamento de `verifyAuth` é o mesmo, só ganhou `email` no retorno de sucesso).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/firebase-admin.js api/generate-professor-enade.js tests/professor-enade.spec.js
git commit -m "refactor: extrai Admin SDK e verifyAuth pra modulo compartilhado

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 3: Escrita do evento de uso em `generate-professor-enade.js`

**Files:**
- Modify: `api/generate-professor-enade.js`
- Test: `tests/professor-enade.spec.js`

**Interfaces:**
- Produces: `export async function logGenerationEvent(addDoc, { uid, email, curso, tipoItem }): Promise<boolean>` — `addDoc` é injetado (assinatura `(data) => Promise<void>`) especificamente pra poder testar as duas garantias que a Vic pediu (aguarda a escrita; nunca deixa o erro subir) sem precisar de um Firestore de verdade.

- [ ] **Step 1: Escrever os testes (falhando)**

Em `tests/professor-enade.spec.js`, adicionar o import `FieldValue`-free (não precisa, `logGenerationEvent` não usa `FieldValue` diretamente — ver Step 3) e trocar a linha de import do topo:

```js
import { parseInput, validateItem, verifyAuth, classifyGeminiError } from '../api/generate-professor-enade.js';
```

por:

```js
import { parseInput, validateItem, verifyAuth, classifyGeminiError, logGenerationEvent } from '../api/generate-professor-enade.js';
```

E adicionar, depois do `test.describe('classifyGeminiError', ...)`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test professor-enade -g logGenerationEvent`

Expected: FAIL — `logGenerationEvent is not a function`.

- [ ] **Step 3: Implementar**

Em `api/generate-professor-enade.js`, trocar o import do módulo compartilhado (feito na Task 2) de:

```js
import { getAdminAuth, verifyAuth } from './_lib/firebase-admin.js';
```

por:

```js
import { getAdminAuth, getAdminFirestore, verifyAuth } from './_lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
```

E adicionar, logo depois da definição de `verifyAuth` re-exportada:

```js
export async function logGenerationEvent(addDoc, { uid, email, curso, tipoItem }) {
  try {
    await addDoc({ uid, email, curso, tipoItem, criadoEm: FieldValue.serverTimestamp() });
    return true;
  } catch (error) {
    console.error('[PROFESSOR-ENADE] Falha ao registrar evento de uso (geração segue normal):', error);
    return false;
  }
}
```

No `handler`, o bloco atual:

```js
    const totalMs = Date.now() - startedAt;
    console.info(`[PROFESSOR-ENADE] Sucesso: curso=${input.course} totalMs=${totalMs}`);

    return res.status(200).json({
```

vira:

```js
    const totalMs = Date.now() - startedAt;
    console.info(`[PROFESSOR-ENADE] Sucesso: curso=${input.course} totalMs=${totalMs}`);

    await logGenerationEvent(
      data => getAdminFirestore().collection('geracoes').add(data),
      { uid: auth.uid, email: auth.email, curso: input.course, tipoItem: input.itemType },
    );

    return res.status(200).json({
```

(o `await` aqui é o ponto que a Vic pediu pra confirmar — a resposta só é enviada depois que `logGenerationEvent` resolve, e como a função nunca rejeita, uma falha na escrita não impede o `return res.status(200)` de rodar.)

- [ ] **Step 4: Rodar os testes de novo**

Run: `npx playwright test professor-enade -g "logGenerationEvent|verifyAuth|Contrato do PROFESSOR-ENADE|classifyGeminiError"`

Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add api/generate-professor-enade.js tests/professor-enade.spec.js
git commit -m "feat: registra evento de uso em geracoes apos geracao aprovada

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 4: Endpoint `api/admin-metrics.js`

**Files:**
- Create: `api/admin-metrics.js`
- Test: `tests/admin-metrics.spec.js`

**Interfaces:**
- Produces: `export async function checkIsAdmin(uid, getAdminDoc): Promise<boolean>` (`getAdminDoc` injetado, assinatura `(uid) => Promise<{exists: boolean}>`), `export function aggregateMetrics(events, now = new Date()): {total, porProfessor, porCurso, ultimos7Dias, ultimos30Dias}` (função pura, `events` é `Array<{email, curso, criadoEm: Date}>`).
- Consumes: `verifyAuth`, `getAdminAuth`, `getAdminFirestore` de `./_lib/firebase-admin.js` (Task 2).

- [ ] **Step 1: Escrever os testes (falhando)**

Criar `tests/admin-metrics.spec.js`:

```js
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
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(1) },   // dentro de 7 e 30
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(10) },  // só dentro de 30
      { email: 'a@unichristus.edu.br', curso: 'engenharia-civil', criadoEm: diasAtras(40) },  // fora dos dois
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test admin-metrics`

Expected: FAIL — não consegue resolver `../api/admin-metrics.js` (arquivo não existe).

- [ ] **Step 3: Implementar**

Criar `api/admin-metrics.js`:

```js
import { getAdminAuth, getAdminFirestore, verifyAuth } from './_lib/firebase-admin.js';

export async function checkIsAdmin(uid, getAdminDoc) {
  try {
    const doc = await getAdminDoc(uid);
    return Boolean(doc?.exists);
  } catch (error) {
    console.error('[ADMIN-METRICS] Falha ao checar admin:', error);
    return false;
  }
}

export function aggregateMetrics(events, now = new Date()) {
  const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const porProfessor = {};
  const porCurso = {};
  let ultimos7Dias = 0;
  let ultimos30Dias = 0;

  for (const event of events) {
    const email = String(event.email || '').toLowerCase();
    porProfessor[email] = (porProfessor[email] || 0) + 1;
    porCurso[event.curso] = (porCurso[event.curso] || 0) + 1;
    if (event.criadoEm >= seteDiasAtras) ultimos7Dias += 1;
    if (event.criadoEm >= trintaDiasAtras) ultimos30Dias += 1;
  }

  return { total: events.length, porProfessor, porCurso, ultimos7Dias, ultimos30Dias };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await verifyAuth(req, token => getAdminAuth().verifyIdToken(token));
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const isAdmin = await checkIsAdmin(auth.uid, uid => getAdminFirestore().collection('admins').doc(uid).get());
  if (!isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });

  try {
    const snapshot = await getAdminFirestore().collection('geracoes').get();
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        email: data.email,
        curso: data.curso,
        criadoEm: data.criadoEm?.toDate?.() || new Date(0),
      };
    });
    return res.status(200).json(aggregateMetrics(events));
  } catch (error) {
    console.error('[ADMIN-METRICS] Falha ao consultar métricas:', error);
    return res.status(500).json({ error: 'Não foi possível carregar as métricas agora.' });
  }
}
```

- [ ] **Step 4: Rodar os testes de novo**

Run: `npx playwright test admin-metrics`

Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add api/admin-metrics.js tests/admin-metrics.spec.js
git commit -m "feat: endpoint de metricas administrativas do PROFESSOR-ENADE

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 5: Markup e estilos da página `professor-enade-admin.html`

**Files:**
- Create: `professor-enade-admin.html`
- Modify: `static/css/professor-enade.css`

**Interfaces:**
- Produces: os mesmos IDs de gate de auth já usados em `professor-enade.html` (`enade-auth-gate`, `enade-auth-loading`, `enade-auth-form-wrap`, `enade-auth-title`, `enade-auth-alert`, `enade-auth-form`, `enade-auth-email`, `enade-auth-password`, `enade-auth-submit`, `enade-auth-toggle`, `enade-auth-verify`, `enade-auth-verify-email`, `enade-auth-verify-alert`, `enade-auth-verify-check`, `enade-auth-verify-resend`, `enade-auth-verify-signout`, `enade-user-bar`, `enade-user-email`, `enade-user-signout`, `enade-workspace-content`) — **precisam ser idênticos** aos de `professor-enade.html` porque `static/js/professor-enade-auth.js` (Task 6) é reaproveitado sem nenhuma mudança de lógica, e ele consulta esses IDs diretamente. Além desses, IDs novos: `admin-restricted` (mensagem "acesso restrito"), `admin-metrics-loading`, `admin-metrics-content`, `admin-total`, `admin-7d`, `admin-30d`, `admin-por-professor`, `admin-por-curso`.

- [ ] **Step 1: Criar `professor-enade-admin.html`**

Copiar a estrutura de `<head>`, navbar e footer de `professor-enade.html` (mesmo boilerplate — Bootstrap, Font Awesome, `style.css`, `professor-enade.css`, mesmo navbar, mesmo footer), trocando `<title>` para `"Painel Administrativo — PROFESSOR-ENADE - Vic Duarte"` e removendo o `<script type="application/ld+json">` (não é uma página pública indexável, não precisa de schema.org). O `<main>` fica:

```html
    <main id="main-content">
        <section class="enade-workspace" aria-labelledby="admin-title">
            <div class="container">
                <div class="enade-section-intro text-center">
                    <span>PROFESSOR-ENADE</span>
                    <h2 id="admin-title">Painel administrativo</h2>
                    <p>Métricas de uso do gerador — restrito a administradores.</p>
                </div>

                <div id="enade-auth-gate" class="enade-auth-gate">
                    <div id="enade-auth-loading" class="enade-auth-loading">
                        <div class="enade-spinner" aria-hidden="true"></div>
                    </div>

                    <div id="enade-auth-form-wrap" class="enade-auth-card" hidden>
                        <span class="enade-panel-kicker">Acesso restrito</span>
                        <h3 id="enade-auth-title">Entrar</h3>
                        <p class="enade-auth-sub">Uso exclusivo para e-mails institucionais <strong>@unichristus.edu.br</strong>.</p>
                        <div id="enade-auth-alert" class="enade-alert" role="status" aria-live="polite" hidden></div>
                        <form id="enade-auth-form" novalidate>
                            <label class="enade-label" for="enade-auth-email">E-mail institucional</label>
                            <input id="enade-auth-email" class="form-control" type="email" required placeholder="nome@unichristus.edu.br">
                            <label class="enade-label" for="enade-auth-password">Senha</label>
                            <input id="enade-auth-password" class="form-control" type="password" required minlength="6" placeholder="Mínimo de 6 caracteres">
                            <button id="enade-auth-submit" class="btn btn-linkedin enade-generate" type="submit"><span>Entrar</span></button>
                        </form>
                        <button id="enade-auth-toggle" type="button" class="enade-text-button enade-auth-toggle">Não tem conta? Cadastre-se</button>
                    </div>

                    <div id="enade-auth-verify" class="enade-auth-card" hidden>
                        <span class="enade-panel-kicker">Confirmação pendente</span>
                        <h3>Confirme seu e-mail</h3>
                        <p class="enade-auth-sub">Enviamos um link de confirmação para <strong id="enade-auth-verify-email"></strong>. Confirme e clique em "Já confirmei".</p>
                        <p class="enade-lock-note"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i>Não achou o e-mail? Confira a caixa de spam/lixo eletrônico.</p>
                        <div id="enade-auth-verify-alert" class="enade-alert" role="status" aria-live="polite" hidden></div>
                        <div class="enade-auth-verify-actions">
                            <button id="enade-auth-verify-check" type="button" class="btn btn-linkedin enade-generate"><span>Já confirmei</span></button>
                            <button id="enade-auth-verify-resend" type="button" class="enade-text-button">Reenviar e-mail</button>
                            <button id="enade-auth-verify-signout" type="button" class="enade-text-button">Usar outra conta</button>
                        </div>
                    </div>
                </div>

                <div id="enade-user-bar" class="enade-user-bar" hidden>
                    <span><i class="fas fa-user-check" aria-hidden="true"></i> <span id="enade-user-email"></span></span>
                    <button id="enade-user-signout" type="button" class="enade-text-button">Sair</button>
                </div>

                <div id="enade-workspace-content" hidden>
                    <div id="admin-restricted" class="enade-alert" role="alert" hidden>Esta área é restrita a administradores.</div>

                    <div id="admin-metrics-loading" class="enade-auth-loading">
                        <div class="enade-spinner" aria-hidden="true"></div>
                    </div>

                    <div id="admin-metrics-content" hidden>
                        <div class="enade-admin-cards">
                            <div class="enade-admin-card"><strong id="admin-total">0</strong><span>Total de questões geradas</span></div>
                            <div class="enade-admin-card"><strong id="admin-7d">0</strong><span>Últimos 7 dias</span></div>
                            <div class="enade-admin-card"><strong id="admin-30d">0</strong><span>Últimos 30 dias</span></div>
                        </div>
                        <div class="enade-admin-lists">
                            <div>
                                <h3>Por professor</h3>
                                <ul id="admin-por-professor" class="enade-admin-list"></ul>
                            </div>
                            <div>
                                <h3>Por curso</h3>
                                <ul id="admin-por-curso" class="enade-admin-list"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
```

Antes de `</body>`, incluir os scripts na mesma ordem de `professor-enade.html`:

```html
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="./static/js/main.js"></script>
    <script type="module" src="./static/js/professor-enade-auth.js"></script>
    <script src="./static/js/professor-enade-admin.js"></script>
```

- [ ] **Step 2: Adicionar as classes CSS novas**

Em `static/css/professor-enade.css`, adicionar ao final:

```css

/* Painel administrativo */
.enade-admin-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.enade-admin-card { border: 1px solid var(--enade-line); border-radius: 14px; background: #fff; padding: 1.2rem; text-align: center; }
.enade-admin-card strong { display: block; color: var(--enade-navy); font-size: 2rem; font-weight: 700; }
.enade-admin-card span { color: #69778A; font-size: 0.8rem; }
.enade-admin-lists { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
.enade-admin-lists h3 { color: var(--enade-navy); font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; }
.enade-admin-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--enade-line); border-radius: 12px; background: #fff; overflow: hidden; }
.enade-admin-list li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 1rem; font-size: 0.85rem; color: var(--enade-navy); }
.enade-admin-list li + li { border-top: 1px solid var(--enade-line); }
.enade-admin-list li span:last-child { font-weight: 700; }
```

- [ ] **Step 3: Verificar visualmente**

Servir localmente (`npx serve . -p 3000`), abrir `http://localhost:3000/professor-enade-admin.html`. Nesta task ainda não existe `professor-enade-admin.js`, então nada abaixo do gate renderiza — confirma só que a tela de login aparece igual à de `professor-enade.html`, sem erro de layout. Encerrar o servidor.

- [ ] **Step 4: Commit**

```bash
git add professor-enade-admin.html static/css/professor-enade.css
git commit -m "feat: markup e estilos da pagina do painel administrativo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 6: `static/js/professor-enade-admin.js`

**Files:**
- Create: `static/js/professor-enade-admin.js`

**Interfaces:**
- Consumes: `window.ProfessorEnadeAuth.getIdToken()` (já existe, de `professor-enade-auth.js`); `GET /api/admin-metrics` (Task 4).

- [ ] **Step 1: Criar o script**

```js
(() => {
    'use strict';

    const restricted = document.getElementById('admin-restricted');
    const loading = document.getElementById('admin-metrics-loading');
    const content = document.getElementById('admin-metrics-content');
    const totalEl = document.getElementById('admin-total');
    const sevenEl = document.getElementById('admin-7d');
    const thirtyEl = document.getElementById('admin-30d');
    const porProfessorEl = document.getElementById('admin-por-professor');
    const porCursoEl = document.getElementById('admin-por-curso');
    const workspaceContent = document.getElementById('enade-workspace-content');
    if (!workspaceContent) return;

    function renderList(el, counts) {
        el.innerHTML = '';
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = '<span>Nenhum registro ainda</span>';
            el.appendChild(li);
            return;
        }
        for (const [label, count] of entries) {
            const li = document.createElement('li');
            li.innerHTML = `<span>${label}</span><span>${count}</span>`;
            el.appendChild(li);
        }
    }

    async function loadMetrics() {
        loading.hidden = false;
        content.hidden = true;
        restricted.hidden = true;

        try {
            const token = await window.ProfessorEnadeAuth?.getIdToken?.();
            const response = await fetch('/api/admin-metrics', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.status === 403) {
                restricted.hidden = false;
                return;
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as métricas.');

            totalEl.textContent = data.total ?? 0;
            sevenEl.textContent = data.ultimos7Dias ?? 0;
            thirtyEl.textContent = data.ultimos30Dias ?? 0;
            renderList(porProfessorEl, data.porProfessor || {});
            renderList(porCursoEl, data.porCurso || {});
            content.hidden = false;
        } catch (error) {
            restricted.hidden = false;
            restricted.textContent = error instanceof Error ? error.message : 'Não foi possível carregar as métricas.';
        } finally {
            loading.hidden = true;
        }
    }

    // Observa quando o gate de auth revela o conteúdo (usuário logado e
    // verificado) pra só então buscar as métricas — sem isso, tentaríamos
    // buscar antes de haver um usuário autenticado.
    const observer = new MutationObserver(() => {
        if (!workspaceContent.hidden) loadMetrics();
    });
    observer.observe(workspaceContent, { attributes: true, attributeFilter: ['hidden'] });

    if (!workspaceContent.hidden) loadMetrics();
})();
```

- [ ] **Step 2: Verificar visualmente com mock de rede**

Servir localmente e abrir a página com o console do navegador. Como ainda não há Firestore/admin local pra testar de verdade, confirma só que: (a) sem estar logado, o gate de login aparece normalmente (herdado do `professor-enade-auth.js`, sem mudança); (b) não há erro de JS no console ao carregar a página.

- [ ] **Step 3: Commit**

```bash
git add static/js/professor-enade-admin.js
git commit -m "feat: busca e renderiza metricas no painel administrativo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 7: Testes Playwright do painel

**Files:**
- Modify: `tests/admin-metrics.spec.js`

**Interfaces:**
- Consumes: `mockFirebaseAuth`, `loginAsVerifiedProfessor` de `tests/helpers/mock-firebase-auth.js` (já existe).

- [ ] **Step 1: Adicionar os testes de página**

Em `tests/admin-metrics.spec.js`, adicionar o import:

```js
import { loginAsVerifiedProfessor } from './helpers/mock-firebase-auth.js';
```

E adicionar, ao final do arquivo:

```js
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
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `npx playwright test admin-metrics`

Expected: PASS em todos (unitários + página). Se algum dos dois testes de página travar esperando o gate revelar o conteúdo, verificar se `loginAsVerifiedProfessor` está esperando `#enade-workspace-content` ficar visível antes de retornar (já faz isso, ver `tests/helpers/mock-firebase-auth.js`) — o `MutationObserver` do `professor-enade-admin.js` depende exatamente dessa mudança de atributo `hidden` pra disparar a busca.

- [ ] **Step 3: Rodar a suíte completa do projeto**

Run: `npm test`

Expected: PASS em tudo (nenhum teste de outras páginas deve ter sido afetado).

- [ ] **Step 4: Commit**

```bash
git add tests/admin-metrics.spec.js
git commit -m "test: cobertura de pagina do painel administrativo

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 8: Verificação final, PR, CI e verificação em produção

**Files:** nenhum arquivo novo — verificação e fluxo de PR do CLAUDE.md.

- [ ] **Step 1: Rodar a suíte completa localmente**

Run: `npm test`

Expected: PASS em tudo.

- [ ] **Step 2: Push e PR**

```bash
git push origin feat/professor-enade-admin
gh pr create --base main --fill --body "$(cat <<'EOF'
Painel administrativo do PROFESSOR-ENADE (Épico 3): registra cada
geração aprovada em Firestore e expõe métricas de uso (total, por
professor, por curso, últimos 7/30 dias) numa página nova, restrita a
quem estiver na coleção admins.

- Firestore novo no projeto (Spark, sem cartão) — regras negam acesso
  direto do cliente, tudo passa pelas funções serverless (Admin SDK)
- api/_lib/firebase-admin.js — Admin SDK e verifyAuth compartilhados
  entre generate-professor-enade.js e o admin-metrics.js novo
- Escrita do evento de uso é await'ada e isolada num try/catch próprio
  — falha ao gravar métrica nunca derruba a geração da questão
- professor-enade-admin.html reaproveita o mesmo gate de login/e-mail
  verificado, sem mudança de lógica no professor-enade-auth.js
- Spec: docs/superpowers/specs/2026-09-03-professor-enade-admin-design.md
- Plano: docs/superpowers/plans/2026-09-03-professor-enade-admin.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr checks --watch
```

- [ ] **Step 3: Merge**

Run: `gh pr merge --squash --delete-branch` (só depois da CI verde).

- [ ] **Step 4: Verificação real em produção (escrita do evento)**

Igual ao que foi feito depois do merge da autenticação (PR #24/#25): gerar uma questão de verdade contra `https://vicduarte.site` (com um usuário verificado — pode ser via conta de teste descartável + `email_verified` setado manualmente não é possível via self-service, então usar uma conta real logada, ou aceitar que a auditoria de sucesso só é 100% testável com uma conta verificada de verdade) e depois checar no Console do Firestore (`geracoes`) se o documento foi criado com os campos certos. Essa é a única forma de confirmar de ponta a ponta que a escrita funciona com o Firestore real (o teste automatizado só cobre a lógica de isolamento de erro, não a integração real).

- [ ] **Step 5: Verificação real em produção (painel)**

Logar como Vic (admin) em `https://vicduarte.site/professor-enade-admin.html` e confirmar que as métricas aparecem. Logar com uma conta que não está em `admins` e confirmar que aparece "Esta área é restrita a administradores."

- [ ] **Step 6: Reportar pra Vic**

Avisar que o painel está no ar, o link direto (`https://vicduarte.site/professor-enade-admin.html` — não tem link na navbar, é acesso direto por enquanto), e que novos admins são adicionados manualmente em `admins/{uid}` pelo Console do Firestore.
