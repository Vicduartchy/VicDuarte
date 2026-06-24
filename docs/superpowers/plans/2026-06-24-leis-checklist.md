# Leis do Edital + Checklist Gamificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar atalhos para as leis cobradas em cada concurso (ALECE, TJ-CE, SEFAZ-CE), com preview de artigos-chave, link externo para a lei completa e checklist de leitura gamificado integrado ao sistema de pontos/badges existente.

**Architecture:** Arquivo único `leis.json` com 18 leis (campo `concursos: [...]` filtra por concurso). Módulo IIFE `leis.js` gerencia fetch, renderização, localStorage e badges. Hub page ganha seção accordion com todas as leis; cada página de concurso ganha 3ª aba "Leis do Edital". Badges de leitura adicionados ao `quiz.js` (com `check: null`) e ganhos via `leis.js`, que escreve nos mesmos keys de localStorage.

**Tech Stack:** HTML5, Bootstrap 5.3.0, vanilla JS (IIFE), Font Awesome 6.4.0, localStorage, Vercel (deploy via push na main)

## Global Constraints

- Bootstrap CDN exato: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css`
- Font Awesome CDN exato: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`
- CSS variables: `--primary: #092140`, `--accent-1: #BF452A`, verde confirmação: `#198754`
- **Sem emojis** em nenhum elemento de UI de leis — apenas ícones Font Awesome
- Paths de `concursos/<concurso>/index.html`: `../../static/` para assets globais, `../` para assets de concursos/
- localStorage keys novos: `lei_lida_<id>` (string `"true"` ou ausente)
- localStorage keys compartilhados com quiz.js: `quiz_<concurso>_pontos` (number string), `quiz_<concurso>_badges` (JSON array)
- Commits: padrão `feat:`, `fix:`, `style:`
- Nunca usar `document.write`, `alert`, `confirm`, `prompt`
- Working directory: `/Users/vicduarte/site vic duarte`

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `concursos/data/leis.json` | Criar | Catálogo único de 18 leis com artigos-chave |
| `concursos/js/leis.js` | Criar | Módulo LeisApp: fetch, render, checklist, badges |
| `concursos/css/concursos.css` | Modificar | Novas classes: `.lei-card`, `.lei-lida`, etc. |
| `concursos/js/quiz.js` | Modificar | Adicionar 3 badge definitions + guard em checkBadges |
| `concursos/index.html` | Modificar | Nova seção "Leis do Edital" + load leis.js |
| `concursos/alece/index.html` | Modificar | 3ª aba "Leis do Edital" + load leis.js |
| `concursos/tjce/index.html` | Modificar | Idem |
| `concursos/sefaz/index.html` | Modificar | Idem |

---

## Task 1: Dados — `concursos/data/leis.json`

**Files:**
- Create: `concursos/data/leis.json`

**Interfaces:**
- Produces: JSON com `{ "leis": [...] }` — 18 entradas, campos: `id`, `nome`, `sigla`, `concursos`, `materia_grupo`, `url`, `pontos_leitura`, `artigos_chave`

- [ ] **Step 1: Criar `concursos/data/leis.json`**

