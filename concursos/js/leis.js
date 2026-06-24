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
