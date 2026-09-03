# Autenticação Firebase no PROFESSOR-ENADE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restringir a geração de questões do PROFESSOR-ENADE a e-mails `@unichristus.edu.br` verificados, com login/cadastro Firebase no cliente e verificação do ID token no servidor.

**Architecture:** Firebase Auth (e-mail/senha, projeto novo dedicado) carregado via ES modules do CDN oficial do Google direto no `professor-enade.html` — sem bundler. `static/js/professor-enade-auth.js` controla um "gate" que esconde o Estúdio de elaboração até haver um usuário logado com e-mail verificado, e injeta o ID token em toda chamada à API. `api/generate-professor-enade.js` verifica esse token com o Firebase Admin SDK antes de qualquer geração, e troca o rate limit de por-IP para por-UID.

**Tech Stack:** Firebase JS SDK 12.18.0 (ES modules via `gstatic.com`), `firebase-admin` 14.3.0 (Node, Vercel serverless), Playwright (testes existentes do repo).

**Spec:** `docs/superpowers/specs/2026-09-03-professor-enade-auth-design.md`

## Global Constraints

- Plano gratuito em tudo — Firebase Spark, Vercel Hobby, sem cartão vinculado em nenhum serviço novo (CLAUDE.md, seção "Restrição básica do projeto"). Se qualquer passo pedir cartão, parar e perguntar pra Vic — não presumir.
- Sem React, Vite, Tailwind ou bundler neste repositório — tudo HTML/CSS/JS puro + ES modules nativos do browser.
- Domínio permitido: `@unichristus.edu.br` (case-insensitive), checado no cliente **e** no servidor.
- E-mail verificado (`emailVerified === true`) é obrigatório para gerar questões, checado no cliente (gate) **e** no servidor (claim `email_verified` do token).
- Domínios autorizados no Firebase Auth: só `localhost` (padrão) + `vicduarte.site`. Sem previews da Vercel.
- Nenhuma credencial real de Firebase entra na suíte de testes/CI — mocks de rede via Playwright `page.route`.
- Fluxo de git: branch → PR → CI (`Testes (Playwright)`) verde → merge. `main` é protegida, sem push direto (ver CLAUDE.md). A branch `feat/professor-enade-auth` já existe com o spec commitado.

---

### Task 1: Provisionar o projeto Firebase

**Files:** nenhum arquivo de código — só infraestrutura + valores capturados para as Tasks 5 e 2.

**Interfaces:**
- Produces: `firebaseConfig` (objeto com `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) — consumido pela Task 5. Variável de ambiente `FIREBASE_SERVICE_ACCOUNT` (JSON da service account em base64) configurada na Vercel (Production) — consumida pela Task 2 em runtime.

- [ ] **Step 1: Criar o projeto Firebase**

Run: `firebase projects:create professor-enade-vicduarte --display-name "PROFESSOR-ENADE"`

Se o ID já estiver em uso, adicionar sufixo (ex.: `professor-enade-vicduarte-2026`) e repetir. Anotar o `projectId` real retornado.

- [ ] **Step 2: Confirmar plano Spark (gratuito) e nenhum cartão vinculado**

Run: `firebase projects:list` — conferir que o projeto aparece. Novos projetos Firebase nascem no plano Spark por padrão (sem billing account). Confirmar isso olhando o projeto em https://console.firebase.google.com/project/<projectId>/usage/details — se em algum momento a interface pedir vincular cartão para qualquer passo seguinte, **parar e perguntar pra Vic antes de prosseguir.**

- [ ] **Step 3: Registrar o Web App e capturar a config**

Run: `firebase apps:create WEB "PROFESSOR-ENADE Web" --project <projectId>`

Run: `firebase apps:sdkconfig WEB <appId-retornado> --project <projectId>`

Guardar a saída (objeto `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) — vai literalmente para dentro de `static/js/professor-enade-auth.js` na Task 5. Esses valores não são segredo (config pública de qualquer app Firebase client-side), então **podem** ficar hardcoded no JS.

- [ ] **Step 4: Habilitar o provider de e-mail/senha (manual, Console)**

