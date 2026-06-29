/* Screener sidebar: render the exported scan data and, on row click, load the
   stock's figures into the AngularJS calculator (via window.ivcLoadStock).
   Deliberately vanilla JS so it stays independent of the calculator's Angular app. */
(function () {
  'use strict';

  var rowsByCode = {};
  var currentMarket = 'au';
  var MARKET = {
    au: { file: 'screener-data-au.json', title: 'ASX Value Screener', method: 'clime' },
    us: { file: 'screener-data-us.json', title: 'S&P 500 Value Screener', method: 'dcf' }
  };

  function fmtMoney(v) {
    return v == null ? '—' : '$' + Number(v).toLocaleString('en-AU', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function fmtPct(v) {
    return v == null ? '—' : (v * 100).toFixed(1) + '%';
  }

  // Relative age of the data, from the financial-statement period end.
  // Adapts: days -> weeks -> months. Flags staleness with a colour class.
  function relativeAge(isoDate) {
    if (!isoDate) return { text: '—', cls: '', title: 'No report date' };
    var then = new Date(isoDate + 'T00:00:00');
    if (isNaN(then)) return { text: '—', cls: '', title: 'No report date' };
    var days = Math.floor((Date.now() - then) / 86400000);
    if (days < 0) days = 0;
    var text;
    if (days < 14) text = days + 'd ago';
    else if (days < 70) text = Math.round(days / 7) + 'w ago';
    else text = Math.round(days / 30.44) + 'mo ago';
    var months = days / 30.44;
    var cls = months > 15 ? 'age--stale' : (months > 9 ? 'age--mid' : 'age--fresh');
    return { text: text, cls: cls, title: 'Financials as of ' + isoDate };
  }

  document.addEventListener('DOMContentLoaded', function () {
    // wire the AU/US market toggle
    document.querySelectorAll('.mkt-btn').forEach(function (b) {
      b.addEventListener('click', function () { switchMarket(b.getAttribute('data-market')); });
    });
    loadScreener();
  });

  function switchMarket(mkt) {
    if (mkt === currentMarket || !MARKET[mkt]) return;
    currentMarket = mkt;
    document.querySelectorAll('.mkt-btn').forEach(function (b) {
      var on = b.getAttribute('data-market') === mkt;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var title = document.getElementById('screener-title');
    if (title) title.textContent = MARKET[mkt].title;
    showCalculatorFor(mkt);
    loadScreener();
  }

  // Show the calculator that matches the market's method (Clime for AU, DCF for US).
  function showCalculatorFor(mkt) {
    var method = MARKET[mkt].method;
    document.querySelectorAll('.calc-host .calc').forEach(function (c) {
      c.hidden = c.getAttribute('data-method') !== method;
    });
  }

  function loadScreener() {
    var body = document.getElementById('screener-body');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="7" class="screener__empty">Loading…</td></tr>';
    fetch(MARKET[currentMarket].file, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        body.innerHTML =
          '<tr><td colspan="7" class="screener__empty">Couldn\'t load screener data (' +
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
      body.innerHTML = '<tr><td colspan="7" class="screener__empty">No valued stocks yet.</td></tr>';
      return;
    }

    rowsByCode = {};
    body.innerHTML = rows.map(function (r) {
      rowsByCode[r.code] = r;
      var marginCls = (r.margin != null && r.margin >= 0) ? 'up' : 'down';
      var confCls = r.confidence === 'high' ? 'conf-badge--high' : 'conf-badge--low';
      var age = relativeAge(r.financials_as_of);
      var signal = r.is_buy
        ? '<span class="signal signal--buy">BUY</span>'
        : '<span class="signal signal--hold">hold</span>';
      return '<tr class="srow ' + (r.is_buy ? 'is-buy' : '') + '" data-code="' + r.code +
        '" tabindex="0" role="button" title="Load ' + r.code + ' into the calculator">' +
        '<td class="screener__code">' + r.code + '</td>' +
        '<td class="num">' + fmtMoney(r.price) + '</td>' +
        '<td class="num">' + fmtMoney(r.intrinsic) + '</td>' +
        '<td class="num ' + marginCls + '">' + fmtPct(r.margin) + '</td>' +
        '<td class="age ' + age.cls + '" title="' + age.title + '">' + age.text + '</td>' +
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
    var age = relativeAge(stock.financials_as_of);
    var asOf = stock.financials_as_of ? ' · financials ' + age.text : '';
    set('loaded-name', (stock.name || '') + (stock.industry ? ' · ' + stock.industry : '') + asOf);
    var hint = document.getElementById('loaded-hint');
    if (hint) {
      hint.className = 'loaded__hint loaded__hint--' + (stock.confidence || 'low');
      hint.textContent = (stock.confidence === 'high' ? 'Verified figures' : 'Auto-fetched · verify before trading');
    }

    // push the figures into the matching calculator (Clime for AU, DCF for US)
    if (MARKET[currentMarket].method === 'dcf') {
      if (typeof window.dcfLoadStock === 'function') window.dcfLoadStock(stock);
    } else {
      if (typeof window.ivcLoadStock === 'function') window.ivcLoadStock(stock);
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
