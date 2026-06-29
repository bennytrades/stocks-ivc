/* DCF calculator (US / cash-flow method). Vanilla JS mirror of scanner/dcf.py.
   Inputs are editable; the value recomputes live. FCF is entered in $ millions;
   everything else is computed in absolute dollars internally. */
(function () {
  'use strict';

  var IDS = ['dcf-fcf', 'dcf-growth', 'dcf-discount', 'dcf-terminal', 'dcf-years', 'dcf-shares', 'dcf-price'];

  function $(id) { return document.getElementById(id); }
  function num(id) { var v = parseFloat(($(id) || {}).value); return isNaN(v) ? null : v; }

  function fmtBig(v) {
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toFixed(0);
  }
  function fmtMoney(v) {
    return (v == null || !isFinite(v)) ? '$-.--'
      : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function compute() {
    var fcfM = num('dcf-fcf');          // millions
    var g1 = num('dcf-growth');
    var r = num('dcf-discount');
    var gt = num('dcf-terminal');
    var years = num('dcf-years');
    var shares = num('dcf-shares');
    var price = num('dcf-price');

    var ok = fcfM != null && fcfM > 0 && shares > 0 && price > 0 && years >= 1 &&
             r != null && gt != null && (r / 100) > (gt / 100);

    if (!ok) {
      $('dcf-intrinsic').textContent = '$-.--';
      setVal('dcf-mos', '--%', '');
      setVal('dcf-verdict', '—', '');
      ['dcf-pv1', 'dcf-tv', 'dcf-pvt', 'dcf-equity'].forEach(function (id) { $(id).textContent = '—'; });
      return;
    }

    var fcf0 = fcfM * 1e6;
    var rr = r / 100, gg = g1 / 100, gtt = gt / 100;
    var n = Math.round(years);

    var pv1 = 0, fcf = fcf0;
    for (var t = 1; t <= n; t++) { fcf *= (1 + gg); pv1 += fcf / Math.pow(1 + rr, t); }
    var tv = fcf * (1 + gtt) / (rr - gtt);
    var pvt = tv / Math.pow(1 + rr, n);
    var equity = pv1 + pvt;
    var intrinsic = equity / shares;
    var mos = (intrinsic - price) / intrinsic;
    var buy = intrinsic > 0 && price < intrinsic;

    $('dcf-intrinsic').textContent = fmtMoney(intrinsic);
    setVal('dcf-mos', (mos * 100).toFixed(1) + '%', mos >= 0 ? 'good-result' : 'bad-result');
    setVal('dcf-verdict', buy ? 'BUY' : 'hold', buy ? 'good-result' : 'bad-result');
    $('dcf-pv1').textContent = fmtBig(pv1);
    $('dcf-tv').textContent = fmtBig(tv);
    $('dcf-pvt').textContent = fmtBig(pvt);
    $('dcf-equity').textContent = fmtBig(equity);
  }

  function setVal(id, text, cls) {
    var el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'val' + (cls ? ' ' + cls : '');
  }

  // Load a stock's DCF assumptions from the screener.
  window.dcfLoadStock = function (data) {
    if (!data) return;
    var d = data.dcf || {};
    var ins = data.inputs || {};
    set('dcf-fcf', d.fcf != null ? (d.fcf / 1e6) : '');
    set('dcf-growth', d.growth_rate);
    set('dcf-discount', d.discount_rate);
    set('dcf-terminal', d.terminal_growth);
    set('dcf-years', d.years);
    set('dcf-shares', ins.outstanding_shares != null ? ins.outstanding_shares : '');
    set('dcf-price', data.price != null ? data.price : ins.current_share_price);
    var code = $('dcf-code'); if (code) code.textContent = data.code || 'DCF';
    var name = $('dcf-name');
    if (name) name.textContent = (data.name || '') + (data.industry ? ' · ' + data.industry : '');
    compute();
  };

  function set(id, v) { var el = $(id); if (el) el.value = (v == null ? '' : v); }

  document.addEventListener('DOMContentLoaded', function () {
    IDS.forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', compute);
    });
    compute();
  });
})();
