/* Плагин «Долг» (debts). v1.0.1
 * activate(app): app.load() / app.save(json) / app.toast(text) / app.close()
 * Данные: { items: [{id,name,amount,due,note,done}] }
 * Кто сколько должен (и кому вы): отметка возврата, сумма к получению/выдаче.
 */
(function () {
  var app = null, root = null;
  var db = { items: [] };
  var filter = 'open';
  var showAdd = false;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить'); } }

  function render() {
    if (!root) return;
    var list = db.items.filter(function (i) {
      if (filter === 'open') return !i.done;
      if (filter === 'done') return !!i.done;
      return true;
    });
    var toGet = 0, toGive = 0;
    db.items.forEach(function (i) {
      if (i.done) return;
      var a = parseInt(i.amount, 10) || 0;
      if (a >= 0) toGet += a; else toGive += -a;
    });

    var html = '<div class="card money" style="padding:8px 12px"><div class="row" style="justify-content:space-between">'
      + '<span class="muted">Мне должны: <b style="color:var(--accent)">' + money(toGet) + ' ₽</b></span>'
      + '<span class="muted">Я должен: <b style="color:var(--danger)">' + money(toGive) + ' ₽</b></span>'
      + '</div></div>';

    html += '<div class="row" style="gap:6px;margin-bottom:8px">'
      + '<button class="chip' + (filter === 'open' ? ' active' : '') + '" data-act="filter" data-f="open">Активные</button>'
      + '<button class="chip' + (filter === 'done' ? ' active' : '') + '" data-act="filter" data-f="done">Возвращённые</button>'
      + '<button class="chip' + (filter === 'all' ? ' active' : '') + '" data-act="filter" data-f="all">Все</button>'
      + '</div>';

    if (list.length === 0) {
      html += '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">Пусто. Добавьте запись кнопкой ниже — минус означает «я должен»</p></div>';
    }
    list.forEach(function (i) {
      var a = parseInt(i.amount, 10) || 0;
      html += '<div class="card" style="padding:8px 12px;' + (i.done ? 'opacity:.55' : '') + '">'
        + '<div class="row" style="gap:10px">'
        + '<button class="btn small' + (i.done ? '' : ' secondary') + '" data-act="toggle-done" data-id="' + esc(i.id) + '" style="min-width:42px">' + (i.done ? '↩' : '✓') + '</button>'
        + '<div class="grow" style="min-width:0"><b>' + esc(i.name) + '</b>'
        + (i.due ? '<div class="muted" style="font-size:11px">до ' + esc(i.due) + '</div>' : '')
        + (i.note ? '<div class="muted" style="font-size:11px">' + esc(i.note) + '</div>' : '')
        + '</div>'
        + '<b class="money" style="color:' + (a >= 0 ? 'var(--accent)' : 'var(--danger)') + '">' + (a >= 0 ? '+' : '') + money(a) + ' ₽</b>'
        + '<button class="btn danger small" data-act="del" data-id="' + esc(i.id) + '">✕</button>'
        + '</div></div>';
    });

    html += '<div class="card" style="text-align:center;padding:10px"><button class="btn" data-act="show-add">+ Запись</button></div>';
    if (showAdd) {
      html += '<div class="card" style="border:1px solid var(--accent)">'
        + '<input type="text" id="f-name" placeholder="Кто / кому" style="width:100%;margin-bottom:6px">'
        + '<div class="row" style="margin-bottom:6px">'
        + '<input type="number" id="f-amount" class="grow" placeholder="Сумма ₽ (минус — я должен)">'
        + '<input type="text" id="f-due" placeholder="Срок, например 15.11" style="width:110px">'
        + '</div>'
        + '<input type="text" id="f-note" placeholder="Заметка (необязательно)" style="width:100%;margin-bottom:6px">'
        + '<div class="row">'
        + '<button class="btn grow" data-act="add">Добавить</button>'
        + '<button class="btn secondary" data-act="hide-add">Отмена</button>'
        + '</div></div>';
    }
    root.innerHTML = html;
  }

  function onAction(el) {
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');
    if (act === 'filter') { filter = el.getAttribute('data-f'); return render(); }
    if (act === 'toggle-done') {
      db.items.forEach(function (i) { if (i.id === id) i.done = !i.done; });
      save();
      return render();
    }
    if (act === 'del') {
      db.items = db.items.filter(function (i) { return i.id !== id; });
      save();
      return render();
    }
    if (act === 'show-add') { showAdd = true; return render(); }
    if (act === 'hide-add') { showAdd = false; return render(); }
    if (act === 'add') {
      var name = ((document.getElementById('f-name') || {}).value || '').trim();
      var amount = parseInt((document.getElementById('f-amount') || {}).value, 10) || 0;
      var due = ((document.getElementById('f-due') || {}).value || '').trim();
      var note = ((document.getElementById('f-note') || {}).value || '').trim();
      if (!name) { app.toast('Введите имя'); return; }
      if (!amount) { app.toast('Введите сумму (минус — я должен)'); return; }
      db.items.unshift({ id: uid(), name: name, amount: amount, due: due, note: note, done: false });
      save();
      showAdd = false;
      app.toast('Записано');
      return render();
    }
  }

  function activate(api) {
    app = api;
    filter = 'open'; showAdd = false;
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!db.items || !(db.items instanceof Array)) db.items = [];
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
