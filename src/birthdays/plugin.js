/* Плагин «Дни рождения» (birthdays). activate(app): app.load/save/toast/close.
 * Данные: { people: [{id,name,day,month,year?}] }
 */
(function () {
  var app = null, root = null;
  var db = { people: [] };
  var confirmDeleteId = null;
  var showAdd = false;

  var MONTH_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить: ' + e); } }

  function daysUntil(day, month) {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var next = new Date(now.getFullYear(), month - 1, day);
    if (next < now) next = new Date(now.getFullYear() + 1, month - 1, day);
    return Math.round((next - now) / 86400000);
  }
  function turningAge(p) {
    if (!p.year) return null;
    var now = new Date();
    var age = now.getFullYear() - parseInt(p.year, 10);
    var hadBirthday = (now.getMonth() + 1 > parseInt(p.month, 10)) ||
      (now.getMonth() + 1 === parseInt(p.month, 10) && now.getDate() >= parseInt(p.day, 10));
    return hadBirthday ? age : age - 1;
  }

  function render() {
    if (!root) return;
    var people = (db.people || []).slice().sort(function (a, b) {
      return daysUntil(parseInt(a.day, 10), parseInt(a.month, 10)) - daysUntil(parseInt(b.day, 10), parseInt(b.month, 10));
    });

    var html = '';
    html += '<div class="card" style="padding:8px 12px"><div class="row" style="justify-content:space-between">'
      + '<span class="muted">Всего: <b>' + people.length + '</b></span>'
      + (people.length ? '<span class="muted">Ближайший: <b>' + esc(people[0].name) + '</b> через '
        + daysUntil(parseInt(people[0].day, 10), parseInt(people[0].month, 10)) + ' дн.</span>' : '')
      + '</div></div>';

    people.forEach(function (p) {
      var days = daysUntil(parseInt(p.day, 10), parseInt(p.month, 10));
      var age = turningAge(p);
      var soon = days <= 7;
      var badge = days === 0 ? '🎉 СЕГОДНЯ' : days === 1 ? 'завтра' : 'через ' + days + ' дн.';
      html += '<div class="card"' + (soon ? ' style="border:1px solid var(--accent)"' : '') + '>'
        + '<div class="row" style="justify-content:space-between">'
        + '<div class="grow"><b>' + esc(p.name) + '</b>'
        + '<div class="muted" style="font-size:13px">' + parseInt(p.day, 10) + ' ' + esc(MONTH_NAMES[parseInt(p.month, 10) - 1])
        + (p.year ? ' · исполняется ' + (age != null ? age : '?') : '')
        + (p.year ? ' (' + esc(p.year) + ' г.р.)' : '') + '</div></div>'
        + '<div style="text-align:right">'
        + '<div class="money" style="color:' + (soon ? 'var(--accent)' : 'var(--text)') + ';font-weight:700">' + badge + '</div>'
        + '<button class="btn danger small" style="margin-top:6px" data-act="'
        + (confirmDeleteId === p.id ? 'confirm-del' : 'ask-del') + '" data-id="' + esc(p.id) + '">'
        + (confirmDeleteId === p.id ? 'Точно?' : '✕') + '</button>'
        + '</div></div></div>';
    });

    if (people.length === 0) {
      html += '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">Пока никого нет</p></div>';
    }

    if (showAdd) {
      var monthOptions = '';
      for (var m = 1; m <= 12; m++) monthOptions += '<option value="' + m + '">' + MONTH_NAMES[m - 1] + '</option>';
      html += '<div class="card" style="border:1px solid var(--accent)">'
        + '<div class="muted" style="font-size:12px;margin-bottom:6px">Новый человек</div>'
        + '<input type="text" id="b-name" placeholder="Имя" style="width:100%;margin-bottom:6px">'
        + '<div class="row" style="margin-bottom:6px">'
        + '<input type="number" inputmode="numeric" style="width:70px" id="b-day" placeholder="День">'
        + '<select id="b-month" class="grow">' + monthOptions + '</select>'
        + '<input type="number" inputmode="numeric" style="width:90px" id="b-year" placeholder="Год (не обяз.)">'
        + '</div>'
        + '<div class="row"><button class="btn grow" data-act="add">Добавить</button>'
        + '<button class="btn secondary" data-act="hide-add">Отмена</button></div></div>';
    }

    html += '<div class="card" style="text-align:center;padding:10px">'
      + '<button class="btn" data-act="show-add">+ Добавить человека</button></div>';

    root.innerHTML = html;
  }

  function onAction(el) {
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');

    if (act === 'show-add') { showAdd = true; return render(); }
    if (act === 'hide-add') { showAdd = false; return render(); }
    if (act === 'add') {
      var n = document.getElementById('b-name'), d = document.getElementById('b-day'),
          m = document.getElementById('b-month'), y = document.getElementById('b-year');
      var name = n ? n.value.trim() : '';
      var day = parseInt(d && d.value, 10), month = parseInt(m && m.value, 10);
      if (!name) { app.toast('Введите имя'); return; }
      if (!day || day < 1 || day > 31) { app.toast('Введите день (1–31)'); return; }
      db.people.push({ id: uid(), name: name, day: day, month: month, year: parseInt(y && y.value, 10) || null });
      save();
      showAdd = false;
      app.toast('Добавлено: ' + name);
      return render();
    }
    if (act === 'ask-del') {
      if (confirmDeleteId === id) {
        db.people = db.people.filter(function (p) { return p.id !== id; });
        confirmDeleteId = null;
        save();
        app.toast('Удалено');
        return render();
      }
      confirmDeleteId = id;
      render();
      var btn = root.querySelector('[data-act="ask-del"][data-id="' + id + '"]');
      if (btn) btn.textContent = 'Точно удалить?';
      return;
    }
  }

  function activate(api) {
    app = api;
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!(db.people instanceof Array)) db.people = [];
    root = document.getElementById('root');
    root.addEventListener('click', function (event) {
      var el = event.target.closest ? event.target.closest('[data-act]') : null;
      if (el) { event.preventDefault(); onAction(el); }
    });
    render();
  }
  function deactivate() { if (db) save(); root = null; app = null; }

  window.plugin = { activate: activate, deactivate: deactivate };
})();
