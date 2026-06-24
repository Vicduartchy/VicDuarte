# Leis do Edital + Checklist Gamificado — Design Spec

**Data:** 2026-06-24
**Contexto:** Seção `vicduarte.site/concursos` — adicionar atalhos para as leis cobradas em cada concurso (ALECE, TJ-CE, SEFAZ-CE) com preview de artigos-chave, link externo para a lei completa e checklist de leitura gamificado.

---

## Objetivo

Permitir que o usuário acesse rapidamente as leis do edital de cada concurso, veja os artigos mais cobrados em prova, marque quais já leu e ganhe pontos/badges por isso — tudo integrado ao sistema de gamificação já existente.

---

## Arquitetura

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `concursos/data/leis.json` | Catálogo único de todas as leis, com artigos-chave e concursos onde aparecem |
| `concursos/js/leis.js` | Módulo IIFE: carrega JSON, renderiza cards, gerencia checklist no localStorage |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `concursos/index.html` | Nova seção "Leis do Edital" abaixo dos cards de concurso |
| `concursos/alece/index.html` | 3ª aba "Leis do Edital" + include de `leis.js` |
| `concursos/tjce/index.html` | Idem |
| `concursos/sefaz/index.html` | Idem |
| `concursos/css/concursos.css` | Classes novas: `.lei-card`, `.lei-lida`, `.artigos-chave-list`, `.lei-badge` |

---

## Dados — `concursos/data/leis.json`

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
        { "ref": "Art. 5º", "desc": "Direitos e garantias fundamentais — rol não taxativo" },
        { "ref": "Art. 37", "desc": "Princípios da Adm. Pública: LIMPE" },
        { "ref": "Art. 60, § 4º", "desc": "Cláusulas pétreas — não podem ser abolidas por EC" }
      ]
    }
  ]
}
```

**Leis a incluir por concurso:**

**ALECE (6 leis):** CF/88, Lei 8.112/90 (servidor público), Lei 8.666/93 (licitações), Regimento Interno da ALECE, Lei Estadual nº 9.826/74 (Estatuto dos Servidores do CE), Lei 9.784/99 (processo administrativo)

**TJ-CE (8 leis):** CF/88, Lei 8.112/90, CPC (Lei 13.105/15), CPP (Decreto-Lei 3.689/41), Lei 9.099/95 (juizados especiais), Regimento Interno do TJ-CE, LOMAN (LC 35/79), Lei 9.784/99

**SEFAZ-CE (10 leis):** CF/88, CTN (Lei 5.172/66), Lei 8.112/90, Lei Estadual nº 12.670/96 (ICMS CE), Lei Complementar 87/96 (Lei Kandir), Lei 4.320/64 (AFO), Lei de Responsabilidade Fiscal (LC 101/00), Lei 8.429/92 (improbidade administrativa), Lei 9.784/99, Lei Complementar nº 10/91 (Estatuto dos Servidores Públicos do CE)

**Pontos por lei:**
- CF/88, CTN, CPC, CPP: 50 pts
- Leis de médio porte (8.112, 8.666, 4.320, LC 87/96, LC 101/00): 30 pts
- Regimentos, leis estaduais, leis menores: 15–20 pts

---

## Hub page — Nova seção "Leis do Edital"

Posição: abaixo da seção dos 3 cards de concurso, acima do rodapé.

**Estrutura HTML:**
```
<section class="py-5">
  <div class="container">
    <h2>Leis do Edital</h2>
    <p class="lead">Acesse as leis cobradas em cada concurso. Marque as que já estudou.</p>

    <!-- Accordion: um grupo por concurso -->
    <div class="accordion" id="accordion-leis">

      <!-- Item ALECE -->
      <div class="accordion-item">
        <h3 class="accordion-header">
          ALECE 2026
          <span class="leis-progresso-hub" id="leis-prog-alece">0/6 lidas</span>
        </h3>
        <div class="accordion-collapse">
          <!-- cards de lei, gerados por leis.js -->
          <div id="leis-hub-alece"></div>
        </div>
      </div>

      <!-- Item TJ-CE e SEFAZ-CE: mesma estrutura -->

    </div>
  </div>
</section>
```

**Card de lei (hub):** versão compacta
- Linha única: `[fa-circle-check | fa-circle]` + sigla + nome + badges de concurso onde aparece (pills)
- Hover expande artigos-chave inline (CSS accordion leve, sem Bootstrap)
- Botão "Acessar lei" (`fa-arrow-up-right-from-square`) à direita
- Leis já lidas: fundo com classe `.lei-lida` (borda esquerda verde, ícone `fa-circle-check` verde)

---

## Páginas de concurso — Aba "Leis do Edital"

Adicionada como 3ª aba em cada `concursos/<concurso>/index.html`:

```html
<button class="nav-link" id="tab-leis" data-bs-toggle="tab" data-bs-target="#leis" type="button" role="tab">
  <i class="fas fa-gavel me-2"></i>Leis do Edital