```json
{
  "leis": [
    {
      "id": "cf88",
      "nome": "Constituição Federal de 1988",
      "sigla": "CF/88",
      "concursos": ["alece", "tjce", "sefaz"],
      "materia_grupo": "direito-constitucional",
      "url": "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm",
      "pontos_leitura": 50,
      "artigos_chave": [
        { "ref": "Art. 5º", "desc": "Direitos e garantias fundamentais individuais e coletivos" },
        { "ref": "Art. 37", "desc": "Princípios da Administração Pública (LIMPE)" },
        { "ref": "Art. 60, § 4º", "desc": "Cláusulas pétreas — vedações ao poder constituinte derivado" }
      ]
    },
    {
      "id": "lei8112",
      "nome": "Regime Jurídico dos Servidores Públicos Federais",
      "sigla": "Lei 8.112/90",
      "concursos": ["alece", "tjce", "sefaz"],
      "materia_grupo": "direito-administrativo",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm",
      "pontos_leitura": 30,
      "artigos_chave": [
        { "ref": "Art. 2º", "desc": "Conceito de servidor público" },
        { "ref": "Art. 116-117", "desc": "Deveres e proibições dos servidores" },
        { "ref": "Art. 127-145", "desc": "Regime disciplinar e penalidades" }
      ]
    },
    {
      "id": "lei9826",
      "nome": "Estatuto dos Servidores Públicos do Estado do Ceará",
      "sigla": "Lei 9.826/74",
      "concursos": ["alece"],
      "materia_grupo": "direito-administrativo",
      "url": "https://belt.al.ce.gov.br/index.php/legislacao/proposicoes/leis-ordinarias/1974/62-lei-n-9-826-de-14-de-maio-de-1974",
      "pontos_leitura": 20,
      "artigos_chave": [
        { "ref": "Art. 1º-10", "desc": "Provimento e vacância de cargos" },
        { "ref": "Art. 87-100", "desc": "Direitos e vantagens dos servidores estaduais" },
        { "ref": "Art. 157-175", "desc": "Regime disciplinar estadual" }
      ]
    },
    {
      "id": "lei9784",
      "nome": "Lei do Processo Administrativo Federal",
      "sigla": "Lei 9.784/99",
      "concursos": ["alece", "tjce", "sefaz"],
      "materia_grupo": "direito-administrativo",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l9784.htm",
      "pontos_leitura": 25,
      "artigos_chave": [
        { "ref": "Art. 2º", "desc": "Princípios do processo administrativo" },
        { "ref": "Art. 26-28", "desc": "Intimação e prazos nos processos" },
        { "ref": "Art. 65-66", "desc": "Revisão e anulação de atos administrativos" }
      ]
    },
    {
      "id": "lei8666",
      "nome": "Lei de Licitações e Contratos Administrativos",
      "sigla": "Lei 8.666/93",
      "concursos": ["alece"],
      "materia_grupo": "direito-administrativo",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm",
      "pontos_leitura": 25,
      "artigos_chave": [
        { "ref": "Art. 1º-3", "desc": "Princípios da licitação e âmbito de aplicação" },
        { "ref": "Art. 22-25", "desc": "Modalidades e casos de dispensa/inexigibilidade" },
        { "ref": "Art. 54-80", "desc": "Contratos administrativos — cláusulas e execução" }
      ]
    },
    {
      "id": "ri-alece",
      "nome": "Regimento Interno da ALECE",
      "sigla": "RI ALECE",
      "concursos": ["alece"],
      "materia_grupo": "regimentos",
      "url": "https://www.al.ce.gov.br/index.php/o-legislativo/regimento-interno",
      "pontos_leitura": 20,
      "artigos_chave": [
        { "ref": "Título I", "desc": "Organização e competências da ALECE" },
        { "ref": "Sessões", "desc": "Tipos de sessão, quórum e votações" },
        { "ref": "Comissões", "desc": "Criação, composição e atribuições das comissões" }
      ]
    },
    {
      "id": "cpc",
      "nome": "Código de Processo Civil",
      "sigla": "CPC — Lei 13.105/15",
      "concursos": ["tjce"],
      "materia_grupo": "processo-civil",
      "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm",
      "pontos_leitura": 50,
      "artigos_chave": [
        { "ref": "Art. 1º-12", "desc": "Normas fundamentais e aplicação das normas processuais" },
        { "ref": "Art. 318-373", "desc": "Procedimento comum — petição inicial a sentença" },
        { "ref": "Art. 485-501", "desc": "Sentença e coisa julgada" }
      ]
    },
    {
      "id": "cpp",
      "nome": "Código de Processo Penal",
      "sigla": "CPP — D.L. 3.689/41",
      "concursos": ["tjce"],
      "materia_grupo": "processo-penal",
      "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm",
      "pontos_leitura": 40,
      "artigos_chave": [
        { "ref": "Art. 1º-7", "desc": "Aplicação da lei processual penal" },
        { "ref": "Art. 282-314", "desc": "Medidas cautelares e prisão em flagrante" },
        { "ref": "Art. 381-405", "desc": "Sentença e coisa julgada penal" }
      ]
    },
    {
      "id": "lei9099",
      "nome": "Lei dos Juizados Especiais Cíveis e Criminais",
      "sigla": "Lei 9.099/95",
      "concursos": ["tjce"],
      "materia_grupo": "processo-civil",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l9099.htm",
      "pontos_leitura": 25,
      "artigos_chave": [
        { "ref": "Art. 2º", "desc": "Critérios: oralidade, simplicidade, informalidade, economia processual" },
        { "ref": "Art. 3º-4", "desc": "Competência dos juizados especiais cíveis" },
        { "ref": "Art. 60-92", "desc": "Juizado especial criminal — JECRIM" }
      ]
    },
    {
      "id": "loman",
      "nome": "Lei Orgânica da Magistratura Nacional",
      "sigla": "LOMAN — LC 35/79",
      "concursos": ["tjce"],
      "materia_grupo": "regimentos",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp35.htm",
      "pontos_leitura": 20,
      "artigos_chave": [
        { "ref": "Art. 35-36", "desc": "Deveres e vedações dos magistrados" },
        { "ref": "Art. 40-48", "desc": "Garantias e prerrogativas da magistratura" },
        { "ref": "Art. 49-50", "desc": "Processo administrativo disciplinar dos magistrados" }
      ]
    },
    {
      "id": "ri-tjce",
      "nome": "Regimento Interno do Tribunal de Justiça do Ceará",
      "sigla": "RI TJ-CE",
      "concursos": ["tjce"],
      "materia_grupo": "regimentos",
      "url": "https://www.tjce.jus.br/institucional/regimento-interno/",
      "pontos_leitura": 20,
      "artigos_chave": [
        { "ref": "Competências do TJ", "desc": "Jurisdição e competência originária e recursal" },
        { "ref": "Câmaras e Seções", "desc": "Organização interna e distribuição de processos" },
        { "ref": "Pleno", "desc": "Competências do Pleno do TJ-CE" }
      ]
    },
    {
      "id": "ctn",
      "nome": "Código Tributário Nacional",
      "sigla": "CTN — Lei 5.172/66",
      "concursos": ["sefaz"],
      "materia_grupo": "direito-tributario",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm",
      "pontos_leitura": 50,
      "artigos_chave": [
        { "ref": "Art. 3º", "desc": "Conceito legal de tributo" },
        { "ref": "Art. 96-112", "desc": "Legislação tributária — vigência e aplicação" },
        { "ref": "Art. 113-138", "desc": "Obrigação tributária, fato gerador e crédito tributário" }
      ]
    },
    {
      "id": "lc87",
      "nome": "Lei Kandir — ICMS em Operações Interestaduais",
      "sigla": "LC 87/96",
      "concursos": ["sefaz"],
      "materia_grupo": "direito-tributario",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp87.htm",
      "pontos_leitura": 30,
      "artigos_chave": [
        { "ref": "Art. 2º", "desc": "Fatos geradores do ICMS" },
        { "ref": "Art. 12-13", "desc": "Momento do fato gerador e base de cálculo" },
        { "ref": "Art. 19-23", "desc": "Não-cumulatividade e aproveitamento de crédito" }
      ]
    },
    {
      "id": "lei12670",
      "nome": "Lei do ICMS do Estado do Ceará",
      "sigla": "Lei 12.670/96",
      "concursos": ["sefaz"],
      "materia_grupo": "direito-tributario",
      "url": "https://www.sefaz.ce.gov.br/legislacao-tributaria/icms/lei-12-670-1996/",
      "pontos_leitura": 30,
      "artigos_chave": [
        { "ref": "Art. 1º-3", "desc": "Incidência e não-incidência do ICMS cearense" },
        { "ref": "Art. 25-30", "desc": "Base de cálculo e alíquotas no Ceará" },
        { "ref": "Art. 60-75", "desc": "Obrigações acessórias e documentos fiscais" }
      ]
    },
    {
      "id": "lei4320",
      "nome": "Lei das Finanças Públicas",
      "sigla": "Lei 4.320/64",
      "concursos": ["sefaz"],
      "materia_grupo": "financas-publicas",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l4320.htm",
      "pontos_leitura": 30,
      "artigos_chave": [
        { "ref": "Art. 1º-22", "desc": "Elaboração e controle dos orçamentos públicos" },
        { "ref": "Art. 35-48", "desc": "Receitas e despesas públicas — classificação" },
        { "ref": "Art. 75-82", "desc": "Controle da execução orçamentária" }
      ]
    },
    {
      "id": "lc101",
      "nome": "Lei de Responsabilidade Fiscal",
      "sigla": "LRF — LC 101/00",
      "concursos": ["sefaz"],
      "materia_grupo": "financas-publicas",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm",
      "pontos_leitura": 30,
      "artigos_chave": [
        { "ref": "Art. 1º", "desc": "Responsabilidade na gestão fiscal — conceito e abrangência" },
        { "ref": "Art. 16-17", "desc": "Geração de despesa — estudo de impacto orçamentário" },
        { "ref": "Art. 44-54", "desc": "Transparência fiscal e relatórios obrigatórios" }
      ]
    },
    {
      "id": "lei8429",
      "nome": "Lei de Improbidade Administrativa",
      "sigla": "Lei 8.429/92",
      "concursos": ["sefaz"],
      "materia_grupo": "direito-administrativo",
      "url": "https://www.planalto.gov.br/ccivil_03/leis/l8429.htm",
      "pontos_leitura": 25,
      "artigos_chave": [
        { "ref": "Art. 9º", "desc": "Atos que importam enriquecimento ilícito" },
        { "ref": "Art. 10", "desc": "Atos que causam lesão ao erário" },
        { "ref": "Art. 11", "desc": "Atos que violam os princípios da Administração" }
      ]
    },
    {
      "id": "lc10ce",
      "nome": "Estatuto dos Servidores Públicos do Estado do Ceará",
      "sigla": "LC 10/91",
      "concursos": ["sefaz"],
      "materia_grupo": "direito-administrativo",
      "url": "https://belt.al.ce.gov.br/index.php/legislacao/proposicoes/leis-complementares/1991/462-lei-complementar-n-10-de-04-de-novembro-de-1991",
      "pontos_leitura": 20,
      "artigos_chave": [
        { "ref": "Art. 1º-15", "desc": "Provimento, vacância e posse de cargos" },
        { "ref": "Art. 87-110", "desc": "Vencimentos, vantagens e licenças" },
        { "ref": "Art. 156-180", "desc": "Regime disciplinar e processo administrativo" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Verificar JSON válido**

```bash
node -e "const d=require('./concursos/data/leis.json'); console.log('Total leis:', d.leis.length); ['alece','tjce','sefaz'].forEach(c => console.log(c+':', d.leis.filter(l=>l.concursos.includes(c)).length))"
```

Expected output:
```
Total leis: 18
alece: 6
tjce: 8
sefaz: 10
```

- [ ] **Step 3: Commit**

```bash
git add concursos/data/leis.json
git commit -m "feat: catálogo de leis dos editais CE 2026 (18 leis, 3 concursos)"
```

---

## Task 2: CSS — novas classes em `concursos/css/concursos.css`

**Files:**
- Modify: `concursos/css/concursos.css` (append ao final do arquivo)

**Interfaces:**
- Produces: classes `.lei-card`, `.lei-card.lei-lida`, `.lei-card-header`, `.lei-sigla`, `.lei-nome`, `.lei-concursos`, `.lei-badge-concurso`, `.artigos-chave-list`, `.lei-check-anim`, `.leis-progresso-hub`, `.leis-mini-placar`

- [ ] **Step 1: Adicionar ao final de `concursos/css/concursos.css`**

```css
/* ===== Leis do Edital ===== */