Isso não é coberto pela `firebase` CLI. Pedir para Vic (ou fazer, se autenticado no browser certo): abrir https://console.firebase.google.com/project/<projectId>/authentication/providers → habilitar **E-mail/senha**. Confirmar antes de seguir para a Task 2/5, senão login/cadastro falham com `auth/operation-not-allowed`.

- [ ] **Step 5: Adicionar domínio autorizado (manual, Console)**

https://console.firebase.google.com/project/<projectId>/authentication/settings → aba "Domínios autorizados" → adicionar `vicduarte.site`. Não adicionar nada de `*.vercel.app` (não suporta wildcard, decisão já fechada no spec).

- [ ] **Step 6: Gerar a service account e configurar a Vercel**

Console → Configurações do projeto → Contas de serviço → "Gerar nova chave privada" → baixa um JSON. Codificar em base64:

Run: `base64 -i caminho/para/o-arquivo-baixado.json | tr -d '\n' > /private/tmp/claude-501/-Users-vicduarte-Documents-VicDuarte/*/scratchpad/firebase-service-account.b64`

(usar o diretório de scratchpad da sessão atual, nunca commitar esse arquivo).

Se `vercel env add` funcionar (checar `vercel whoami`; se o token estiver inválido, rodar `vercel login` — passo interativo, pedir para Vic completar o login no browser que abrir):

Run: `vercel env add FIREBASE_SERVICE_ACCOUNT production` — colar o conteúdo do `.b64` quando solicitado.

Apagar o arquivo `.json` baixado e o `.b64` do disco local depois de configurado (só existir na Vercel).

- [ ] **Step 7: Registrar os valores capturados**

Escrever um arquivo de referência em `.local-firebase-web-config.json` (raiz do repositório) com o objeto `firebaseConfig` do Step 3, para a Task 5 copiar exatamente. Um arquivo no scratchpad da sessão não serve aqui — se a Task 5 rodar num subagente novo (execução via subagent-driven-development), ele tem seu próprio scratchpad e não veria um arquivo deixado ali pela Task 1; um arquivo na raiz do repo é visível a qualquer subagente com o mesmo diretório de trabalho.

Antes de escrever, conferir se `.gitignore` já ignora esse nome — se não, adicionar a linha `.local-firebase-web-config.json` ao `.gitignore` (esses valores não são segredo, mas não faz sentido versionar um arquivo de handoff transitório entre tasks). A Task 5 apaga esse arquivo depois de copiar os valores.

---

### Task 2: Servidor — verificação do ID token + rate limit por UID

**Files:**
- Modify: `api/generate-professor-enade.js`
- Modify: `package.json` (adicionar dependência)
- Test: `tests/professor-enade.spec.js` (mesmo arquivo — os testes de contrato já importam deste módulo)

**Interfaces:**
- Produces: `export async function verifyAuth(req, verifyIdToken)` → `Promise<{ ok: true, uid: string } | { ok: false, status: number, error: string }>`. `verifyIdToken` é injetado (assinatura `(token: string) => Promise<{ uid, email, email_verified }>`) para permitir teste sem credenciais reais.
- Consumes: nada de outras tasks (independente).

- [ ] **Step 1: Adicionar a dependência**

`package.json` não tem hoje nenhuma chave `"dependencies"`. Adicionar:

```json
  "dependencies": {
    "firebase-admin": "^14.3.0"
  },
```

(inserir logo depois de `"type": "module",`, antes de `"scripts"`, seguindo a ordem convencional de `package.json`).

Run: `npm install`

Expected: cria `node_modules/firebase-admin` e um `package-lock.json` (ou atualiza o existente).

- [ ] **Step 2: Escrever os testes de `verifyAuth` (falhando)**

No topo de `tests/professor-enade.spec.js`, junto ao import já existente, trocar:

```js
import { parseInput, validateItem } from '../api/generate-professor-enade.js';
```

por:

```js
import { parseInput, validateItem, verifyAuth } from '../api/generate-professor-enade.js';
```

E adicionar, antes do `test.describe('Página do PROFESSOR-ENADE', ...)`:

```js
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
```

