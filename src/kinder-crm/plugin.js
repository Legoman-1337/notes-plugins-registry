/* Плагин «Журнал и Табель» (kinder-crm) для заметок. v1.1
 * Контракт: activate(app) — app это мост к приложению:
 *   app.load() — данные плагина (JSON-строка), app.save(json), app.toast(text), app.close()
 * Данные: { children: [{id,name,group,fee,lessons}], months: { "YYYY-MM": { <childId>: {att:{день:1}, pay:[{d,a}] } } } }
 * Интерфейс повторяет бумажный журнал: страница «Платежи» (левая) и страница «Табель» (правая).
 */
(function () {
  var app = null;
  var root = null;
  var db = { children: [], months: {} };
  var month = null;    // "YYYY-MM"
  var group = null;    // выбранная группа или "all"
  var page = 'pay';    // "pay" — Платежи, "att" — Табель
  var expanded = null; // id раскрытой карточки ребёнка
  var confirmDeleteId = null;

  var MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var DEFAULT_GROUPS = ['МКЦ-1', 'МКЦ-2', 'Индивидуально'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function todayMonth() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
  }
  function daysInMonth(m) {
    var p = m.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10), 0).getDate();
  }
  function monthLabel(m) {
    var p = m.split('-');
    return MONTH_NAMES[parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  function shiftMonth(delta) {
    var p = month.split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + delta, 1);
    month = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
    render();
  }
  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function save() {
    try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить: ' + e); }
  }
  function groups() {
    var seen = {}, list = [];
    DEFAULT_GROUPS.concat(db.children.map(function (c) { return c.group; })).forEach(function (g) {
      if (g && !seen[g]) { seen[g] = 1; list.push(g); }
    });
    return list;
  }
  function visibleChildren() {
    return db.children.filter(function (c) { return group === 'all' || c.group === group; });
  }
  function record(childId) {
    var m = db.months[month] || {};
    return m[childId] || { att: {}, pay: [] };
  }
  function ensureRecord(childId) {
    if (!db.months[month]) db.months[month] = {};
    if (!db.months[month][childId]) db.months[month][childId] = { att: {}, pay: [] };
    var r = db.months[month][childId];
    if (!r.att) r.att = {};
    if (!r.pay) r.pay = [];
    return r;
  }
  function paidSum(r) {
    return (r.pay || []).reduce(function (sum, p) { return sum + (parseInt(p.a, 10) || 0); }, 0);
  }
  function attendanceCount(r) {
    return Object.keys(r.att || {}).filter(function (k) { return r.att[k]; }).length;
  }
  function money(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* ---------- общая шапка ---------- */

  function render() {
    if (!root) return;
    var children = visibleChildren();
    var expected = 0, paid = 0, visits = 0;
    children.forEach(function (c) {
      var r = record(c.id);
      expected += parseInt(c.fee, 10) || 0;
      paid += paidSum(r);
      visits += attendanceCount(r);
    });

    var html = '';
    html += '<div class="row" style="justify-content:space-between;margin-bottom:8px">'
      + '<button class="btn secondary" data-act="prev-month">◀</button>'
      + '<h2 style="margin:0">' + esc(monthLabel(month)) + '</h2>'
      + '<button class="btn secondary" data-act="next-month">▶</button>'
      + '</div>';

    html += '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">'
      + '<button class="chip' + (group === 'all' ? ' active' : '') + '" data-act="group" data-group="all">Все</button>';
    groups().forEach(function (g) {
      html += '<button class="chip' + (group === g ? ' active' : '') + '" data-act="group" data-group="' + esc(g) + '">' + esc(g) + '</button>';
    });
    html += '</div>';

    // Две страницы, как разворот в бумажном журнале
    html += '<div class="row" style="gap:6px;margin-bottom:8px">'
      + '<button class="chip grow' + (page === 'pay' ? ' active' : '') + '" data-act="page" data-page="pay">💵 Платежи</button>'
      + '<button class="chip grow' + (page === 'att' ? ' active' : '') + '" data-act="page" data-page="att">✓ Табель</button>'
      + '</div>';

    html += '<div class="card money" style="padding:8px 12px"><div class="row" style="justify-content:space-between">'
      + '<span class="muted">Оплачено: <b>' + money(paid) + '</b> из ' + money(expected) + ' ₽</span>'
      + '<span class="muted">Занятий: <b>' + visits + '</b></span>'
      + '</div>'
      + '<div style="height:6px;border-radius:3px;background:var(--surface2);margin-top:6px;overflow:hidden">'
      + '<div style="height:100%;width:' + (expected > 0 ? Math.min(100, Math.round(paid * 100 / expected)) : 0) + '%;background:var(--accent)"></div>'
      + '</div></div>';

    html += page === 'pay' ? pagePayments(children) : pageAttendance(children);

    html += '<div class="card" style="text-align:center;padding:10px">'
      + '<button class="btn" data-act="show-add">+ Ребёнок</button></div>';

    if (showAdd) html += addFormHtml();

    root.innerHTML = html;
  }

  /* ---------- страница «Платежи» (как левая страница журнала) ---------- */

  function pagePayments(children) {
    if (children.length === 0) {
      return '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">В этой группе пока нет детей</p></div>';
    }
    var html = '';
    children.forEach(function (c, number) {
      var r = record(c.id);
      var fee = parseInt(c.fee, 10) || 0;
      var p = paidSum(r);
      var open = expanded === c.id;

      // Строка ребёнка: № | Имя | занятий | абонемент | оплачено
      html += '<div class="card" style="padding:0;overflow:hidden">'
        + '<div class="row money" data-act="toggle-expand" data-child="' + esc(c.id) + '" style="cursor:pointer;padding:10px 12px;gap:10px">'
        + '<span class="muted" style="width:16px">' + (number + 1) + '</span>'
        + '<div class="grow" style="min-width:0"><b>' + esc(c.name) + '</b>'
        + '<div class="muted" style="font-size:11px">' + esc(c.group) + '</div></div>'
        + '<div style="text-align:right">'
        + '<div>' + (c.lessons ? esc(c.lessons) + ' зан.' : '—') + ' · ' + money(fee) + ' ₽</div>'
        + '<div style="font-size:12px;color:' + (fee > 0 && p >= fee ? 'var(--accent)' : 'var(--muted)') + '">оплачено ' + money(p) + ' ₽</div>'
        + '</div>'
        + '<span class="muted">' + (open ? '▾' : '▸') + '</span>'
        + '</div>';

      if (open) {
        // оплаты по датам — как записано в журнале
        html += '<div style="padding:4px 12px 10px;border-top:1px solid var(--border)">';
        html += '<div class="muted" style="font-size:11px;margin:8px 0 4px">ОПЛАТЫ</div>';
        if ((r.pay || []).length === 0) {
          html += '<div class="muted" style="font-size:13px">пока ничего не оплачено</div>';
        } else {
          (r.pay || []).forEach(function (pay, index) {
            html += '<div class="row money" style="justify-content:space-between;padding:3px 0">'
              + '<span>' + esc(pay.d) + '</span>'
              + '<b>' + money(pay.a) + ' ₽</b>'
              + '<button class="btn danger small" data-act="del-pay" data-child="' + esc(c.id) + '" data-index="' + index + '">✕</button>'
              + '</div>';
          });
        }
        html += '<div class="row" style="margin-top:8px">'
          + '<input type="number" inputmode="numeric" style="width:64px" placeholder="День" id="pay-day-' + esc(c.id) + '" value="' + new Date().getDate() + '">'
          + '<input type="number" inputmode="numeric" class="grow" placeholder="Сумма ₽" id="pay-amount-' + esc(c.id) + '">'
          + '<button class="btn small" data-act="add-pay" data-child="' + esc(c.id) + '">+ Оплата</button>'
          + '</div>';

        // редактирование абонемента
        html += '<div class="row" style="margin-top:10px">'
          + '<input type="number" inputmode="numeric" style="width:100px" placeholder="Абонемент ₽" value="' + (c.fee || '') + '" data-field="fee" data-child="' + esc(c.id) + '">'
          + '<input type="number" inputmode="numeric" style="width:80px" placeholder="Занятий" value="' + (c.lessons || '') + '" data-field="lessons" data-child="' + esc(c.id) + '">'
          + '<button class="btn danger small" data-act="' + (confirmDeleteId === c.id ? 'confirm-del-child' : 'ask-del-child') + '" data-child="' + esc(c.id) + '">'
          + (confirmDeleteId === c.id ? 'Точно удалить?' : 'Удалить') + '</button>'
          + '</div>';
        html += '</div>';
      }
      html += '</div>';
    });
    return html;
  }

  /* ---------- страница «Табель» (как правая страница журнала) ---------- */

  function pageAttendance(children) {
    if (children.length === 0) {
      return '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">В этой группе пока нет детей</p></div>';
    }
    var total = daysInMonth(month);
    var header = '';
    for (var d = 1; d <= total; d++) {
      header += '<th>' + d + '</th>';
    }
    var rows = '';
    children.forEach(function (c) {
      var r = record(c.id);
      rows += '<tr>'
        + '<td class="namecol">' + esc(c.name) + '</td>';
      for (var d = 1; d <= total; d++) {
        rows += '<td><button class="day' + (r.att[d] ? ' on' : '') + '" data-act="toggle-day" data-child="' + esc(c.id) + '" data-day="' + d + '">' + (r.att[d] ? '+' : '') + '</button></td>';
      }
      rows += '<td class="money"><b>' + attendanceCount(r) + '</b></td>';
      rows += '</tr>';
    });
    var legend = '<div class="muted" style="font-size:11px;margin:6px 2px">Нажмите клетку — поставится «+» (был на занятии). Последний столбец — сколько раз за месяц.</div>';
    return '<div class="card" style="padding:8px;overflow-x:auto">'
      + '<table class="atttable"><thead><tr><th class="namecol">Ребёнок</th>' + header + '<th>Итог</th></tr></thead>'
      + '<tbody>' + rows + '</tbody></table>'
      + '</div>' + legend;
  }

  var showAdd = false;
  function addFormHtml() {
    var options = '';
    groups().forEach(function (g) {
      options += '<option value="' + esc(g) + '">' + esc(g) + '</option>';
    });
    return '<div class="card" style="border:1px solid var(--accent)">'
      + '<div class="muted" style="font-size:12px;margin-bottom:6px">Новый ребёнок</div>'
      + '<input type="text" id="add-name" placeholder="Имя" style="width:100%;margin-bottom:6px">'
      + '<div class="row" style="margin-bottom:6px">'
      + '<select id="add-group" class="grow">' + options + '</select>'
      + '<input type="number" inputmode="numeric" style="width:110px" id="add-fee" placeholder="Абонемент ₽">'
      + '</div>'
      + '<div class="row">'
      + '<button class="btn grow" data-act="add-child">Добавить</button>'
      + '<button class="btn secondary" data-act="hide-add">Отмена</button>'
      + '</div></div>';
  }

  /* ---------- действия ---------- */

  function onAction(el) {
    var act = el.getAttribute('data-act');
    var childId = el.getAttribute('data-child');

    if (act === 'prev-month') return shiftMonth(-1);
    if (act === 'next-month') return shiftMonth(1);
    if (act === 'page') { page = el.getAttribute('data-page'); return render(); }
    if (act === 'group') { group = el.getAttribute('data-group'); confirmDeleteId = null; return render(); }
    if (act === 'toggle-expand') {
      if (expanded === childId) { expanded = null; confirmDeleteId = null; } else { expanded = childId; confirmDeleteId = null; }
      return render();
    }
    if (act === 'show-add') { showAdd = true; expanded = null; return render(); }
    if (act === 'hide-add') { showAdd = false; return render(); }

    if (act === 'toggle-day') {
      var day = el.getAttribute('data-day');
      var r = ensureRecord(childId);
      if (r.att[day]) delete r.att[day]; else r.att[day] = 1;
      save();
      return render();
    }
    if (act === 'add-pay') {
      var dayInput = document.getElementById('pay-day-' + childId);
      var amountInput = document.getElementById('pay-amount-' + childId);
      var day = dayInput ? parseInt(dayInput.value, 10) : 0;
      var amount = amountInput ? parseInt(amountInput.value, 10) : 0;
      if (!day || day < 1 || day > daysInMonth(month)) { app.toast('Введите день месяца'); return; }
      if (!amount || amount <= 0) { app.toast('Введите сумму'); return; }
      var rec = ensureRecord(childId);
      rec.pay.push({ d: ('0' + day).slice(-2) + '.' + month.split('-')[1], a: amount });
      save();
      app.toast('Платёж ' + money(amount) + ' ₽ записан');
      return render();
    }
    if (act === 'del-pay') {
      var index = parseInt(el.getAttribute('data-index'), 10);
      var rec2 = ensureRecord(childId);
      rec2.pay.splice(index, 1);
      save();
      return render();
    }
    if (act === 'ask-del-child') { confirmDeleteId = childId; return render(); }
    if (act === 'confirm-del-child') {
      db.children = db.children.filter(function (c) { return c.id !== childId; });
      Object.keys(db.months).forEach(function (m) { delete db.months[m][childId]; });
      if (expanded === childId) expanded = null;
      confirmDeleteId = null;
      save();
      app.toast('Ребёнок удалён');
      return render();
    }
    if (act === 'add-child') {
      var nameEl = document.getElementById('add-name');
      var groupEl = document.getElementById('add-group');
      var feeEl = document.getElementById('add-fee');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) { app.toast('Введите имя'); return; }
      db.children.push({
        id: uid(),
        name: name,
        group: groupEl ? groupEl.value : (group === 'all' ? DEFAULT_GROUPS[0] : group),
        fee: feeEl ? parseInt(feeEl.value, 10) || 0 : 0,
        lessons: 0
      });
      save();
      showAdd = false;
      app.toast('Добавлено: ' + name);
      return render();
    }
  }

  function onFieldChange(el) {
    var field = el.getAttribute('data-field');
    var childId = el.getAttribute('data-child');
    var child = db.children.filter(function (c) { return c.id === childId; })[0];
    if (!child) return;
    if (field === 'fee') child.fee = parseInt(el.value, 10) || 0;
    if (field === 'lessons') child.lessons = parseInt(el.value, 10) || 0;
    save();
    render();
  }

  /* ---------- активация ---------- */

  function activate(api) {
    app = api;
    month = todayMonth();
    group = 'all';
    page = 'pay';

    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!db.children || !(db.children instanceof Array)) db.children = [];
    if (!db.months) db.months = {};

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

  function deactivate() {
    if (db) save();
    root = null;
    app = null;
  }

  window.plugin = { activate: activate, deactivate: deactivate };
})();