.lei-card {
  border: 1.5px solid rgba(9,33,64,0.12);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fff;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.lei-card.lei-lida {
  border-left: 4px solid #198754;
  background: rgba(25,135,84,0.04);
}
.lei-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.lei-sigla {
  display: inline-block;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--primary);
  margin-bottom: 2px;
}
.lei-nome {
  display: block;
  font-size: 0.9rem;
  color: #343a40;
}
.lei-concursos {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.lei-badge-concurso {
  background: rgba(9,33,64,0.07);
  color: var(--primary);
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.lei-link-externo {
  flex-shrink: 0;
  color: var(--primary);
  border-color: rgba(9,33,64,0.2);
}
.lei-link-externo:hover {
  background: rgba(9,33,64,0.07);
  border-color: var(--primary);
  color: var(--primary);
}
.artigos-chave-list {
  list-style: none;
  padding: 0;
  margin: 0 0 10px 0;
  border-left: 3px solid rgba(9,33,64,0.1);
  padding-left: 12px;
}
.artigos-chave-list li {
  font-size: 0.84rem;
  color: #495057;
  padding: 3px 0;
}
.artigos-chave-list li strong {
  color: var(--primary);
}
@keyframes lei-check-pulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.lei-check-anim {
  animation: lei-check-pulse 0.35s ease;
}
.leis-progresso-hub {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  background: rgba(9,33,64,0.07);
  border-radius: 20px;
  padding: 2px 10px;
  margin-left: 10px;
}
.leis-mini-placar {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: rgba(9,33,64,0.04);
  border-radius: 8px;
  border-left: 3px solid var(--primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add concursos/css/concursos.css
git commit -m "style: classes CSS para lei-cards e checklist de leitura"
```

---

## Task 3: Módulo `concursos/js/leis.js`

**Files:**
- Create: `concursos/js/leis.js`

**Interfaces:**
- Consumes: `concursos/data/leis.json` via fetch; localStorage keys `lei_lida_<id>`, `quiz_<concurso>_pontos`, `quiz_<concurso>_badges`
- Produces: `window.LeisApp` com API pública:
  - `LeisApp.init(concurso)` — chamado em páginas de concurso; fetch relativo `../data/leis.json`
  - `LeisApp.initHub()` — chamado na hub page; fetch relativo `./data/leis.json`
  - `LeisApp.marcarLida(id, concurso)` — toggle lida/não-lida; atualiza card, pontos, badges
  - `LeisApp.getProgresso(concurso)` — retorna `{ lidas: N, total: N, pontos: N }`

- [ ] **Step 1: Criar `concursos/js/leis.js`**

```js
'use strict';

window.LeisApp = (function () {

  var _leis = [];

  var BADGE_DEFS = [
    { id: 'lei_primeira', label: '<i class="fas fa-book-open me-1"></i>Primeira Lei Lida' },
    { id: 'lei_materia',  label: '<i class="fas fa-scale-balanced me-1"></i>Mestre de uma Matéria' },
    { id: 'lei_edital',   label: '<i class="fas fa-landmark me-1"></i>Edital Completo' }
  ];

  /* ── localStorage helpers ──────────────────────────────── */

  function _lida(id) {
    return localStorage.getItem('lei_lida_' + id) === 'true';
  }

  function _getPontos(concurso) {
    return parseInt(localStorage.getItem('quiz_' + concurso + '_pontos') || '0', 10);
  }

  function _setPontos(concurso, pts) {
    localStorage.setItem('quiz_' + concurso + '_pontos', Math.max(0, pts).toString());
  }

  function _getBadges(concurso) {
    try {
      return JSON.parse(localStorage.getItem('quiz_' + concurso + '_badges') || '[]');
    } catch (e) { return []; }
  }

  function _setBadges(concurso, arr) {
    localStorage.setItem('quiz_' + concurso + '_badges', JSON.stringify(arr));
  }

  /* ── Gamificação ───────────────────────────────────────── */

  function _checkBadges(concurso) {
    var earned = _getBadges(concurso);
    var newBadges = [];
    var toLeis = _leis.filter(function (l) { return l.concursos.indexOf(concurso) > -1; });
    var lidasIds = toLeis.filter(function (l) { return _lida(l.id); }).map(function (l) { return l.id; });

    if (earned.indexOf('lei_primeira') === -1 && lidasIds.length >= 1) {
      newBadges.push('lei_primeira');
    }

    if (earned.indexOf('lei_materia') === -1) {
      var grupos = {};
      toLeis.forEach(function (l) {
        if (!grupos[l.materia_grupo]) grupos[l.materia_grupo] = [];
        grupos[l.materia_grupo].push(l.id);
      });
      var completo = Object.keys(grupos).some(function (g) {
        return grupos[g].length > 0 && grupos[g].every(function (id) { return lidasIds.indexOf(id) > -1; });
      });
      if (completo) newBadges.push('lei_materia');
    }

    if (earned.indexOf('lei_edital') === -1 && toLeis.length > 0 && lidasIds.length === toLeis.length) {
      newBadges.push('lei_edital');
    }

    if (newBadges.length > 0) {
      _setBadges(concurso, earned.concat(newBadges));
      newBadges.forEach(function (bid) {
        var def = BADGE_DEFS.filter(function (d) { return d.id === bid; })[0];
        if (def) _showBadgeNotif(def.label);
      });
    }
  }

  function _showBadgeNotif(label) {
    var el = document.getElementById('lei-badge-notif');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lei-badge-notif';
      el.className = 'badge-notification';
      document.body.appendChild(el);
    }
    el.innerHTML = 'Conquista: ' + label;
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  /* ── Renderização ──────────────────────────────────────── */

  function _renderCard(lei, concurso, showConcursos) {
    var lida = _lida(lei.id);
    var pills = showConcursos
      ? lei.concursos.map(function (c) {
          return '<span class="lei-badge-concurso">' + c.toUpperCase() + '</span>';
        }).join('')
      : '';
    var artigos = lei.artigos_chave.map(function (a) {
      return '<li><strong>' + a.ref + '</strong> — ' + a.desc + '</li>';
    }).join('');
    var btnLabel = lida
      ? '<i class="fas fa-circle-check me-1"></i>Lida'
      : '<i class="far fa-circle me-1"></i>Marcar como lida (+' + lei.pontos_leitura + ' pts)';
    var btnClass = lida ? 'btn-success' : 'btn-outline-primary';

    return '<div class="lei-card' + (lida ? ' lei-lida' : '') + '" data-lei-id="' + lei.id + '">' +
      '<div class="lei-card-header">' +
        '<div>' +
          '<span class="lei-sigla">' + lei.sigla + '</span>' +
          '<span class="lei-nome">' + lei.nome + '</span>' +
          (pills ? '<div class="lei-concursos mt-1">' + pills + '</div>' : '') +
        '</div>' +
        '<a href="' + lei.url + '" target="_blank" rel="noopener noreferrer" ' +
           'class="btn btn-sm lei-link-externo" aria-label="Abrir ' + lei.sigla + ' no site oficial">' +
          '<i class="fas fa-arrow-up-right-from-square"></i>' +
        '</a>' +
      '</div>' +
      '<ul class="artigos-chave-list">' + artigos + '</ul>' +
      '<button class="btn btn-sm ' + btnClass + ' lei-marcar-btn mt-2" ' +
              'data-lei-id="' + lei.id + '" data-concurso="' + concurso + '">' +
        btnLabel +
      '</button>' +
    '</div>';
  }

  function _updateCardDOM(id, concurso) {
    var card = document.querySelector('.lei-card[data-lei-id="' + id + '"]');
    if (!card) return;
    var lei = _leis.filter(function (l) { return l.id === id; })[0];
    if (!lei) return;
    var lida = _lida(id);
    var btn = card.querySelector('.lei-marcar-btn');
    if (lida) {
      card.classList.add('lei-lida');
      card.classList.add('lei-check-anim');
      setTimeout(function () { card.classList.remove('lei-check-anim'); }, 400);
      if (btn) {
        btn.className = 'btn btn-sm btn-success lei-marcar-btn mt-2';
        btn.innerHTML = '<i class="fas fa-circle-check me-1"></i>Lida';
      }
    } else {
      card.classList.remove('lei-lida');
      if (btn) {
        btn.className = 'btn btn-sm btn-outline-primary lei-marcar-btn mt-2';
        btn.innerHTML = '<i class="far fa-circle me-1"></i>Marcar como lida (+' + lei.pontos_leitura + ' pts)';
      }
    }
  }

  function _updateProgresso(concurso) {
    var prog = getProgresso(concurso);
    var placar = document.getElementById('leis-placar-' + concurso);
    if (placar) {
      placar.textContent = prog.lidas + '/' + prog.total + ' leis lidas · ' + prog.pontos + ' pts acumulados';
    }
    var hubProg = document.getElementById('leis-prog-' + concurso);
    if (hubProg) {
      hubProg.textContent = prog.lidas + '/' + prog.total + ' lidas';
    }
  }

  function _attachListeners(container, concurso) {
    container.querySelectorAll('.lei-marcar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        marcarLida(this.dataset.leiId, this.dataset.concurso);
      });
    });
  }

  /* ── API pública ───────────────────────────────────────── */

  function marcarLida(id, concurso) {
    var lei = _leis.filter(function (l) { return l.id === id; })[0];
    if (!lei) return;
    var eraLida = _lida(id);
    var pts = _getPontos(concurso);

    if (eraLida) {
      localStorage.removeItem('lei_lida_' + id);
      _setPontos(concurso, pts - lei.pontos_leitura);
    } else {
      localStorage.setItem('lei_lida_' + id, 'true');
      _setPontos(concurso, pts + lei.pontos_leitura);
      _checkBadges(concurso);
    }

    _updateCardDOM(id, concurso);
    _updateProgresso(concurso);
  }

  function getProgresso(concurso) {
    var leis = _leis.filter(function (l) { return l.concursos.indexOf(concurso) > -1; });
    var lidas = leis.filter(function (l) { return _lida(l.id); }).length;
    return { lidas: lidas, total: leis.length, pontos: _getPontos(concurso) };
  }

  function init(concurso) {
    var root = document.getElementById('leis-root');
    if (!root) return;
    fetch('../data/leis.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _leis = data.leis;
        var leis = _leis.filter(function (l) { return l.concursos.indexOf(concurso) > -1; });
        root.innerHTML = leis.map(function (l) { return _renderCard(l, concurso, false); }).join('');
        _attachListeners(root, concurso);
        _updateProgresso(concurso);
      });
  }

  function initHub() {
    fetch('./data/leis.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _leis = data.leis;
        ['alece', 'tjce', 'sefaz'].forEach(function (concurso) {
          var container = document.getElementById('leis-hub-' + concurso);
          if (!container) return;
          var leis = _leis.filter(function (l) { return l.concursos.indexOf(concurso) > -1; });
          container.innerHTML = leis.map(function (l) { return _renderCard(l, concurso, true); }).join('');
          _attachListeners(container, concurso);
          _updateProgresso(concurso);
        });
      });
  }

  return { init: init, initHub: initHub, marcarLida: marcarLida, getProgresso: getProgresso };

})();
```

- [ ] **Step 2: Verificar manualmente no browser**

Abrir `concursos/alece/index.html` via servidor local (`npx serve .` na raiz). Na aba "Leis do Edital":
- Cards das 6 leis da ALECE devem aparecer
- Clicar "Marcar como lida" na CF/88 → card vira verde, botão muda para "Lida", mini-placar atualiza para "1/6 leis lidas · 50 pts acumulados"
- Clicar novamente → desmarca, pontos voltam a 0
- Abrir console → sem erros de JS

- [ ] **Step 3: Commit**

```bash
git add concursos/js/leis.js
git commit -m "feat: módulo LeisApp para checklist de leitura gamificado"
```

---

## Task 4: Badges de leitura em `concursos/js/quiz.js`

**Files:**
- Modify: `concursos/js/quiz.js`

**Interfaces:**
- Consumes: array `BADGES` existente em `quiz.js` (linha ~26)
- Produces: 3 novas entradas no array BADGES com `check: function() { return false; }` (nunca disparadas pelo quiz, apenas pelo leis.js). Guard em `checkBadges` para `b.check` null-safe.

- [ ] **Step 1: Ler `concursos/js/quiz.js` linhas 26-39 e 296-304 para confirmar localização**

Linha ~26: array `BADGES`. Linha ~297: `checkBadges` itera com `b.check(st)`.

- [ ] **Step 2: Adicionar 3 badges ao array BADGES (após a última entrada existente, antes do `];`)**

Localizar:
```js
    { id: 'questoes_100',    label: '🎯 100 Questões',
      check: function(s) { return s.seenIds.length >= 100; } }
  ];
