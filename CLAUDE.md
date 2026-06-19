# Vic Duarte — Site Pessoal

Site estático (HTML/CSS/JS puro) de Victoria Duarte — Agile Coach e KCP.

## Stack

- Bootstrap 5.3 + vanilla JS
- CSS custom com variáveis (`--primary: #092140`, `--accent-1: #BF452A`)
- Fonte: Inter (Google Fonts)
- Hospedagem: Vercel (`vicduarte.site`)
- Repo: `github.com/Vicduartchy/VicDuarte`

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
static/css/style.css    # CSS único do site
static/js/main.js       # JS único do site
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

O pre-push hook bloqueia `git push` se testes falharem. O hook executa `npm run test:nav` apenas — a suite de navegação, a mais crítica para regressões — evitando bloqueios por bugs conhecidos nas outras suites.

Use `git push --no-verify` para forçar push em emergência.

**Testes que falham intencionalmente** (bugs conhecidos a corrigir):
- back-to-top visível após scroll (handler ausente em main.js)
- meta description ausente em todas as páginas
- copyright 2025 → 2026
- tags HTML malformadas em index.html e publicacoes.html

## CI/CD — Deploy automático

**Todo push para `main` dispara deploy automático na Vercel.**

```bash
# Fluxo padrão para publicar mudanças:
git add <arquivos>
git commit -m "tipo: descrição da mudança"
git push origin main
# → Vercel detecta o push e faz deploy em ~30s para vicduarte.site
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

Ver relatório completo do agente UX/UI. Prioridade:
1. Tag `</h5>` malformada em `index.html:261`
2. Texto `/h5>` visível em `publicacoes.html:220`
3. Back-to-top button sem handler JS em `main.js`
4. `.icon-box-modern` duplicado em `style.css` (~linha 2030)
5. Hero logo com lazy-load desnecessário (bloqueia above-fold)
6. Nenhuma página tem `<meta name="description">`
7. Copyright 2025 em todos os footers (deveria ser 2026)