- [ ] **Step 3: Rodar os testes e confirmar que falham**

Run: `npx playwright test professor-enade -g verifyAuth`

Expected: FAIL — `verifyAuth is not a function` (ainda não existe no módulo).

- [ ] **Step 4: Implementar `verifyAuth` e a inicialização do Admin SDK**

No topo de `api/generate-professor-enade.js`, junto aos outros imports/consts (antes de `const MODEL = ...`), adicionar:

```js
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ALLOWED_EMAIL_DOMAIN = '@unichristus.edu.br';

function getAdminAuth() {
  if (getApps().length === 0) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT ausente.');
    const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
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

  return { ok: true, uid: decoded.uid };
}
```

- [ ] **Step 5: Rodar os testes de `verifyAuth` de novo**

Run: `npx playwright test professor-enade -g verifyAuth`

Expected: PASS (5 testes).

- [ ] **Step 6: Trocar `getClientIp`/rate limit por IP para rate limit por UID**

Em `api/generate-professor-enade.js`, remover a função `getClientIp` inteira (linhas ~298-301, o bloco `function getClientIp(req) { ... }`) — não é mais usada em lugar nenhum depois desta mudança.

No `handler`, logo após os headers e a checagem de método (`if (req.method !== 'POST') { ... }`), adicionar a verificação de auth **antes** de qualquer outra checagem existente:

```js
  const auth = await verifyAuth(req, token => getAdminAuth().verifyIdToken(token));
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
```

E trocar a linha existente:

```js
  if (isRateLimited(getClientIp(req))) return res.status(429).json({ error: 'Limite temporário atingido. Aguarde alguns minutos e tente novamente.' });
```

por:

```js
  if (isRateLimited(auth.uid)) return res.status(429).json({ error: 'Limite temporário atingido. Aguarde alguns minutos e tente novamente.' });
```

`isRateLimited` em si (a função que usa `requestLog`) não muda — só o valor passado como chave.

- [ ] **Step 7: Rodar toda a suíte de contrato do módulo**

Run: `npx playwright test professor-enade -g "Contrato do PROFESSOR-ENADE|verifyAuth"`

Expected: PASS — todos os testes de `parseInput`/`validateItem`/`verifyAuth` continuam passando (esses não dependem de rede nem do Admin SDK real).

- [ ] **Step 8: Commit**

```bash
git add api/generate-professor-enade.js package.json package-lock.json tests/professor-enade.spec.js
git commit -m "feat: verifica ID token do Firebase e troca rate limit para por-UID

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 3: Funções puras de auth do cliente (domínio + mensagens de erro)

**Files:**
- Create: `static/js/professor-enade-auth-helpers.js`
- Test: `tests/professor-enade-auth.spec.js`

**Interfaces:**
- Produces: `export function isAllowedDomain(email: string): boolean`, `export function mapAuthError(error: { code?: string }): string` — consumidos pela Task 5 (`professor-enade-auth.js`) e por esta task, via import relativo (sem URL remota, por isso dá pra testar direto no Node).

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `tests/professor-enade-auth.spec.js`:

```js
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx playwright test professor-enade-auth`

Expected: FAIL — não consegue resolver `../static/js/professor-enade-auth-helpers.js` (arquivo não existe).

- [ ] **Step 3: Implementar**

Criar `static/js/professor-enade-auth-helpers.js`:

```js
// Funções puras de apoio à autenticação do PROFESSOR-ENADE — sem
// dependência do SDK do Firebase, por isso testáveis direto no Node.
const ALLOWED_EMAIL_DOMAIN = '@unichristus.edu.br';

export function isAllowedDomain(email) {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Esse e-mail já tem uma conta cadastrada.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
};

