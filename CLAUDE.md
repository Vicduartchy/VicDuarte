# Vic Duarte — Site Pessoal

Site estático (HTML/CSS/JS puro) de Victoria Duarte — Agile Coach e KCP.

## Stack

- Bootstrap 5.3 + vanilla JS
- CSS custom com variáveis (`--primary: #092140`, `--accent-1: #BF452A`)
- Fonte: Inter (Google Fonts)
- Hospedagem: Vercel (`vicduarte.site`)
- Repo: `github.com/Vicduartchy/VicDuarte`

## Restrição básica do projeto: tudo em plano gratuito

**Premissa inegociável.** Este projeto não tem orçamento pra pagar por nenhum serviço — nem Firebase, nem Vercel, nem qualquer API de IA, nem qualquer outra peça de infra. Qualquer sugestão, plano ou implementação (minha, do Claude Code, ou de qualquer sessão futura) precisa verificar isso **antes** de implementar, não depois.

**Regra prática:** se a documentação oficial de um serviço mencionar que uma feature "requer" um plano pago, um cartão vinculado, ou "upgrade" pra funcionar, isso vira uma **pergunta pra Vic antes de implementar**, nunca uma decisão automática. Nunca vincular cartão de crédito a nenhuma conta/projeto novo sem confirmação explícita e por escrito da Vic.

**Checklist ao criar qualquer projeto/conta novo numa plataforma:**
1. Confirmar que o plano ativado é o gratuito (ex.: Spark no Firebase, Hobby na Vercel), nunca o pago-por-uso
2. Confirmar que nenhum cartão de crédito foi vinculado
3. Se algo exigir cartão pra sequer ser criado, parar e perguntar — não presumir que "só vai ficar dentro da cota grátis mesmo"

**O que já sabemos que exige plano pago (não usar sem aprovação explícita):**
- **Firebase Cloud Storage** — desde fev/2026 exige Blaze (cartão vinculado) mesmo dentro da cota grátis
- **Firebase Auth por SMS/telefone** — exige Blaze; usamos só e-mail/senha, que é gratuito até 50.000 usuários ativos/mês no plano Spark
- **Firebase Cloud Functions** (incluindo Blocking Functions) — geralmente exige Blaze acima de cotas mínimas
- **Vercel**: qualquer feature marcada como "Pro" ou "Enterprise" na doc — o projeto está no Hobby

**O que confirmadamente é gratuito e já está em uso:**
- Firebase Auth (e-mail/senha), Spark plan, sem cartão
- Vercel Hobby (hospedagem + função serverless)
- Gemini API via chave gratuita (`GEMINI_API_KEY`), tier gratuito do Google AI Studio

## Arquivos principais

```
index.html              # Página inicial
consultorias.html       # Consultorias
disciplinas.html        # Disciplinas acadêmicas
livro.html              # Livro
download-livro.html     # Página de download (PT-BR e EN)
palestras.html          # Palestras
publicacoes.html        # Publicações do LinkedIn
ferramentas.html        # Ferramentas (QuickFlow)
professor-enade.html    # PROFESSOR-ENADE: gerador de questões ENADE multi-curso (Engenharia Civil, Arquitetura e Urbanismo)
api/generate-professor-enade.js # Função serverless segura de geração por IA
static/css/style.css    # CSS único do site
static/css/professor-enade.css # Estilos específicos do PROFESSOR-ENADE
static/js/main.js       # JS único do site
static/js/professor-enade.js # Fluxo, renderização e exportação do PROFESSOR-ENADE
static/images/          # Imagens
```

## Testes

```bash
npm test              # roda todos os testes
npm run test:nav      # só navegação e links
npm run test:html     # só integridade HTML
npm run test:behavior # só comportamento JS
npm run test:report   # abre relatório HTML do último run
```

O pre-push hook bloqueia `git push` se testes falharem. O hook executa `npm run test:nav` apenas — a suite de navegação, a mais crítica para regressões.

Use `git push --no-verify` para forçar push em emergência **(só funciona em branches, `main` é protegida — ver seção CI/CD abaixo).**

## CI/CD — main protegida, deploy só via PR verde

**`main` tem branch protection ativa desde 22/08/2026.** Push direto (mesmo por admin/token) é recusado com HTTP 409. Toda mudança precisa passar por:

```
branch nova → commit(s) → push da branch → abrir PR → CI (GitHub Actions) roda
   → se "Testes (Playwright)" passar → merge do PR → main atualizado
   → Vercel detecta o push em main → build → deploy em produção (~30s)
```

Regras configuradas em `Settings → Branches → main`:
- Require status check `Testes (Playwright)` passando (workflow `.github/workflows/ci.yml`)
- `strict: true` — a branch precisa estar atualizada com `main` antes do merge
- `enforce_admins: true` — ninguém pula a fila, nem token de admin
- Sem force-push, sem deleção da branch `main`

```bash
# Fluxo manual (terminal):
git checkout -b feat/minha-mudanca
git add <arquivos> && git commit -m "tipo: descrição"
git push origin feat/minha-mudanca
gh pr create --base main --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```

```bash
# Fluxo automatizado (API do GitHub, sem gh CLI — usado pelo Claude neste repo):
# 1. GET  /repos/.../git/ref/heads/main               → sha atual
# 2. POST /repos/.../git/refs                          → cria branch nova a partir do sha
# 3. PUT  /repos/.../contents/{path}?ref=<branch>       → commit(s) na branch nova
# 4. POST /repos/.../pulls                              → abre PR branch → main
# 5. GET  /repos/.../commits/{sha}/check-runs (polling) → aguarda "Testes (Playwright)" = success
# 6. PUT  /repos/.../pulls/{n}/merge  (merge_method=squash) → merge
# 7. DELETE /repos/.../git/refs/heads/<branch>          → limpa a branch
# → Vercel detecta o push em main e publica sozinho
```

Vercel project ID: `prj_5MGmD0siE0ztl2WT2qUjxz6gxRAU`  
Team: `vic-duartes-projects` (`team_8IfJWZ6dAMniwjiT22ARaIxF`)

## Convenção de commits

Seguir o padrão já estabelecido no histórico:

```
feat: descrição de nova funcionalidade
fix: descrição de correção de bug
docs: atualização de documentação
style: mudança visual/CSS sem alterar comportamento
```

## Agentes disponíveis

- `ux-ui-dev-expert` — auditoria e melhorias de UX/UI com Chrome DevTools
  - Memória persistente em `.claude/agent-memory/ux-ui-dev-expert/`

## Issues conhecidos (a corrigir)

Lista revisada em 22/08/2026 — vários itens antigos já estavam corrigidos e foram removidos daqui.
1. `.icon-box-modern` duplicado em `style.css` (~linha 2030) — não verificado nesta revisão
2. Hero logo com lazy-load desnecessário (bloqueia above-fold) — não verificado nesta revisão

Resolvidos nesta revisão (não reabrir sem checar antes):
- ~~Tags HTML malformadas em index.html/publicacoes.html~~ — sem vazamento de tag hoje
- ~~Meta description ausente~~ — presente em todas as páginas testadas
- ~~Copyright 2025~~ — todos os footers em 2026
- ~~Back-to-top sem handler~~ — handler presente e funcional em `main.js`
- ~~3 links `href="#"` mortos em `consultorias.html` e `palestras.html`~~ — corrigido (agora abrem `#contactModal`)
