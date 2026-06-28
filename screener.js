/* Screener view: tab toggle + render the exported scan data.
   Deliberately vanilla JS so it stays independent of the AngularJS calculator. */
(function () {
  'use strict';

  // --- view toggle ---------------------------------------------------------
  var tabs = document.querySelectorAll('.tab');
  var views = document.querySelectorAll('.view');

  function show(viewName) {
    views.forEach(function (v) {
      v.hidden = v.getAttribute('data-view') !== viewName;
    });
    tabs.forEach(function (t) {
      var active = t.getAttribute('data-view') === viewName;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (viewName === 'screener') loadScreener();
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      show(t.getAttribute('data-view'));
    });
  });

  // --- screener rendering --------------------------------------------------
  var loaded = false;

  function fmtMoney(v) {
    return v == null ? '—' : '$' + Number(v).toLocaleString('en-AU', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function fmtPct(v) {
    return v == null ? '—' : (v * 100).toFixed(1) + '%';
  }

  function loadScreener() {
    if (loaded) return;
    loaded = true;
    var body = document.getElementById('screener-body');
    fetch('screener-data.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        loaded = false; // allow retry on next open
        body.innerHTML =
          '<tr><td colspan="7" class="screener__empty">Couldn\'t load screener data (' +
          String(err.message) + '). Run the scanner\'s <code>export</code> to refresh ' +
          '<code>screener-data.json</code>.</td></tr>';
      });
  }

  function render(data) {
    var body = document.getElementById('screener-body');
    var meta = document.getElementById('screener-meta');
    var note = document.getElementById('screener-note');
    var rows = (data && data.results) || [];

    var buys = rows.filter(function (r) { return r.is_buy; }).length;
    if (meta) {
      var when = data.generated_at ? data.generated_at.replace('T', ' ').replace('+00:00', ' UTC') : '';
      meta.textContent = rows.length + ' valued · ' + buys + ' buys';
      meta.title = 'Generated ' + when;
    }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="7" class="screener__empty">No valued stocks yet.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (r) {
      var marginCls = (r.margin != null && r.margin >= 0) ? 'up' : 'down';
      var confCls = r.confidence === 'high' ? 'conf-badge--high' : 'conf-badge--low';
      var signal = r.is_buy
        ? '<span class="signal signal--buy">BUY</span>'
        : '<span class="signal signal--hold">hold</span>';
      return '<tr class="' + (r.is_buy ? 'is-buy' : '') + '">' +
        '<td class="screener__code">' + r.code + '</td>' +
        '<td class="screener__name">' + (r.name || '') + '</td>' +
        '<td class="num">' + fmtMoney(r.price) + '</td>' +
        '<td class="num">' + fmtMoney(r.intrinsic) + '</td>' +
        '<td class="num ' + marginCls + '">' + fmtPct(r.margin) + '</td>' +
        '<td><span class="conf-badge ' + confCls + '">' + (r.confidence || '').toUpperCase() + '</span></td>' +
        '<td>' + signal + '</td>' +
        '</tr>';
    }).join('');

    if (note) {
      var when2 = data.generated_at ? data.generated_at.replace('T', ' ').replace('+00:00', ' UTC') : 'unknown';
      note.innerHTML = 'Snapshot generated ' + when2 +
        '. Data is a point-in-time export from the local scanner — not live, not advice. ' +
        'Defaulted (LOW-confidence) figures can materially overstate value.';
    }
  }
})();
