'use strict';

window.QuizApp = (function () {

  var cfg = {};
  var st = {
    questoes: [],
    resumos: [],
    current: null,
    filtroMateria: 'todas',
    seenIds: [],
    revisaoIds: [],
    session: { acertos: 0, total: 0 },
    streak: 0,
    pontos: 0,
    badges: []
  };

  var NIVEIS = [
    { nome: 'Calouro',   min: 0,    icon: '🎓' },
    { nome: 'Candidato', min: 100,  icon: '📖' },
    { nome: 'Aprovado',  min: 500,  icon: '✅' },
    { nome: 'Elite',     min: 1500, icon: '🏆' }
  ];

  var BADGES = [
    { id: 'primeiro_acerto', label: '⭐ Primeiro Acerto',
      check: function(s) { return s.session.acertos >= 1; } },
    { id: 'streak_3',        label: '🔥 Sequência de 3',
      check: function(s) { return s.streak >= 3; } },
    { id: 'streak_10',       label: '💥 10 Seguidas',
      check: function(s) { return s.streak >= 10; } },
    { id: 'questoes_25',     label: '📖 25 Questões',
      check: function(s) { return s.seenIds.length >= 25; } },
    { id: 'questoes_50',     label: '📚 50 Questões',
      check: function(s) { return s.seenIds.length >= 50; } },
    { id: 'questoes_100',    label: '🎯 100 Questões',
      check: function(s) { return s.seenIds.length >= 100; } },
    { id: 'lei_primeira', label: '<i class="fas fa-book-open me-1"></i>Primeira Lei Lida',
      check: function() { return false; } },
    { id: 'lei_materia',  label: '<i class="fas fa-scale-balanced me-1"></i>Mestre de uma Matéria',
      check: function() { return false; } },
    { id: 'lei_edital',   label: '<i class="fas fa-landmark me-1"></i>Edital Completo',
      check: function() { return false; } }
  ];

  /* ── Utilidades ─────────────────────────────────────────── */

  function skey(k) { return 'quiz_' + cfg.concurso + '_' + k; }

  function toSlug(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ── localStorage ──────────────────────────────────────── */

  function loadStorage() {
    try {
      st.seenIds    = JSON.parse(localStorage.getItem(skey('seen'))    || '[]');
      st.revisaoIds = JSON.parse(localStorage.getItem(skey('revisao')) || '[]');
      st.pontos     = parseInt(localStorage.getItem(skey('pontos'))    || '0', 10);
      st.badges     = JSON.parse(localStorage.getItem(skey('badges'))  || '[]');
    } catch (e) { /* ignore */ }
  }

  function saveStorage() {
    try {
      localStorage.setItem(skey('seen'),    JSON.stringify(st.seenIds));
      localStorage.setItem(skey('revisao'), JSON.stringify(st.revisaoIds));
      localStorage.setItem(skey('pontos'),  String(st.pontos));
      localStorage.setItem(skey('badges'),  JSON.stringify(st.badges));
    } catch (e) { /* ignore */ }
  }

  /* ── Nível ─────────────────────────────────────────────── */

  function getNivel() {
    var nivel = NIVEIS[0];
    for (var i = 0; i < NIVEIS.length; i++) {
      if (st.pontos >= NIVEIS[i].min) nivel = NIVEIS[i];
    }
    return nivel;
  }

  /* ── Pool de questões ───────────────────────────────────── */

  function getPool() {
    var pool = st.questoes;
    if (st.filtroMateria !== 'todas') {
      pool = pool.filter(function(q) { return q.materia === st.filtroMateria; });
    }
    var unseen  = pool.filter(function(q) { return st.seenIds.indexOf(q.id) === -1; });
    var revisao = pool.filter(function(q) {
      return st.revisaoIds.indexOf(q.id) !== -1 && st.seenIds.indexOf(q.id) !== -1;
    });
    var rest    = pool.filter(function(q) {
      return st.seenIds.indexOf(q.id) !== -1 && st.revisaoIds.indexOf(q.id) === -1;
    });
    return shuffle(unseen).concat(shuffle(revisao)).concat(shuffle(rest));
  }

  /* ── Quiz flow ──────────────────────────────────────────── */

  function nextQuestion() {
    var pool = getPool();
    if (!pool.length) { showEmptyState(); return; }
    // Se já vimos tudo na seleção atual, mostrar modal de fim
    var unseen = pool.filter(function(q) { return st.seenIds.indexOf(q.id) === -1; });
    if (!unseen.length && st.session.total > 0) {
      showFimSessao(); return;
    }
    st.current = pool[0];
    renderQuestion();
  }

  function renderQuestion() {
    var q = st.current;
    var root = document.getElementById('quiz-root');
    if (!root) return;

    var letras = Object.keys(q.alternativas);
    var altsHtml = letras.map(function(l) {
      var texto = q.alternativas[l];
      return '<button class="alternativa-btn" data-letra="' + l + '" ' +
             'onclick="QuizApp.responder(\'' + l + '\')">' +
             '<strong>' + l + ')</strong> ' + texto +
             '</button>';
    }).join('');

    root.innerHTML =
      '<div class="questao-card card p-4 mb-3">' +
        '<div class="d-flex justify-content-between align-items-center mb-3">' +
          '<span class="materia-pill">' + q.materia + '</span>' +
          (q.subtopico ? '<small class="text-muted">' + q.subtopico + '</small>' : '') +
        '</div>' +
        '<p class="fw-semibold mb-4" style="font-size:1rem">' + q.enunciado + '</p>' +
        '<div id="alternativas">' + altsHtml + '</div>' +
        '<div id="feedback-area" class="mt-3"></div>' +
      '</div>' +
      '<div class="d-flex justify-content-between align-items-center mt-2">' +
        '<button class="btn btn-sm btn-outline-secondary" id="btn-revisao" onclick="QuizApp.marcarRevisao()">' +
          '<i class="fas fa-bookmark me-1"></i>' +
          (st.revisaoIds.indexOf(q.id) !== -1 ? 'Na revisão ✓' : 'Marcar para revisão') +
        '</button>' +
        '<button class="btn btn-primary btn-sm d-none" id="btn-proxima" onclick="QuizApp.proxima()">' +
          'Próxima <i class="fas fa-arrow-right ms-1"></i>' +
        '</button>' +
      '</div>';
  }

  function responder(letraSelecionada) {
    var q = st.current;
    if (!q) return;

    // Marcar como vista
    if (st.seenIds.indexOf(q.id) === -1) st.seenIds.push(q.id);
    st.session.total++;

    var correto = letraSelecionada === q.resposta;

    // Desabilitar todos os botões e marcar visual
    document.querySelectorAll('.alternativa-btn').forEach(function(btn) {
      btn.disabled = true;
      var l = btn.getAttribute('data-letra');
      if (l === q.resposta)                              btn.classList.add('correta-highlight');
      else if (l === letraSelecionada && !correto)       btn.classList.add('errada');
    });

    // Gamificação
    if (correto) {
      st.session.acertos++;
      st.streak++;
      var bonus = st.streak >= 3 ? 2 : 1;
      st.pontos += 10 * bonus;
    } else {
      st.streak = 0;
      st.pontos += 5;
      if (st.revisaoIds.indexOf(q.id) === -1) st.revisaoIds.push(q.id);
    }

    // Feedback
    var fb = document.getElementById('feedback-area');
    if (fb) {
      fb.innerHTML =
        '<div class="alert ' + (correto ? 'alert-success' : 'alert-danger') + ' py-2 mb-2">' +
          (correto
            ? '<i class="fas fa-check-circle me-2"></i><strong>Correto!</strong>'
            : '<i class="fas fa-times-circle me-2"></i><strong>Incorreto.</strong> A resposta correta é <strong>' + q.resposta + '</strong>.') +
        '</div>' +
        '<div class="explicacao-box"><i class="fas fa-lightbulb me-2 text-primary"></i>' + q.explicacao + '</div>';
    }

    var btnP = document.getElementById('btn-proxima');
    if (btnP) btnP.classList.remove('d-none');

    updatePlacar();
    checkBadges();
    saveStorage();
  }

  function proxima() {
    nextQuestion();
  }

  function marcarRevisao() {
    if (!st.current) return;
    var id = st.current.id;
    var idx = st.revisaoIds.indexOf(id);
    if (idx !== -1) { st.revisaoIds.splice(idx, 1); }
    else            { st.revisaoIds.push(id); }
    saveStorage();
    var btn = document.getElementById('btn-revisao');
    if (btn) btn.innerHTML = '<i class="fas fa-bookmark me-1"></i>' +
      (st.revisaoIds.indexOf(id) !== -1 ? 'Na revisão ✓' : 'Marcar para revisão');
  }

  function resetMateria() {
    if (st.filtroMateria === 'todas') {
      st.seenIds = [];
    } else {
      var mat = st.filtroMateria;
      var idsToRemove = st.questoes
        .filter(function(q) { return q.materia === mat; })
        .map(function(q) { return q.id; });
      st.seenIds = st.seenIds.filter(function(id) { return idsToRemove.indexOf(id) === -1; });
    }
    saveStorage();
    st.session = { acertos: 0, total: 0 };
    st.streak  = 0;
    updatePlacar();
    nextQuestion();
  }

  function filtrarMateria(materia) {
    st.filtroMateria = materia;
    st.session = { acertos: 0, total: 0 };
    st.streak  = 0;
    updatePlacar();
    nextQuestion();
  }

  /* ── UI helpers ─────────────────────────────────────────── */

  function updatePlacar() {
    var nivel = getNivel();
    var el;
    el = document.getElementById('pontos-display');  if (el) el.textContent = st.pontos;
    el = document.getElementById('streak-display');  if (el) el.textContent = st.streak;
    el = document.getElementById('nivel-display');   if (el) el.textContent = nivel.icon + ' ' + nivel.nome;
    el = document.getElementById('acertos-display'); if (el) el.textContent = st.session.acertos;
    el = document.getElementById('total-display');   if (el) el.textContent = st.session.total;
    renderProgressBars();
  }

  function renderProgressBars() {
    var container = document.getElementById('progresso-materias');
    if (!container) return;
    var materias = [];
    st.questoes.forEach(function(q) {
      if (materias.indexOf(q.materia) === -1) materias.push(q.materia);
    });
    container.innerHTML = materias.map(function(m) {
      var total = st.questoes.filter(function(q) { return q.materia === m; }).length;
      var seen  = st.questoes.filter(function(q) {
        return q.materia === m && st.seenIds.indexOf(q.id) !== -1;
      }).length;
      var pct = total ? Math.round((seen / total) * 100) : 0;
      return '<div class="mb-2">' +
        '<div class="d-flex justify-content-between mb-1">' +
          '<small class="text-muted">' + m + '</small>' +
          '<small class="text-muted fw-semibold">' + pct + '%</small>' +
        '</div>' +
        '<div class="progress progress-materia">' +
          '<div class="progress-bar bg-primary" role="progressbar" style="width:' + pct + '%" ' +
               'aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"></div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderBadges() {
    var container = document.getElementById('badges-container');
    if (!container) return;
    container.innerHTML = BADGES.map(function(b) {
      var unlocked = st.badges.indexOf(b.id) !== -1;
      return '<span class="badge-conquistado' + (unlocked ? '' : ' locked') + '">' + b.label + '</span>';
    }).join('');
  }

  function checkBadges() {
    BADGES.forEach(function(b) {
      if (st.badges.indexOf(b.id) === -1 && b.check && b.check(st)) {
        st.badges.push(b.id);
        showBadgeNotification(b.label);
        renderBadges();
      }
    });
  }

  function showBadgeNotification(label) {
    var el = document.getElementById('badge-notif');
    if (!el) {
      el = document.createElement('div');
      el.id = 'badge-notif';
      el.className = 'badge-notification';
      document.body.appendChild(el);
    }
    el.innerHTML = '<i class="fas fa-trophy me-2"></i>Conquista: ' + label;
    el.classList.add('show');
    setTimeout(function() { el.classList.remove('show'); }, 3500);
  }

  function showEmptyState() {
    var root = document.getElementById('quiz-root');
    if (!root) return;
    var mat = st.filtroMateria === 'todas' ? 'todas as matérias' : st.filtroMateria;
    root.innerHTML =
      '<div class="text-center py-5">' +
        '<i class="fas fa-check-circle fa-3x text-success mb-3"></i>' +
        '<h4 class="fw-bold">Você já respondeu todas as questões de ' + mat + '!</h4>' +
        '<p class="text-muted">Quer recomeçar do zero?</p>' +
        '<button class="btn btn-primary" onclick="QuizApp.resetMateria()">' +
          '<i class="fas fa-rotate-left me-2"></i>Recomeçar' +
        '</button>' +
      '</div>';
  }

  function showFimSessao() {
    var pct = st.session.total
      ? Math.round((st.session.acertos / st.session.total) * 100) : 0;
    var nivel = getNivel();
    var body = document.getElementById('modalFimSessaoBody');
    if (body) {
      var msg = pct >= 70
        ? '🎉 Excelente desempenho! Continue assim!'
        : pct >= 50
          ? '👍 Bom progresso! Revise os temas errados.'
          : '📖 Revise o conteúdo e tente novamente.';
      body.innerHTML =
        '<div class="text-center mb-4">' +
          '<div class="resultado-circle mb-3">' + pct + '%</div>' +
          '<h5 class="fw-bold">' + st.session.acertos + ' acerto' +
            (st.session.acertos !== 1 ? 's' : '') + ' em ' + st.session.total + ' questão' +
            (st.session.total !== 1 ? 'ões' : '') + '</h5>' +
          '<p class="text-muted">' + msg + '</p>' +
        '</div>' +
        '<p class="mb-1 text-center"><strong>' + st.pontos + '</strong> pontos acumulados</p>' +
        '<p class="mb-0 text-center">' + nivel.icon + ' <strong>' + nivel.nome + '</strong></p>';
    }
    var modalEl = document.getElementById('modalFimSessao');
    if (modalEl && window.bootstrap) {
      new bootstrap.Modal(modalEl).show();
    }
  }

  /* ── Filtros ────────────────────────────────────────────── */

  function renderFiltros() {
    var container = document.getElementById('filtro-materias');
    if (!container) return;
    var materias = [];
    st.questoes.forEach(function(q) {
      if (materias.indexOf(q.materia) === -1) materias.push(q.materia);
    });
    var html = '<div class="d-flex flex-wrap gap-2 filtro-materia" role="group" aria-label="Filtrar por matéria">';
    html += '<input type="radio" class="btn-check" name="filtro" id="f-todas" value="todas" checked autocomplete="off">';
    html += '<label class="btn btn-outline-primary btn-sm" for="f-todas">Todas</label>';
    materias.forEach(function(m, i) {
      var id = 'f-' + i;
      html += '<input type="radio" class="btn-check" name="filtro" id="' + id + '" value="' + m + '" autocomplete="off">';
      html += '<label class="btn btn-outline-primary btn-sm" for="' + id + '">' + m + '</label>';
    });
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('input[type=radio]').forEach(function(inp) {
      inp.addEventListener('change', function() { QuizApp.filtrarMateria(inp.value); });
    });
  }

  /* ── Resumos ────────────────────────────────────────────── */

  function renderResumos() {
    var root = document.getElementById('resumos-root');
    if (!root || !st.resumos.length) return;
    root.innerHTML = st.resumos.map(function(r, i) {
      var subtopicosHtml = r.subtopicos.map(function(s) {
        return '<h5 class="fw-semibold mt-3 mb-2">' + s.titulo + '</h5>' + s.conteudo;
      }).join('');
      return '<div class="accordion-item border-0 mb-2 rounded shadow-sm overflow-hidden">' +
        '<h2 class="accordion-header">' +
          '<button class="accordion-button collapsed" type="button" ' +
                  'data-bs-toggle="collapse" data-bs-target="#resumo-' + i + '" ' +
                  'aria-expanded="false" aria-controls="resumo-' + i + '">' +
            '<i class="fas fa-book-open me-2 text-primary"></i>' + r.materia +
          '</button>' +
        '</h2>' +
        '<div id="resumo-' + i + '" class="accordion-collapse collapse">' +
          '<div class="accordion-body resumo-content">' + subtopicosHtml + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Init ───────────────────────────────────────────────── */

  function init(config) {
    cfg = config;
    loadStorage();

    var spinnerEl = document.getElementById('quiz-root');
    if (spinnerEl) {
      spinnerEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></div>';
    }

    Promise.all([
      fetch(cfg.dataPath).then(function(r) { return r.json(); }),
      fetch(cfg.resumosPath).then(function(r) { return r.json(); })
    ]).then(function(results) {
      st.questoes = results[0].questoes;
      st.resumos  = results[1].resumos;
      renderFiltros();
      renderBadges();
      renderResumos();
      updatePlacar();
      nextQuestion();
    }).catch(function(e) {
      console.error('Erro ao carregar dados:', e);
      var root = document.getElementById('quiz-root');
      if (root) root.innerHTML = '<div class="alert alert-danger">Erro ao carregar questões. Verifique a conexão.</div>';
    });
  }

  return {
    init:           init,
    responder:      responder,
    proxima:        proxima,
    marcarRevisao:  marcarRevisao,
    resetMateria:   resetMateria,
    filtrarMateria: filtrarMateria
  };

}());
