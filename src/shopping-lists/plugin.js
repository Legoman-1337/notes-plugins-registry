/* Плагин «Покупки» (shopping-lists). activate(app): app.load/save/toast/close.
 * Данные: { lists: [{id,name,items:[{id,name,qty,price,done}]}], active: id }
 */
(function () {
  var app = null, root = null;
  var db = { lists: [], active: null };
  var confirmDeleteId = null;
  var showNewList = false;

  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить: ' + e); } }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function activeList() {
    for (var i = 0; i < db.lists.length; i++) if (db.lists[i].id === db.active) return db.lists[i];
    return db.lists[0] || null;
  }
  function listTotal(list, onlyDone) {
    var sum = 0;
    (list.items || []).forEach(function (it) {
      if (!onlyDone || it.done) sum += (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1);
    });
    return Math.round(sum * 100) / 100;
  }

  function render() {
    if (!root) return;
    var list = activeList();
    var html = '';

    // вкладки списков
    html += '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">';
    db.lists.forEach(function (l) {
      html += '<button class="chip' + (l.id === (list && list.id) ? ' active' : '') + '" data-act="select" data-id="' + esc(l.id) + '">' + esc(l.name) + '</button>';
    });
    html += '<button class="chip" data-act="show-new-list">+ список</button></div>';

    if (showNewList) {
      html += '<div class="card" style="border:1px solid var(--accent)">'
        + '<div class="row"><input type="text" id="new-list-name" class="grow" placeholder="Название списка (например, Ашан)">'
        + '<button class="btn" data-act="add-list">Создать</button>'
        + '<button class="btn secondary" data-act="hide-new-list">✕</button></div></div>';
    }

    if (!list) {
      html += '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">Списков пока нет</p>'
        + '<button class="btn" data-act="show-new-list">+ Создать список</button></div>';
      root.innerHTML = html;
      return;
    }

    var done = (list.items || []).filter(function (i) { return i.done; }).length;
    var total = listTotal(list, false), paid = listTotal(list, true);

    html += '<div class="card money" style="padding:8px 12px"><div class="row" style="justify-content:space-between">'
      + '<span class="muted">Куплено: <b>' + done + '</b> из ' + (list.items || []).length + '</span>'
      + '<span class="muted">На сумму: <b>' + money(paid) + '</b> из ' + money(total) + ' ₽</span>'
      + '</div></div>';

    html += '<div class="card" style="padding:6px 10px">';
    if (!(list.items || []).length) {
      html += '<p class="muted" style="text-align:center;margin:10px 0">Список пуст — добавьте первый товар</p>';
    }
    (list.items || []).forEach(function (it) {
      html += '<div class="row" style="padding:4px 0">'
        + '<button class="day' + (it.done ? ' on' : '') + '" data-act="toggle" data-id="' + esc(it.id) + '" style="width:34px;height:34px;font-size:15px">' + (it.done ? '✓' : '') + '</button>'
        + '<div class="grow" style="' + (it.done ? 'text-decoration:line-through;color:var(--muted)' : '') + '"><b>' + esc(it.name) + '</b>'
        + '<div class="muted" style="font-size:11px">' + (it.qty && it.qty != 1 ? esc(it.qty) + ' шт. × ' : '') + (it.price ? esc(it.price) + ' ₽' : 'без цены') + '</div></div>'
        + '<button class="btn danger small" data-act="del-item" data-id="' + esc(it.id) + '">✕</button>'
        + '</div>';
    });
    html += '</div>';

    // добавить товар
    html += '<div class="card"><div class="row">'
      + '<input type="text" id="item-name" class="grow" placeholder="Товар">'
      + '<input type="number" inputmode="decimal" style="width:70px" id="item-qty" placeholder="Шт." value="1">'
      + '<input type="number" inputmode="decimal" style="width:90px" id="item-price" placeholder="₽">'
      + '<button class="btn" data-act="add-item">+</button></div></div>';

    // управление списком
    html += '<div class="card" style="text-align:center;padding:10px">'
      + '<button class="btn danger" data-act="' + (confirmDeleteId === list.id ? 'confirm-del-list' : 'ask-del-list') + '">'
      + (confirmDeleteId === list.id ? 'Точно удалить список?' : 'Удалить список «' + esc(list.name) + '»') + '</button></div>';

    root.innerHTML = html;
  }

  function onAction(el) {
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');
    var list = activeList();

    if (act === 'select') { db.active = id; confirmDeleteId = null; return render(); }
    if (act === 'show-new-list') { showNewList = true; return render(); }
    if (act === 'hide-new-list') { showNewList = false; return render(); }
    if (act === 'add-list') {
      var nameEl = document.getElementById('new-list-name');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) { app.toast('Введите название'); return; }
      var l = { id: uid(), name: name, items: [] };
      db.lists.push(l);
      db.active = l.id;
      showNewList = false;
      save();
      app.toast('Список «' + name + '» создан');
      return render();
    }
    if (act === 'ask-del-list') { confirmDeleteId = id; return render(); }
    if (act === 'confirm-del-list') {
      db.lists = db.lists.filter(function (l) { return l.id !== id; });
      if (db.active === id) db.active = db.lists.length ? db.lists[0].id : null;
      confirmDeleteId = null;
      save();
      app.toast('Список удалён');
      return render();
    }
    if (act === 'add-item') {
      var n = document.getElementById('item-name'), q = document.getElementById('item-qty'), p = document.getElementById('item-price');
      var itemName = n ? n.value.trim() : '';
      if (!itemName) { app.toast('Введите товар'); return; }
      list.items.push({
        id: uid(), name: itemName,
        qty: parseFloat(q && q.value) || 1,
        price: parseFloat(p && p.value) || 0,
        done: false
      });
      save();
      return render();
    }
    if (act === 'toggle') {
      (list.items || []).forEach(function (it) { if (it.id === id) it.done = !it.done; });
      save();
      return render();
    }
    if (act === 'del-item') {
      list.items = list.items.filter(function (it) { return it.id !== id; });
      save();
      return render();
    }
  }

  function activate(api) {
    app = api;
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!(db.lists instanceof Array)) db.lists = [];
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