</button>
```

**Conteúdo da aba:**
- Mini-placar no topo: "X/Y leis lidas · N pts acumulados"
- Lista de cards completos para as leis do concurso

**Card completo de lei:**
```
┌──────────────────────────────────────────────────────┐
│  [fa-circle-check verde]  CF/88                       │
│  Constituição Federal de 1988                         │
│                                                       │
│  Artigos mais cobrados:                               │
│  • Art. 5º — Direitos e garantias fundamentais        │
│  • Art. 37 — Princípios da Adm. Pública (LIMPE)      │
│  • Art. 60, § 4º — Cláusulas pétreas                 │
│                                                       │
│  [fa-book-open] Marcar como lida (+50 pts)           │
│  [fa-arrow-up-right-from-square] Lei completa         │
└──────────────────────────────────────────────────────┘
```

Ao clicar "Marcar como lida":
1. `localStorage.setItem('lei_lida_cf88', 'true')`
2. Adiciona 50 pts em `quiz_alece_pontos`
3. Animação CSS breve no card (`.lei-check-anim`, mesma duração do `badge-pop`)
4. Verifica badges de leitura (ver abaixo)
5. Atualiza mini-placar da aba e progresso na hub (se aberta)

---

## Gamificação — Novos badges

Adicionados ao array `BADGES` em `quiz.js`:

| id | label (sem emoji) | ícone FA | condição |
|---|---|---|---|
| `lei_primeira` | Primeira Lei Lida | `fa-book-open` | 1 lei marcada |
| `lei_materia` | Todas as Leis de uma Matéria | `fa-scale-balanced` | todas as leis de D. Constitucional (ou outra) lidas |
| `lei_edital` | Edital Completo | `fa-landmark` | todas as leis do concurso lidas |

**Verificação de badges de leitura:** feita em `leis.js` após cada marcação. Escreve em `quiz_<concurso>_badges` no localStorage — mesmo key que `quiz.js` usa, formato idêntico (`array de ids`). O sidebar de gamificação já existente exibe automaticamente.

**Condição de `lei_materia`:** basta ter lido todas as leis de qualquer `materia_grupo`. Grupos definidos no JSON: `direito-constitucional` (CF/88), `direito-administrativo` (Lei 8.112, Lei 8.666, Lei 9.784), `direito-tributario` (CTN, LC 87/96, Lei 12.670/96), `processo-civil` (CPC, Lei 9.099/95), `financas-publicas` (Lei 4.320/64, LC 101/00). Basta completar um grupo para desbloquear o badge.

---

## Novo módulo — `concursos/js/leis.js`

IIFE `window.LeisApp` com API:

```js
LeisApp.initHub()        // chamado na hub page — renderiza accordion por concurso
LeisApp.init(concurso)   // chamado nas páginas de concurso — renderiza aba Leis
LeisApp.marcarLida(id)   // marca como lida (ação irreversível via UI); salva, adiciona pontos, verifica badges
LeisApp.getProgresso(concurso) // retorna { lidas, total, pontos }
```

**Sem dependência de `quiz.js`** — `leis.js` apenas lê/escreve os mesmos keys de localStorage. Pode ser carregado independentemente em qualquer página.

---

## CSS — novas classes em `concursos.css`

| Classe | Uso |
|---|---|
| `.lei-card` | Card base de lei |
| `.lei-card.lei-lida` | Card com lei marcada como lida (borda esquerda `#198754`, ícone check verde) |
| `.lei-badge-concurso` | Pill indicando em quais concursos a lei aparece |
| `.artigos-chave-list` | Lista dos artigos mais cobrados |
| `.lei-check-anim` | Animação de confirmação ao marcar lida |
| `.leis-progresso-hub` | Mini-placar "X/Y lidas" no accordion da hub |

---

## Constraints técnicas

- Stack: HTML5 + Bootstrap 5.3 + vanilla JS (IIFE, sem ES modules)
- Ícones: Font Awesome 6.4.0 — classes `fas fa-*`
- Cores: `--primary: #092140`, `--accent-1: #BF452A`, verde confirmação: `#198754`
- Sem emojis em nenhum elemento de UI — apenas ícones FA
- localStorage keys novos: `lei_lida_<id>` (boolean string `"true"`)
- localStorage keys compartilhados com quiz.js: `quiz_<concurso>_pontos`, `quiz_<concurso>_badges`
- Fetch de `leis.json`: path relativo `../data/leis.json` (concurso pages) e `./data/leis.json` (hub)
- Commit padrão: `feat:`, `fix:`, `style:`