export function mapAuthError(error) {
  return AUTH_ERROR_MESSAGES[error?.code] ?? 'Não deu certo. Tente de novo.';
}
```

- [ ] **Step 4: Rodar de novo e confirmar que passa**

Run: `npx playwright test professor-enade-auth`

Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add static/js/professor-enade-auth-helpers.js tests/professor-enade-auth.spec.js
git commit -m "feat: funcoes puras de validacao de dominio e erros de auth

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 4: Markup e estilos da tela de login/cadastro/verificação e gate do Estúdio

**Files:**
- Modify: `professor-enade.html`
- Modify: `static/css/professor-enade.css`

**Interfaces:**
- Produces: os IDs de DOM que a Task 5 vai consultar: `enade-auth-gate`, `enade-auth-loading`, `enade-auth-form-wrap`, `enade-auth-title`, `enade-auth-alert`, `enade-auth-form`, `enade-auth-email`, `enade-auth-password`, `enade-auth-submit`, `enade-auth-toggle`, `enade-auth-verify`, `enade-auth-verify-email`, `enade-auth-verify-alert`, `enade-auth-verify-check`, `enade-auth-verify-resend`, `enade-auth-verify-signout`, `enade-user-bar`, `enade-user-email`, `enade-user-signout`, e o `id="enade-workspace-content"` no `div.enade-grid` já existente.

- [ ] **Step 1: Envolver o conteúdo do Estúdio com um id e adicionar o bloco de auth**

Em `professor-enade.html`, a linha:

```html
                <div class="enade-grid">
```

vira:

```html
                <div id="enade-workspace-content" class="enade-grid" hidden>
```

E logo **antes** dessa linha (depois do `<div id="enade-alert" ...></div>` já existente), inserir:

```html
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

```

- [ ] **Step 2: Adicionar o script module ao final do `<body>`**

Em `professor-enade.html`, antes de `<script src="./static/js/professor-enade.js"></script>`, adicionar:

```html
    <script type="module" src="./static/js/professor-enade-auth.js"></script>
```

(precisa vir antes do `professor-enade.js`: mesmo sendo `type="module"` — que sempre executa após o parsing do documento, depois de scripts clássicos síncronos — a ordem no HTML documenta a dependência de leitura; funcionalmente não importa a ordem entre os dois porque `professor-enade.js` só usa `window.ProfessorEnadeAuth` dentro de um handler de clique, chamado bem depois do carregamento).

- [ ] **Step 3: Adicionar as classes CSS novas**

Em `static/css/professor-enade.css`, adicionar ao final do arquivo:

```css

