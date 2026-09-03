# Painel Administrativo do PROFESSOR-ENADE — Design Spec

**Data:** 2026-09-03
**Contexto:** Épico 3 do backlog (fora deste repo). Depende da autenticação Firebase já implementada (PRs #24/#25 — `docs/superpowers/specs/2026-09-03-professor-enade-auth-design.md`). Objetivo: professores com acesso de admin conseguem ver métricas de uso do gerador (quem gerou, quantas questões, quando, de qual curso); professores comuns não veem esse painel.

**Restrição de projeto (`CLAUDE.md`):** tudo em plano gratuito, sem cartão vinculado. Confirmado antes de desenhar: Firestore no plano Spark é gratuito e sem cartão, com cota diária de 50.000 leituras / 20.000 escritas / 20.000 exclusões e 1 GiB de armazenamento — [firebase.google.com/docs/firestore/quotas](https://firebase.google.com/docs/firestore/quotas). Para o volume esperado (dezenas de professores, algumas gerações por dia), fica muito abaixo da cota. Ao criar o banco Firestore no projeto `professor-enade-vicduarte`, confirmar que nenhum cartão é solicitado antes de prosseguir; se algo pedir Blaze, para e vira pergunta pra Vic.

---

## Decisões fechadas (via brainstorming)

| Decisão | Escolha |
|---|---|
| Mecanismo de admin | **Coleção `admins` no Firestore** (não custom claims) — Firestore já entra no projeto pelo registro de uso, então não é infraestrutura nova; dá controle direto a Vic via Console (sem depender de script) e efeito imediato (sem espera de refresh de token) |
| Painel: página ou seção | **Página nova** `professor-enade-admin.html`, separada de `professor-enade.html` — mantém a página do gerador leve pro caso comum e evita duplicar a lógica de gate parcial (hero público + estúdio gated) |
| Onde a checagem de admin acontece | **No servidor**, no novo endpoint `api/admin-metrics.js` — nunca só no cliente |
| Escrita do evento de uso | **Awaited**, dentro do handler principal, antes da resposta — evita perda silenciosa por corte da function após a resposta ser enviada |
| Isolamento de falha da escrita | **Try/catch próprio**, separado do try/catch da geração — falha ao gravar métrica loga e segue; nunca derruba a resposta 200 pro professor |
| Acesso do cliente ao Firestore | **Nenhum** — nem a escrita de uso nem a leitura de métricas passam pelo SDK client-side do Firestore. Tudo via Admin SDK dentro das funções serverless. Regras do Firestore negam tudo por padrão (`allow read, write: if false`) |

## Fora de escopo

Gráficos/visualizações sofisticadas (fica em números e listas simples por ora), exportação de dados, edição de admins pela própria UI do painel (adicionar/remover admin continua manual, direto no Console do Firestore), qualquer alteração ao fluxo de geração em si além da escrita do evento.

---

## Arquitetura

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `api/admin-metrics.js` | Verifica token (reaproveita `verifyAuth`), verifica se `uid` está em `admins/{uid}`, consulta `geracoes` e devolve métricas agregadas |
| `professor-enade-admin.html` | Página do painel — gate de login (reaproveita o mesmo módulo de auth) + gate de admin, renderiza os números |
| `static/js/professor-enade-admin.js` | Busca `/api/admin-metrics`, renderiza os cards/listas |
| `firestore.rules` | Nega leitura/escrita direta do cliente em `geracoes` e `admins` |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `api/generate-professor-enade.js` | Após o 200 de sucesso: grava 1 documento em `geracoes` (Admin SDK), `await`ado, em try/catch isolado que só loga em caso de falha |
| `static/js/professor-enade-auth.js` | Nenhuma mudança de lógica — reaproveitado como está pela página de admin (login/verificação de e-mail já funcionam do jeito que são) |

### Setup de infraestrutura (fora do código)

1. Criar o banco Firestore no projeto `professor-enade-vicduarte` (modo Native, uma região) — confirmar Spark/sem cartão antes de prosseguir.
2. Publicar `firestore.rules` (nega tudo por padrão).
3. Criar manualmente o primeiro doc em `admins/{uid do Vic}` — via Console do Firestore, depois que o Vic tiver uma conta logada no app (precisa do `uid` real, que só existe após o primeiro login).

---

## Estrutura de dados

```
geracoes/{autoId}              ← 1 doc por geração aprovada (200 OK)
  uid: string
  email: string
  curso: "engenharia-civil" | "arquitetura-urbanismo"
  tipoItem: "multiple-choice" | "discursive"
  criadoEm: Timestamp (serverTimestamp do Firestore)

admins/{uid}                   ← 1 doc por admin — chave do documento é o próprio uid
  email: string                ← só pra facilitar leitura/identificação no Console
```

`firestore.rules`:

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

(Tudo passa pelo Admin SDK, que ignora essas regras por ser uma credencial privilegiada — as regras aqui são só a rede de segurança contra acesso direto do cliente.)

---

## Fluxo — escrita do evento (`api/generate-professor-enade.js`)

Inserido logo depois do `console.info('[PROFESSOR-ENADE] Sucesso...')` e **antes** do `return res.status(200)...`:

```js
try {
  await getFirestore().collection('geracoes').add({
    uid: auth.uid,
    email: auth.email,
    curso: input.course,
    tipoItem: input.itemType,
    criadoEm: FieldValue.serverTimestamp(),
  });
} catch (logError) {
  console.error('[PROFESSOR-ENADE] Falha ao registrar evento de uso (geração segue normal):', logError);
}

return res.status(200).json({ ... });
```

Isso exige que `verifyAuth` passe a devolver também `email` (hoje só devolve `{ ok: true, uid }`) — pequeno ajuste no retorno de sucesso de `verifyAuth`, sem mudar sua lógica de validação.

## Fluxo — leitura de métricas (`api/admin-metrics.js`)

1. Método não é `GET` → 405.
2. `verifyAuth(req, ...)` — mesma checagem já usada em `generate-professor-enade.js` (token válido, e-mail verificado, domínio Unichristus). Falha → mesmo status/mensagem já padronizados.
3. Lê `admins/{auth.uid}` no Firestore. Não existe → 403 `{ error: 'Acesso restrito a administradores.' }`.
4. Consulta `geracoes` (uma leitura direta da coleção — na escala esperada, sem paginação por ora) e agrega em memória:
   - `total`: contagem geral
   - `porProfessor`: `{ email: count }`
   - `porCurso`: `{ curso: count }`
   - `ultimos7Dias`, `ultimos30Dias`: contagem filtrando `criadoEm` pelo corte de data
5. Devolve `200 { total, porProfessor, porCurso, ultimos7Dias, ultimos30Dias }`.

## Fluxo — painel (`professor-enade-admin.html` + `professor-enade-admin.js`)

1. Reaproveita o mesmo gate de login/verificação de e-mail do módulo de auth existente (login com e-mail Unichristus verificado).
2. Logado e verificado → chama `GET /api/admin-metrics` com o ID token.
3. `403` (não é admin) → mostra mensagem "Esta área é restrita a administradores." em vez do painel — **não tenta esconder isso só via CSS/JS**: o servidor já recusou os dados, então não há nada sensível pra vazar mesmo que alguém inspecione o HTML.
4. `200` → renderiza os números (cards de total/7 dias/30 dias, lista por professor, lista por curso).

---

## Auto-revisão do spec

- Sem "TBD" pendente — as duas confirmações da última rodada (await + try/catch isolado) estão explícitas no fluxo de escrita.
- Consistência: o endpoint de métricas reaproveita `verifyAuth` da mesma forma que `generate-professor-enade.js` já faz — mesmo padrão, sem lógica de auth duplicada ou divergente.
- Escopo: painel fica só leitura de métricas agregadas; gestão de admins continua manual (Console), como decidido — evita escopo extra (UI de gestão de admins) não pedido.
- Ambiguidade resolvida: "checagem no servidor" está definida precisamente — nem escrita nem leitura de dados de uso passam pelo Firestore client-side em nenhum momento.
