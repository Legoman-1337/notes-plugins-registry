/* Плагин «Коммуналка» (utilities). activate(app): app.load/save/toast/close.
 * Данные: { meters: [{id,name,unit,tariff}], months: { "YYYY-MM": { <meterId>: {prev,cur} } } }
 */
(function () {
  var app = null, root = null;
  var month = null;
  var db = { meters: [], months: {} };
  var confirmDeleteId = null;

  var MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить: ' + e); } }
  function money(n) { return String(Math.round(n * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function todayMonth() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
  function monthLabel(m) { var p = m.split('-'); return MONTH_NAMES[parseInt(p[1], 10) - 1] + ' ' + p[0]; }
  function shiftMonth(delta) {
    var p = month.split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + delta, 1);
    month = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    render();
  }
  function prevMonth(m) {
    var p = m.split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 2, 1);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }
  function rec(m, meterId) { return ((db.months[m] || {})[meterId]) || { prev: null, cur: null }; }
  function ensureRec(m, meterId) {
    if (!db.months[m]) db.months[m] = {};
    if (!db.months[m][meterId]) db.months[m][meterId] = { prev: null, cur: null };
    return db.months[m][meterId];
  }

  function render() {
    if (!root) return;
    var html = '';
    html += '<div class="row" style="justify-content:space-between;margin-bottom:8px">'
      + '<button class="btn secondary" data-act="prev-month">◀</button>'
      + '<h2 style="margin:0">' + esc(monthLabel(month)) + '</h2>'
      + '<button class="btn secondary" data-act="next-month">▶</button>'
      + '</div>';

    var grandTotal = 0, hasData = false;
    var cards = '';

    db.meters.forEach(function (meter) {
      var r = rec(month, meter.id);
      var prev = r.prev, cur = r.cur;
      var usage = (prev != null && cur != null && cur >= prev) ? cur - prev : null;
      var cost = usage != null ? usage * (parseFloat(meter.tariff) || 0) : null;
      if (cost != null) { grandTotal += cost; hasData = true; }

      cards += '<div class="card">'
        + '<div class="row" style="justify-content:space-between">'
        + '<b>' + esc(meter.name) + '</b>'
        + '<button class="btn danger small" data-act="ask-del-meter" data-id="' + esc(meter.id) + '">✕</button>'
        + '</div>'
        + '<div class="muted" style="font-size:12px;margin:2px 0 8px">Тариф: '
        + '<input type="number" inputmode="decimal" style="width:90px;padding:4px" value="' + esc(meter.tariff) + '" data-field="tariff" data-id="' + esc(meter.id) + '"> ₽'
        + '</div>'
        + '<div class="row">'
        + '<div class="grow" style="text-align:center"><div class="muted" style="font-size:11px">Предыдущее</div>'
        + '<div class="money" style="font-size:17px">' + (prev != null ? esc(prev) : '—') + '</div></div>'
        + '<div class="grow" style="text-align:center"><div class="muted" style="font-size:11px">Текущее</div>'
        + '<input type="number" inputmode="decimal" style="width:100px" value="' + (cur != null ? esc(cur) : '') + '" data-field="cur" data-id="' + esc(meter.id) + '"></div>'
        + '<div class="grow" style="text-align:center"><div class="muted" style="font-size:11px">Расход</div>'
        + '<div class="money" style="font-size:17px">' + (usage != null ? usage : '—') + '</div></div>'
        + '</div>'
        + (cost != null ? '<div class="money" style="margin-top:8px;text-align:right">Итого: <b>' + money(cost) + ' ₽</b></div>' : '')
        + '</div>';
    });

    if (db.meters.length === 0) {
      html += '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">Счётчиков пока нет</p></div>';
    } else {
      html += cards;
      html += '<div class="card" style="border:1px solid var(--accent);text-align:center;padding:12px">'
        + '<div class="muted" style="font-size:12px">ВСЕГО ЗА МЕСЯЦ</div>'
        + '<div class="money" style="font-size:26px;font-weight:700;margin-top:2px">' + (hasData ? money(grandTotal) + ' ₽' : '—') + '</div>'
        + '<button class="btn secondary" style="margin-top:10px" data-act="carry">Перенести показания на следующий месяц</button>'
        + '</div>';
    }

    // новый счётчик
    html += '<div class="card"><div class="muted" style="font-size:12px;margin-bottom:6px">Добавить счётчик</div>'
      + '<div class="row">'
      + '<input type="text" id="meter-name" class="grow" placeholder="Название (Горячая вода)">'
      + '<input type="number" inputmode="decimal" style="width:90px" id="meter-tariff" placeholder="Тариф ₽">'
      + '<button class="btn" data-act="add-meter">+</button></div></div>';

    root.innerHTML = html;
  }

  function onAction(el) {
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');

    if (act === 'prev-month') return shiftMonth(-1);
    if (act === 'next-month') return shiftMonth(1);
    if (act === 'add-meter') {
      var n = document.getElementById('meter-name'), t = document.getElementById('meter-tariff');
      var name = n ? n.value.trim() : '';
      if (!name) { app.toast('Введите название счётчика'); return; }
      db.meters.push({ id: uid(), name: name, tariff: parseFloat(t && t.value) || 0 });
      save();
      app.toast('Счётчик «' + name + '» добавлен');
      return render();
    }
    if (act === 'ask-del-meter') {
      if (confirmDeleteId === id) {
        db.meters = db.meters.filter(function (m) { return m.id !== id; });
        Object.keys(db.months).forEach(function (m) { delete db.months[m][id]; });
        confirmDeleteId = null;
        save();
        app.toast('Счётчик удалён');
        return render();
      }
      confirmDeleteId = id;
      render();
      var btn = root.querySelector('[data-act="ask-del-meter"][data-id="' + id + '"]');
      if (btn) btn.textContent = 'Точно удалить?';
      return;
    }
    if (act === 'carry') {
      var next = (function () {
        var p = month.split('-');
        var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10), 1);
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
      })();
      var count = 0;
      db.meters.forEach(function (meter) {
        var r = rec(month, meter.id);
        if (r.cur != null) {
          var nr = ensureRec(next, meter.id);
          nr.prev = r.cur;
          if (nr.cur == null) nr.cur = null;
          count++;
        }
      });
      save();
      if (count) { app.toast('Показания перенесены'); shiftMonth(1); }
      else app.toast('Сначала введите текущие показания');
      return;
    }
  }

  function onFieldChange(el) {
    var field = el.getAttribute('data-field');
    var id = el.getAttribute('data-id');
    var meter = null;
    db.meters.forEach(function (m) { if (m.id === id) meter = m; });
    if (!meter) return;
    if (field === 'tariff') { meter.tariff = parseFloat(el.value) || 0; save(); return render(); }
    if (field === 'cur') {
      var r = ensureRec(month, id);
      if (r.prev == null) {
        var pr = rec(prevMonth(month), id);
        r.prev = pr.cur != null ? pr.cur : 0;
      }
      r.cur = parseFloat(el.value) || 0;
      save();
      return render();
    }
  }

  function activate(api) {
    app = api;
    month = todayMonth();
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!(db.meters instanceof Array)) db.meters = [];
    if (!db.months) db.months = {};
    if (db.meters.length === 0 && !db.init) {
      db.meters = [
        { id: uid(), name: 'Холодная вода', tariff: 0 },
        { id: uid(), name: 'Горячая вода', tariff: 0 },
        { id: uid(), name: 'Электричество', tariff: 0 }
      ];
      db.init = true;
      save();
    }

    root = document.getElementById('root');
    root.addEventListener('click', function (event) {
      var el = event.target.closest ? event.target.closest('[data-act]') : null;
      if (el) { event.preventDefault(); onAction(el); }
    });
    root.addEventListener('change', function (event) {
      var el = event.target;
      if (el && el.getAttribute && el.getAttribute('data-field')) onFieldChange(el);
    });
    render();
  }
  function deactivate() { if (db) save(); root = null; app = null; }

  window.plugin = { activate: activate, deactivate: deactivate };
})();
