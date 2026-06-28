/* Screener sidebar: render the exported scan data and, on row click, load the
   stock's figures into the AngularJS calculator (via window.ivcLoadStock).
   Deliberately vanilla JS so it stays independent of the calculator's Angular app. */
(function () {
  'use strict';

  var rowsByCode = {};

  function fmtMoney(v) {
    return v == null ? '—' : '$' + Number(v).toLocaleString('en-AU', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function fmtPct(v) {
    return v == null ? '—' : (v * 100).toFixed(1) + '%';
  }

  document.addEventListener('DOMContentLoaded', loadScreener);

  function loadScreener() {
    var body = document.getElementById('screener-body');
    if (!body) return;
    fetch('screener-data.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        body.innerHTML =
          '<tr><td colspan="6" class="screener__empty">Couldn\'t load screener data (' +
          String(err.message) + '). Re-run the scanner\'s <code>export</code>.</td></tr>';
      });
  }

  function render(data) {
    var body = document.getElementById('screener-body');
    var meta = document.getElementById('screener-meta');
    var note = document.getElementById('screener-note');
    var rows = (data && data.results) || [];

    var buys = rows.filter(function (r) { return r.is_buy; }).length;
    if (meta) {
      meta.textContent = rows.length + ' valued · ' + buys + ' buys';
    }

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="screener__empty">No valued stocks yet.</td></tr>';
      return;
    }

    rowsByCode = {};
    body.innerHTML = rows.map(function (r) {
      rowsByCode[r.code] = r;
      var marginCls = (r.margin != null && r.margin >= 0) ? 'up' : 'down';
      var confCls = r.confidence === 'high' ? 'conf-badge--high' : 'conf-badge--low';
      var signal = r.is_buy
        ? '<span class="signal signal--buy">BUY</span>'
        : '<span class="signal signal--hold">hold</span>';
      return '<tr class="srow ' + (r.is_buy ? 'is-buy' : '') + '" data-code="' + r.code +
        '" tabindex="0" role="button" title="Load ' + r.code + ' into the calculator">' +
        '<td class="screener__code">' + r.code + '</td>' +
        '<td class="num">' + fmtMoney(r.price) + '</td>' +
        '<td class="num">' + fmtMoney(r.intrinsic) + '</td>' +
        '<td class="num ' + marginCls + '">' + fmtPct(r.margin) + '</td>' +
        '<td><span class="conf-badge ' + confCls + '">' + (r.confidence || '').toUpperCase() + '</span></td>' +
        '<td>' + signal + '</td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('.srow').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.getAttribute('data-code')); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(tr.getAttribute('data-code')); }
      });
    });

    if (note) {
      var when = data.generated_at
        ? data.generated_at.replace('T', ' ').replace('+00:00', ' UTC')
        : 'unknown';
      note.innerHTML = 'Snapshot ' + when +
        ' — point-in-time export from the local scanner. Not live, not advice. ' +
        'LOW-confidence figures can materially overstate value.';
    }
  }

  function select(code) {
    var stock = rowsByCode[code];
    if (!stock) return;

    // highlight the active row
    var body = document.getElementById('screener-body');
    body.querySelectorAll('.srow').forEach(function (tr) {
      tr.classList.toggle('is-active', tr.getAttribute('data-code') === code);
    });

    // update the calculator's "loaded stock" banner
    set('loaded-code', stock.code);
    set('loaded-name', (stock.name || '') + (stock.industry ? ' · ' + stock.industry : ''));
    var hint = document.getElementById('loaded-hint');
    if (hint) {
      hint.className = 'loaded__hint loaded__hint--' + (stock.confidence || 'low');
      hint.textContent = (stock.confidence === 'high' ? 'Verified figures' : 'Auto-fetched · verify before trading');
    }

    // push the figures into the Angular calculator
    if (typeof window.ivcLoadStock === 'function') {
      window.ivcLoadStock(stock);
    }

    // on small screens the calculator is above the list — bring it into view
    if (window.matchMedia('(max-width: 980px)').matches) {
      var calc = document.querySelector('.calc');
      if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
