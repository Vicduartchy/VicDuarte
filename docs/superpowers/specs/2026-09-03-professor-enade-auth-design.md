# Autenticação Firebase no PROFESSOR-ENADE — Design Spec

**Data:** 2026-09-03
**Contexto:** `professor-enade.html` é público hoje — qualquer pessoa gera questões via `api/generate-professor-enade.js` sem login. Objetivo: restringir a geração a e-mails `@unichristus.edu.br` verificados, portando **somente a lógica de autenticação** (não o resto do app) do projeto React separado `~/professor-enade` (Firebase project `enade-civil-lean`), mantendo este repositório 100% HTML/CSS/JS puro — sem React, Vite ou Tailwind.

**Fonte portada:** `~/professor-enade/src/shared/firebase/{config,AuthContext}.jsx` e `~/professor-enade/src/features/auth/AuthScreen.jsx` (Firebase JS SDK `^12.18.0`, e-mail/senha, persistência padrão). Essa base **não tem nenhuma verificação server-side** (sem Admin SDK, sem Cloud Functions) — a peça 4 do requisito (verificação do ID token no servidor) é desenhada do zero aqui, não portada.

**Restrição de projeto (`CLAUDE.md`):** tudo em plano gratuito, sem cartão vinculado em nenhum serviço novo. Este design só usa Firebase Auth e-mail/senha (Spark, grátis até 50k MAU) e o Admin SDK para verificar assinatura de token (não usa Cloud Functions, Cloud Storage nem nenhuma feature Blaze). Ao criar o projeto Firebase novo, confirmar plano Spark e zero cartão antes de prosseguir; qualquer passo que peça cartão interrompe a implementação e vira pergunta pra Vic.

---

## Decisões fechadas (via brainstorming)

| Decisão | Escolha |
|---|---|
| Projeto Firebase | **Novo projeto dedicado** (não reaproveita `enade-civil-lean`) — mantém a base de usuários do app React pessoal isolada da base pública/Unichristus deste site |
| Domínio permitido | `@unichristus.edu.br` |
| Escopo do gate | Hero/seção de conformidade **públicos**; só o "Estúdio de elaboração" (formulário + geração) exige login |
| E-mail verificado | **Obrigatório** — checagem de domínio sozinha não prova posse do e-mail; `sendEmailVerification` + bloqueio até `emailVerified === true` |
| Domínios autorizados no Firebase Auth | Só `localhost` (padrão) + `vicduarte.site`. **Sem** previews da Vercel (não dá pra autorizar wildcard `*.vercel.app`) — login é testado localmente durante o dev e validado de fato em produção após merge |
| Rate limit | Troca de por-IP para **por-UID** (mesma janela: 6 req/10min). Remove o limite por IP — deixou de agregar valor real já que toda requisição chega autenticada antes do rate limit. Ressalva registrada: o `Map` continua em memória, então é proteção *best-effort* que reseta a cada cold start — aceitável para o caso de uso (professores autenticados, não público anônimo) |
| Logout | Incluído — barra de usuário acima do Estúdio com e-mail logado + botão "Sair" |
| Persistência de sessão | Padrão do Firebase (`browserLocalPersistence`) — sobrevive a fechar/reabrir o navegador, mesmo comportamento do app React |
| Prevenção de cadastro fora do domínio | Cliente bloqueia a tentativa de cadastro com e-mail fora de `@unichristus.edu.br` (UX). **Não** impede via API do Firebase diretamente (exigiria Blocking Function `beforeCreate`, que pede plano Blaze) — fora de escopo. Efeito prático: mesmo que uma conta com domínio errado seja criada por fora da UI, ela nunca gera uma questão, porque o servidor rejeita qualquer token cujo e-mail não bata com o domínio |

## Fora de escopo

Firestore (quota diária por usuário do app React), Google Sign-In, Cloud Functions / Blocking Functions, qualquer alteração ao fluxo de geração em si (prompt, schema, validação editorial) — só a camada de autenticação.

---

## Arquitetura

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `static/js/professor-enade-auth.js` | Módulo ES (`type="module"`): inicializa Firebase App/Auth, tela de login/cadastro, gate do Estúdio, verificação de e-mail, logout, expõe `window.ProfessorEnadeAuth.getIdToken()` |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `professor-enade.html` | `<script type="module" src="./static/js/professor-enade-auth.js">`; marcação da tela de login/verificação e do wrapper do Estúdio (para o JS mostrar/esconder) |
| `static/css/professor-enade.css` | Classes novas para a tela de login/cadastro e barra de usuário, reaproveitando tokens visuais existentes (`.enade-editor`, `.enade-alert`, `--enade-navy`, `--enade-rust`) |
| `static/js/professor-enade.js` | No `generateQuestion()`, antes do `fetch`: `await window.ProfessorEnadeAuth.getIdToken()` e adiciona `Authorization: Bearer <token>` ao header |
| `api/generate-professor-enade.js` | Inicializa Firebase Admin SDK (module-level, reusa entre invocações warm); nova função `verifyAuth(req)` chamada no início do handler, antes das checagens existentes; troca `getClientIp`/`isRateLimited(ip)` por `isRateLimited(uid)` |
| `package.json` | Adiciona `"dependencies": { "firebase-admin": "^13.x" }` (primeira dependência real do projeto — hoje a função só usa `fetch` cru) |

### Variáveis de ambiente novas (Vercel)