```

Substituir por:
```js
    { id: 'questoes_100',    label: '🎯 100 Questões',
      check: function(s) { return s.seenIds.length >= 100; } },
    { id: 'lei_primeira', label: '<i class="fas fa-book-open me-1"></i>Primeira Lei Lida',
      check: function() { return false; } },
    { id: 'lei_materia',  label: '<i class="fas fa-scale-balanced me-1"></i>Mestre de uma Matéria',
      check: function() { return false; } },
    { id: 'lei_edital',   label: '<i class="fas fa-landmark me-1"></i>Edital Completo',
      check: function() { return false; } }
  ];
```

- [ ] **Step 3: Proteger `checkBadges` contra `check: null` ou `check` que retorne false**

Localizar (linha ~297):
```js
    BADGES.forEach(function(b) {
      if (st.badges.indexOf(b.id) === -1 && b.check(st)) {
```

Substituir por:
```js
    BADGES.forEach(function(b) {
      if (st.badges.indexOf(b.id) === -1 && b.check && b.check(st)) {
```

- [ ] **Step 4: Verificar que quiz ainda funciona**

Abrir `concursos/alece/index.html`, responder uma questão → sidebar de badges deve continuar renderizando. Confirmar que os 3 novos badges aparecem como "locked" (cinza) na sidebar.

- [ ] **Step 5: Commit**

```bash
git add concursos/js/quiz.js
git commit -m "feat: badges de leitura de leis no sistema de gamificação"
```

---

## Task 5: Hub page — seção "Leis do Edital"

**Files:**
- Modify: `concursos/index.html`

**Interfaces:**
- Consumes: `LeisApp.initHub()` de `./js/leis.js`; elementos `#leis-hub-alece`, `#leis-hub-tjce`, `#leis-hub-sefaz`, `#leis-prog-alece`, `#leis-prog-tjce`, `#leis-prog-sefaz`

- [ ] **Step 1: Adicionar seção de leis antes do `<footer>` em `concursos/index.html`**

Localizar a linha com `<footer class="footer-section` e inserir antes dela:

```html
  <section class="py-5 border-top" id="leis-edital">
    <div class="container">
      <div class="text-center mb-4">
        <h2 class="h4 fw-bold text-primary mb-1">
          <i class="fas fa-gavel me-2"></i>Leis do Edital
        </h2>
        <p class="text-muted small mb-0">Acesse as leis cobradas em cada concurso. Marque as que já estudou.</p>
      </div>

      <div class="accordion" id="accordion-leis-hub">

        <div class="accordion-item border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
          <h3 class="accordion-header" id="heading-leis-alece">
            <button class="accordion-button collapsed fw-semibold" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-leis-alece"
                    aria-expanded="false" aria-controls="collapse-leis-alece">
              <i class="fas fa-landmark me-2" style="color:var(--primary)"></i>
              ALECE 2026
              <span class="leis-progresso-hub ms-auto" id="leis-prog-alece">0/6 lidas</span>
            </button>
          </h3>
          <div id="collapse-leis-alece" class="accordion-collapse collapse"
               aria-labelledby="heading-leis-alece" data-bs-parent="#accordion-leis-hub">
            <div class="accordion-body">
              <div id="leis-hub-alece">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="accordion-item border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
          <h3 class="accordion-header" id="heading-leis-tjce">
            <button class="accordion-button collapsed fw-semibold" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-leis-tjce"
                    aria-expanded="false" aria-controls="collapse-leis-tjce">
              <i class="fas fa-scale-balanced me-2" style="color:var(--primary)"></i>
              TJ-CE 2026
              <span class="leis-progresso-hub ms-auto" id="leis-prog-tjce">0/8 lidas</span>
            </button>
          </h3>
          <div id="collapse-leis-tjce" class="accordion-collapse collapse"
               aria-labelledby="heading-leis-tjce" data-bs-parent="#accordion-leis-hub">
            <div class="accordion-body">
              <div id="leis-hub-tjce">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>

        <div class="accordion-item border-0 shadow-sm mb-3 rounded-3 overflow-hidden">
          <h3 class="accordion-header" id="heading-leis-sefaz">
            <button class="accordion-button collapsed fw-semibold" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-leis-sefaz"
                    aria-expanded="false" aria-controls="collapse-leis-sefaz">
              <i class="fas fa-coins me-2" style="color:var(--primary)"></i>
              SEFAZ-CE 2026
              <span class="leis-progresso-hub ms-auto" id="leis-prog-sefaz">0/10 lidas</span>
            </button>
          </h3>
          <div id="collapse-leis-sefaz" class="accordion-collapse collapse"
               aria-labelledby="heading-leis-sefaz" data-bs-parent="#accordion-leis-hub">
            <div class="accordion-body">
              <div id="leis-hub-sefaz">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

```

- [ ] **Step 2: Adicionar `<script src="./js/leis.js"></script>` e chamada `LeisApp.initHub()`**

Localizar o bloco de scripts no final do `<body>` (após `bootstrap.bundle.min.js` e `main.js`). Adicionar antes de `</body>`:

```html
  <script src="./js/leis.js"></script>
  <script>LeisApp.initHub();</script>
```

- [ ] **Step 3: Verificar no browser**

Abrir `concursos/index.html` via servidor local. Expandir accordion "ALECE 2026" → 6 cards de lei aparecem. Marcar CF/88 como lida → contador muda para "1/6 lidas".

- [ ] **Step 4: Commit**

```bash
git add concursos/index.html
git commit -m "feat: seção de leis do edital na hub page com checklist gamificado"
```

---

## Task 6: Páginas de concurso — aba "Leis do Edital"

**Files:**
- Modify: `concursos/alece/index.html`
- Modify: `concursos/tjce/index.html`
- Modify: `concursos/sefaz/index.html`

**Interfaces:**
- Consumes: `LeisApp.init(concurso)` de `../js/leis.js`; elemento `#leis-root`, `#leis-placar-<concurso>`
- Produces: 3ª aba "Leis do Edital" funcional em cada página

### 6A — `concursos/alece/index.html`

- [ ] **Step 1: Adicionar 3ª aba no nav de tabs**

Localizar:
```html
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-resumos" data-bs-toggle="tab" data-bs-target="#resumos"
                        type="button" role="tab">
                  <i class="fas fa-book-open me-2"></i>Resumos
                </button>
              </li>
```

Substituir por:
```html
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-resumos" data-bs-toggle="tab" data-bs-target="#resumos"
                        type="button" role="tab">
                  <i class="fas fa-book-open me-2"></i>Resumos
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="tab-leis" data-bs-toggle="tab" data-bs-target="#leis"
                        type="button" role="tab">
                  <i class="fas fa-gavel me-2"></i>Leis do Edital
                </button>
              </li>
```

- [ ] **Step 2: Adicionar tab pane de leis**

Localizar (dentro de `<div class="tab-content">`):
```html
              <!-- Tab Resumos -->
              <div class="tab-pane fade" id="resumos" role="tabpanel">
```

Antes dessa div, inserir:

```html
              <!-- Tab Leis -->
              <div class="tab-pane fade" id="leis" role="tabpanel">
                <div class="leis-mini-placar" id="leis-placar-alece">0/6 leis lidas · 0 pts acumulados</div>
                <div id="leis-root">
                  <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                </div>
              </div>
```

- [ ] **Step 3: Adicionar script de leis.js e inicialização**

Localizar no final do body:
```html
  <script src="../js/quiz.js"></script>
```

Após essa linha, adicionar:
```html
  <script src="../js/leis.js"></script>
```

Localizar o `<script>` inline que chama `QuizApp.init(...)` e, após ele, adicionar:
```html
  <script>LeisApp.init('alece');</script>
```

### 6B — `concursos/tjce/index.html`

Repetir Steps 1-3 com as diferenças:
- Tab pane ID: `id="leis"`, placar: `id="leis-placar-tjce"`, texto: `0/8 leis lidas · 0 pts acumulados`
- Inicialização: `LeisApp.init('tjce');`

### 6C — `concursos/sefaz/index.html`

Repetir Steps 1-3 com as diferenças:
- Tab pane ID: `id="leis"`, placar: `id="leis-placar-sefaz"`, texto: `0/10 leis lidas · 0 pts acumulados`
- Inicialização: `LeisApp.init('sefaz');`

- [ ] **Step 4: Verificar as 3 páginas no browser**

Para cada página (`alece/`, `tjce/`, `sefaz/`):
1. Aba "Leis do Edital" aparece e abre sem erros
2. Cards de lei carregam (número correto: 6, 8, 10)
3. Clicar "Marcar como lida" → card verde, pontos sobem no mini-placar
4. Sidebar de gamificação mostra os 3 badges de lei como locked
5. Após marcar a primeira lei → badge "Primeira Lei Lida" aparece como notificação e fica unlocked na sidebar na próxima interação com o quiz

- [ ] **Step 5: Commit**

```bash
git add concursos/alece/index.html concursos/tjce/index.html concursos/sefaz/index.html
git commit -m "feat: aba de leis do edital nas páginas ALECE, TJ-CE e SEFAZ-CE"
```

---

## Task 7: Verificação + Deploy

**Files:** Nenhum arquivo novo

- [ ] **Step 1: Rodar suite de testes de navegação**

```bash
npm run test:nav
```

Expected: `33 passed` — todas as suites existentes passando, zero regressões.

- [ ] **Step 2: Verificar fluxo completo no browser**

Via `npx serve .` na raiz do projeto:

1. `/concursos/` — seção "Leis do Edital" visível com 3 accordions
2. Abrir accordion ALECE → 6 cards com sigla, nome, artigos-chave, botão e link externo
3. Marcar CF/88 como lida → verde, contador "1/6 lidas"
4. Desmarcar → volta ao estado original, pontos reduzidos
5. `/concursos/alece/` → aba "Leis do Edital" mostra 6 leis
6. Marcar 1 lei → mini-placar atualiza, notificação "Primeira Lei Lida" aparece
7. Responder quiz → sidebar mostra badge "Primeira Lei Lida" como unlocked
8. `/concursos/tjce/` e `/concursos/sefaz/` → mesma verificação

- [ ] **Step 3: Push para main**

```bash
git push origin main
```

Expected: pre-push hook roda `npm run test:nav`, 33 passed, push liberado. Deploy Vercel em ~30s.

- [ ] **Step 4: Confirmar em produção**

Acessar `vicduarte.site/concursos` e verificar que a seção de leis carrega e o checklist funciona.