/* Autenticação — login/cadastro/verificação e barra de usuário */
.enade-auth-gate { display: flex; align-items: center; justify-content: center; min-height: 320px; }
.enade-auth-loading { display: flex; align-items: center; justify-content: center; padding: 3rem 0; }
.enade-auth-card { width: 100%; max-width: 420px; border: 1px solid var(--enade-line); border-radius: 18px; background: #fff; box-shadow: 0 15px 45px rgba(9, 33, 64, 0.08); padding: clamp(1.2rem, 3vw, 1.7rem); }
.enade-auth-card h3 { margin: 0 0 0.5rem; color: var(--enade-navy); font-size: 1.35rem; font-weight: 700; letter-spacing: -0.025em; }
.enade-auth-sub { margin: 0 0 1.1rem; color: #4B5A6D; font-size: 0.9rem; line-height: 1.55; }
.enade-auth-card .enade-label { display: block; margin: 0.9rem 0 0.35rem; }
.enade-auth-card form > button { margin-top: 1.3rem; width: 100%; justify-content: center; }
.enade-auth-toggle { display: block; margin: 0.9rem auto 0; }
.enade-auth-verify-actions { display: flex; flex-direction: column; gap: 0.6rem; align-items: stretch; }
.enade-auth-verify-actions button.btn { justify-content: center; }
.enade-user-bar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; max-width: 820px; margin: 0 auto 1rem; padding: 0.65rem 1.1rem; border: 1px solid var(--enade-line); border-radius: 12px; background: #fff; color: var(--enade-navy); font-size: 0.85rem; font-weight: 600; }
.enade-user-bar i { color: #2FA36B; margin-right: 6px; }
```

- [ ] **Step 4: Verificar visualmente**

Run: `npx serve . -p 3000 &` e depois abrir `http://localhost:3000/professor-enade.html` no navegador (ou usar `chrome-devtools` se disponível). Confirmed esperado: como `professor-enade-auth.js` ainda não existe (Task 5), o gate fica só com o spinner de loading para sempre (`#enade-auth-loading` visível, resto `hidden`) e o Estúdio (`#enade-workspace-content`) permanece escondido — isso é esperado nesta task, só confirma que o HTML/CSS renderizam sem erro de layout. Encerrar o `serve` depois (`kill %1` ou `Ctrl+C`).

- [ ] **Step 5: Commit**

```bash
git add professor-enade.html static/css/professor-enade.css
git commit -m "feat: markup e estilos do gate de login do PROFESSOR-ENADE

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 5: Módulo de autenticação do cliente (Firebase wiring + DOM)

**Files:**
- Create: `static/js/professor-enade-auth.js`

**Interfaces:**
- Consumes: `isAllowedDomain`, `mapAuthError` de `./professor-enade-auth-helpers.js` (Task 3); os IDs de DOM da Task 4; `firebaseConfig` capturado na Task 1 (arquivo de referência no scratchpad).
- Produces: `window.ProfessorEnadeAuth.getIdToken(): Promise<string|null>` — consumido pela Task 6.

- [ ] **Step 1: Ler a config capturada na Task 1**

Abrir `.local-firebase-web-config.json` (raiz do repo, Task 1 Step 7) e copiar os 6 valores literalmente para o `firebaseConfig` abaixo.

- [ ] **Step 2: Criar o módulo**

Criar `static/js/professor-enade-auth.js` (substituir cada `<...>` pelos valores reais capturados na Task 1):

```js
// Autenticação do PROFESSOR-ENADE — Firebase Auth (e-mail/senha), restrito
// a e-mails @unichristus.edu.br verificados. Ver
// docs/superpowers/specs/2026-09-03-professor-enade-auth-design.md
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut as firebaseSignOut,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { isAllowedDomain, mapAuthError } from './professor-enade-auth-helpers.js';

const firebaseConfig = {
    apiKey: '<TASK_1_apiKey>',
    authDomain: '<TASK_1_authDomain>',
    projectId: '<TASK_1_projectId>',
    storageBucket: '<TASK_1_storageBucket>',
    messagingSenderId: '<TASK_1_messagingSenderId>',
    appId: '<TASK_1_appId>',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const gate = document.getElementById('enade-auth-gate');
const loadingView = document.getElementById('enade-auth-loading');
const formWrap = document.getElementById('enade-auth-form-wrap');
const verifyView = document.getElementById('enade-auth-verify');
const authForm = document.getElementById('enade-auth-form');
const authEmail = document.getElementById('enade-auth-email');
const authPassword = document.getElementById('enade-auth-password');
const authAlert = document.getElementById('enade-auth-alert');
const authSubmit = document.getElementById('enade-auth-submit');
const authToggle = document.getElementById('enade-auth-toggle');
const authTitle = document.getElementById('enade-auth-title');
const verifyEmailLabel = document.getElementById('enade-auth-verify-email');
const verifyAlert = document.getElementById('enade-auth-verify-alert');
const verifyCheckButton = document.getElementById('enade-auth-verify-check');
const verifyResendButton = document.getElementById('enade-auth-verify-resend');
const verifySignoutButton = document.getElementById('enade-auth-verify-signout');
const userBar = document.getElementById('enade-user-bar');
const userEmailLabel = document.getElementById('enade-user-email');
const userSignoutButton = document.getElementById('enade-user-signout');
const workspaceContent = document.getElementById('enade-workspace-content');

let mode = 'login'; // 'login' | 'cadastro'

function showBoxAlert(box, message) {
    box.textContent = message;
    box.hidden = false;
}

function hideBoxAlert(box) {
    box.hidden = true;
    box.textContent = '';
}

function setView(view) {
    loadingView.hidden = view !== 'loading';
    formWrap.hidden = view !== 'form';
    verifyView.hidden = view !== 'verify';
    gate.hidden = view === 'ready';
    userBar.hidden = view !== 'ready';
    workspaceContent.hidden = view !== 'ready';
}

function updateUserBar(user) {
    userEmailLabel.textContent = user.email;
}

setView('loading');

authToggle.addEventListener('click', () => {
    mode = mode === 'login' ? 'cadastro' : 'login';
    authTitle.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    authSubmit.querySelector('span').textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
    authToggle.textContent = mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar';
    hideBoxAlert(authAlert);
});

authForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideBoxAlert(authAlert);
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!isAllowedDomain(email)) {
        showBoxAlert(authAlert, 'Use um e-mail institucional @unichristus.edu.br.');
        return;
    }

    authSubmit.disabled = true;
    try {
        if (mode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(credential.user);
        }
    } catch (error) {
        showBoxAlert(authAlert, mapAuthError(error));
    } finally {
        authSubmit.disabled = false;
    }
});

verifyCheckButton.addEventListener('click', async () => {
    hideBoxAlert(verifyAlert);
    try {
        await auth.currentUser?.reload();
        if (!auth.currentUser?.emailVerified) {
            showBoxAlert(verifyAlert, 'Ainda não identificamos a confirmação. Tente novamente em instantes.');
            return;
        }
        updateUserBar(auth.currentUser);
        setView('ready');
    } catch {
        showBoxAlert(verifyAlert, 'Não foi possível checar agora. Tente de novo.');
    }
});

verifyResendButton.addEventListener('click', async () => {
    hideBoxAlert(verifyAlert);
    try {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
        showBoxAlert(verifyAlert, 'E-mail de confirmação reenviado.');
    } catch {
        showBoxAlert(verifyAlert, 'Não foi possível reenviar agora. Tente de novo.');
    }
});

verifySignoutButton.addEventListener('click', () => firebaseSignOut(auth));
userSignoutButton.addEventListener('click', () => firebaseSignOut(auth));

onAuthStateChanged(auth, user => {
    if (!user) {
        authEmail.value = '';
        authPassword.value = '';
        setView('form');
        return;
    }
    if (!user.emailVerified) {
        verifyEmailLabel.textContent = user.email;
        setView('verify');
        return;
    }
    updateUserBar(user);
    setView('ready');
});

window.ProfessorEnadeAuth = {
    getIdToken: async () => {
        const user = auth.currentUser;
        if (!user || !user.emailVerified) return null;
        return user.getIdToken();
    },
};
```

- [ ] **Step 3: Verificar visualmente com o console do navegador**

Run: `npx serve . -p 3000 &`, abrir `http://localhost:3000/professor-enade.html`. Expected: gate mostra o formulário de login (não mais loading infinito), sem erros no console relacionados a `firebase-app.js`/`firebase-auth.js` (erro de config inválida indicaria valor da Task 1 copiado errado). Tentar logar com um e-mail fora do domínio (ex.: `x@gmail.com`) — deve mostrar o alerta inline sem sequer chamar o Firebase. `kill %1` ao final.

- [ ] **Step 4: Apagar o arquivo de handoff**

Os valores já estão copiados dentro de `professor-enade-auth.js`. Apagar `.local-firebase-web-config.json` da raiz do repo — não deve sobrar nem ser commitado.

Run: `rm -f .local-firebase-web-config.json`

- [ ] **Step 5: Commit**

```bash
git add static/js/professor-enade-auth.js
git commit -m "feat: modulo de autenticacao Firebase do PROFESSOR-ENADE

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 6: Anexar o ID token na chamada de geração

**Files:**
- Modify: `static/js/professor-enade.js`

**Interfaces:**
- Consumes: `window.ProfessorEnadeAuth.getIdToken()` (Task 5).

- [ ] **Step 1: Editar `generateQuestion()`**

Em `static/js/professor-enade.js`, a função `generateQuestion` (dentro do `try`) tem:

```js
        try {
            const response = await fetch('/api/generate-professor-enade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
```

Trocar por:

```js
        try {
            const token = await window.ProfessorEnadeAuth?.getIdToken?.();
            const response = await fetch('/api/generate-professor-enade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
```

(o resto do corpo do `fetch` — o `body` com `course`, `itemType`, etc. — não muda).

- [ ] **Step 2: Commit**

```bash
git add static/js/professor-enade.js
git commit -m "feat: anexa o ID token do Firebase na chamada de geracao

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

(Sem teste isolado nesta task — a cobertura vem da Task 7, que exercita o fluxo completo via Playwright.)

---

### Task 7: Testes Playwright — mock de Firebase Auth e gate

**Files:**
- Create: `tests/helpers/mock-firebase-auth.js`
- Modify: `tests/professor-enade.spec.js`

**Interfaces:**
- Produces: `mockFirebaseAuth(page, { email, verified })`, `loginAsVerifiedProfessor(page, email?)` — helpers reutilizáveis por qualquer spec futuro que precise simular um professor logado.

- [ ] **Step 1: Criar o helper de mock**

Criar `tests/helpers/mock-firebase-auth.js`:

```js
// Simula o backend REST do Firebase Identity Toolkit para testes
// Playwright, sem bater na rede real nem exigir credenciais na CI.
// Intercepta as chamadas que o SDK modular do Firebase Auth faz para
// login, cadastro, refresh de token e reload/getAccountInfo.
export async function mockFirebaseAuth(page, { email = 'professor@unichristus.edu.br', verified = true } = {}) {
    const uid = 'test-uid-1';
    const idToken = 'fake-id-token';
    const refreshToken = 'fake-refresh-token';

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#VerifyPasswordResponse',
            localId: uid,
            email,
            idToken,
            registered: true,
            refreshToken,
            expiresIn: '3600',
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:signUp*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#SignupNewUserResponse',
            localId: uid,
            email,
            idToken,
            refreshToken,
            expiresIn: '3600',
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:lookup*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            kind: 'identitytoolkit#GetAccountInfoResponse',
            users: [{
                localId: uid,
                email,
                emailVerified: verified,
                providerUserInfo: [{ providerId: 'password', email }],
                validSince: '1',
                lastLoginAt: String(Date.now()),
                createdAt: String(Date.now()),
            }],
        }),
    }));

    await page.route('**/identitytoolkit.googleapis.com/v1/accounts:sendOobCode*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kind: 'identitytoolkit#GetOobConfirmationCodeResponse', email }),
    }));

    await page.route('**/securetoken.googleapis.com/v1/token*', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            access_token: idToken,
            expires_in: '3600',
            token_type: 'Bearer',
            refresh_token: refreshToken,
            id_token: idToken,
            user_id: uid,
            project_id: 'test-project',
        }),
    }));
}

export async function loginAsVerifiedProfessor(page, email = 'professor@unichristus.edu.br') {
    await mockFirebaseAuth(page, { email, verified: true });
    await page.locator('#enade-auth-email').fill(email);
    await page.locator('#enade-auth-password').fill('senha123456');
    await page.locator('#enade-auth-submit').click();
    await page.locator('#enade-workspace-content').waitFor({ state: 'visible' });
}
```

- [ ] **Step 2: Atualizar o `beforeEach` existente pra logar antes dos testes do Estúdio**

Em `tests/professor-enade.spec.js`, adicionar o import no topo:

```js
import { mockFirebaseAuth, loginAsVerifiedProfessor } from './helpers/mock-firebase-auth.js';
```

E no `test.describe('Página do PROFESSOR-ENADE', ...)`, o `beforeEach` atual:

```js
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/generate-professor-enade', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse),
    }));
    await page.goto('/professor-enade.html');
  });
```

vira:

```js
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/generate-professor-enade', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(apiResponse),
    }));
    await page.goto('/professor-enade.html');
    await loginAsVerifiedProfessor(page);
  });
```

(os 4 testes existentes nesse describe continuam exatamente como estão — só passam a rodar já logados).

- [ ] **Step 3: Rodar a suíte inteira e depurar contra o comportamento real do SDK**

Run: `npx playwright test professor-enade`

Se algum teste travar esperando `#enade-workspace-content` ficar visível, isso indica que o formato de alguma resposta mockada não bate com o que o SDK 12.18.0 realmente espera. Depurar assim: adicionar temporariamente, no início do teste que falha, `page.on('request', r => console.log(r.method(), r.url()))` e `page.on('console', m => console.log('[browser]', m.text()))`, rodar com `npx playwright test professor-enade -g "<nome do teste>" --headed --debug` (ou `--reporter=line` sem `--debug` se preferir só ver o log), identificar qual chamada não foi interceptada ou qual campo da resposta o SDK rejeitou, ajustar o JSON em `mock-firebase-auth.js` de acordo, remover os `console.log` temporários depois de resolver.

Expected ao final: PASS nos 4 testes pré-existentes desse describe.

- [ ] **Step 4: Adicionar os testes novos do gate**

Ainda em `tests/professor-enade.spec.js`, adicionar um novo describe (depois do describe "Página do PROFESSOR-ENADE" já existente):

```js
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
```

- [ ] **Step 5: Rodar tudo de novo**

Run: `npx playwright test professor-enade`

Expected: PASS em todos os testes (contrato + verifyAuth + página + gate).

- [ ] **Step 6: Commit**

```bash
git add tests/helpers/mock-firebase-auth.js tests/professor-enade.spec.js
git commit -m "test: mock de Firebase Auth e cobertura do gate de login

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Rnn2EjQHmsMiBQY8DpVMVT"
```

---

### Task 8: Verificação final, PR e acompanhamento da CI

**Files:** nenhum arquivo novo — só verificação e o fluxo de PR do `CLAUDE.md`.

- [ ] **Step 1: Rodar a suíte completa localmente**

Run: `npm test`

Expected: PASS em tudo — `navigation`, `html-integrity`, `behavior`, `professor-enade`, `professor-enade-auth`. Se `html-integrity` ou `behavior` quebrarem por causa do novo markup (ex.: contagem de elementos, ids duplicados), ajustar o teste que quebrou antes de seguir — não pular.

- [ ] **Step 2: Confirmar que `FIREBASE_SERVICE_ACCOUNT` está na Vercel (Production)**

Run: `vercel env ls` (se o login da Task 1 Step 6 tiver funcionado) — conferir que `FIREBASE_SERVICE_ACCOUNT` aparece para Production. Se não estiver, é bloqueante: sem ela, a geração quebra em produção assim que o PR for mergeado (o handler lança `FIREBASE_SERVICE_ACCOUNT ausente.` e a Task 2 devolve 500 pra todo mundo). Resolver antes de abrir o PR.

- [ ] **Step 3: Push da branch**

Run: `git push origin feat/professor-enade-auth`

- [ ] **Step 4: Abrir o PR**

Run: `gh pr create --base main --fill --body "$(cat <<'EOF'
Porta a lógica de autenticação do professor-enade (React, uso pessoal) para
este site vanilla JS: login/cadastro Firebase restrito a e-mails
@unichristus.edu.br verificados, com verificação do ID token no servidor
via Firebase Admin SDK antes de qualquer geração de questão.

- Projeto Firebase novo e dedicado (Spark, sem cartão)
- Cliente: static/js/professor-enade-auth.js — gate do Estúdio, login/cadastro,
  verificação de e-mail, logout
- Servidor: api/generate-professor-enade.js — verifyAuth() antes de tudo,
  rate limit trocado de por-IP para por-UID
- Spec: docs/superpowers/specs/2026-09-03-professor-enade-auth-design.md
- Plano: docs/superpowers/plans/2026-09-03-professor-enade-auth.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"`

- [ ] **Step 5: Acompanhar a CI**

Run: `gh pr checks --watch`

Expected: `Testes (Playwright)` fica verde. Se falhar, ler o log (`gh run view --log-failed` ou o link do PR), corrigir na branch, `git push` de novo (não force-push) e repetir este step.

- [ ] **Step 6: Reportar pra Vic**

Quando `Testes (Playwright)` estiver verde: avisar a Vic com o link do PR, lembrando que faltam os 2 cliques manuais de setup se ainda não foram feitos (provider de e-mail/senha + domínio autorizado, Task 1 Steps 4-5) e que o teste de verdade do login é em produção, depois do merge — conforme combinado no spec.

(Merge em si fica para Vic decidir/pedir explicitamente, a menos que ela já tenha autorizado merge automático nesta conversa.)