| Nome | Onde é usada | Segredo? |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | `api/generate-professor-enade.js` — JSON da service account, **base64-encoded** (evita escaping de `\n` na `private_key`) | **Sim** — só na Vercel, nunca no repo |

A config do Firebase Web App (`apiKey`, `authDomain`, `projectId`, etc.) **não é segredo** — fica hardcoded em `professor-enade-auth.js`, mesmo padrão de qualquer app Firebase client-side (a segurança real está nas Authorized Domains + nas regras/checagens de servidor, não em esconder essa config).

---

## Fluxo — cliente

1. `professor-enade-auth.js` roda `initializeApp` + `getAuth` no carregamento, chama `onAuthStateChanged`.
2. Enquanto `loading === true`: Estúdio mostra um estado de carregamento leve (evita flash da tela de login pra quem já está logado).
3. Sem usuário → mostra tela de login/cadastro no lugar do Estúdio (hero continua visível).
   - Alternância login/cadastro (mesmo padrão do `AuthScreen.jsx`: um só form, um toggle de modo).
   - Cadastro: valida `email.endsWith('@unichristus.edu.br')` (case-insensitive) **antes** de chamar `createUserWithEmailAndPassword`; mensagem inline se falhar.
   - Sucesso no cadastro → `sendEmailVerification(user)` → mostra tela "confirme seu e-mail" com botão "Reenviar e-mail".
   - Mapa de mensagens de erro (`auth/email-already-in-use`, `auth/invalid-credential`, `auth/invalid-email`, `auth/weak-password`, `auth/too-many-requests`) portado do `AuthScreen.jsx`.
4. Usuário logado mas `emailVerified === false` → mesma tela "confirme seu e-mail" (com botão para `user.reload()` + reavaliar, já que `onAuthStateChanged` não atualiza `emailVerified` sozinho).
5. Usuário logado e verificado → Estúdio aparece; barra de usuário mostra e-mail + "Sair" (`signOut`).
6. `window.ProfessorEnadeAuth.getIdToken()`: retorna `null` se não há usuário verificado, senão `user.getIdToken()` (renova automaticamente se expirado).

## Fluxo — servidor (`api/generate-professor-enade.js`)

Ordem no handler, a partir do topo (antes do que já existe):

1. Método não é `POST` → 405 (já existe, mantém).
2. Extrai `Authorization: Bearer <token>`. Ausente → 401 `{ error: 'Login necessário.' }`.
3. `admin.auth().verifyIdToken(token)` — falha (assinatura inválida, expirado) → 401 `{ error: 'Sessão expirada. Faça login novamente.' }`.
4. `decoded.email_verified !== true` → 403 `{ error: 'Confirme seu e-mail antes de gerar questões.' }`.
5. `!decoded.email?.toLowerCase().endsWith('@unichristus.edu.br')` → 403 `{ error: 'Acesso restrito a e-mails da Unichristus.' }`.
6. Segue fluxo já existente (`GEMINI_API_KEY` presente, `content-length`, `isRateLimited(decoded.uid)`, `parseInput`, `callGemini`, `validateItem`) — inalterado, só troca a chave do rate limit de IP pra `decoded.uid`.

`getClientIp` é removido (não é mais usado em lugar nenhum do arquivo).

---

## Setup de infraestrutura (fora do código, feito durante a implementação)

1. `firebase projects:create` (CLI, já logada como `victoriaduarte.s@gmail.com`) → confirmar plano Spark, zero cartão.
2. Registrar Web App no projeto (`firebase apps:create WEB`) → gera a config pra hardcodar no `professor-enade-auth.js`.
3. **Manual no Console** (não coberto pela CLI): habilitar provider **E-mail/senha** em Authentication → Sign-in method.
4. **Manual no Console**: Authentication → Settings → Authorized domains → adicionar `vicduarte.site` (remove nada, só adiciona).
5. Gerar service account (Project Settings → Service Accounts → Generate new private key), converter o JSON pra base64, salvar como `FIREBASE_SERVICE_ACCOUNT` na Vercel (produção — e preview, se a função precisar rodar em preview deployments; login em si não funciona em preview por causa do domínio, mas a função da API pode ser exercitada com um token gerado localmente).

---

## Testes

A suíte Playwright existente (`npm run test:nav`, `test:html`, `test:behavior`) cobre navegação/integridade/comportamento do site como um todo — vai continuar rodando no pre-push hook e na CI. Não authentica de verdade contra Firebase (sem credenciais de teste na CI); os testes existentes de `professor-enade.html` que dependem do Estúdio visível **vão precisar de ajuste** para o novo gate (ex.: mockar `window.ProfessorEnadeAuth` ou verificar que a tela de login aparece em vez do formulário). Levantar isso explicitamente no plano de implementação — decidir mock vs. skip caso a caso, não adicionar credenciais reais de teste na CI.

---

## Auto-revisão do spec

- Sem "TBD" pendente — todas as decisões da fase de brainstorming estão fechadas na tabela acima.
- Consistência: o fluxo de servidor (seção "Fluxo — servidor") bate com a lista de arquivos modificados e com a ordem de checagens já existente no handler.
- Escopo: focado só em autenticação; a seção "Fora de escopo" existe justamente para não deixar ambíguo se Firestore/Google Sign-In entram.
- Ambiguidade resolvida: "restrição de domínio" está definida precisamente na tabela ("não impede cadastro pela API, impede uso do gerador").
