/* Плагин «Привычки» (habits). v1.0.0
 * activate(app): app.load() / app.save(json) / app.toast(text) / app.close()
 * Данные: { habits: [{id,name,icon}], days: { "YYYY-MM-DD": { <habitId>: 1 } } }
 * Сетка привычек по дням: последние 14 дней, клик по клетке — отметка.
 */
(function () {
  var app = null, root = null;
  var db = { habits: [], days: {} };
  var showAdd = false;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function dkey(offset) {
    var d = new Date();
    d.setDate(d.getDate() - offset);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dlabel(offset) {
    var names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    var d = new Date();
    d.setDate(d.getDate() - offset);
    return names[d.getDay()] + ' ' + d.getDate();
  }
  function uid() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить'); } }

  function render() {
    if (!root) return;
    var span = 14;
    var html = '<div class="card" style="padding:8px;overflow-x:auto"><table class="atttable"><thead><tr><th class="namecol">Привычка</th>';
    for (var i = span - 1; i >= 0; i--) html += '<th>' + esc(dlabel(i)) + '</th>';
    html += '<th>Серия</th></tr></thead><tbody>';

    if (db.habits.length === 0) {
      html += '<tr><td class="namecol" colspan="' + (span + 2) + '"><p class="muted" style="margin:8px 0">Привычек пока нет — добавьте первую ниже</p></td></tr>';
    }
    db.habits.forEach(function (h) {
      html += '<tr><td class="namecol">' + esc(h.icon + ' ' + h.name) + '</td>';
      var streak = 0;
      for (var i = 0; i < 400; i++) {
        if (db.days[dkey(i)] && db.days[dkey(i)][h.id]) streak++; else break;
      }
      for (var i = span - 1; i >= 0; i--) {
        var key = dkey(i);
        var on = db.days[key] && db.days[key][h.id];
        html += '<td><button class="day' + (on ? ' on' : '') + '" data-act="toggle" data-day="' + key + '" data-habit="' + esc(h.id) + '">' + (on ? '+' : '') + '</button></td>';
      }
      html += '<td class="money"><b>' + streak + '</b></td></tr>';
    });
    html += '</tbody></table></div>';
    html += '<div class="muted" style="font-size:11px;margin:6px 2px">Нажмите клетку — отметка за день. Серия — сколько дней подряд выполнено.</div>';

    html += '<div class="card" style="text-align:center;padding:10px"><button class="btn" data-act="show-add">+ Привычка</button></div>';
    if (showAdd) {
      html += '<div class="card" style="border:1px solid var(--accent)">'
        + '<input type="text" id="new-name" placeholder="Название, например «Зарядка»" style="width:100%;margin-bottom:6px">'
        + '<div class="row">'
        + '<input type="text" id="new-icon" placeholder="Эмодзи" style="width:70px" value="✅">'
        + '<button class="btn grow" data-act="add">Добавить</button>'
        + '<button class="btn secondary" data-act="hide-add">Отмена</button>'
        + '</div></div>';
    }

    html += '<div class="card" style="text-align:center;padding:8px">'
      + '<span class="muted" style="font-size:12px">Сегодня отмечено: <b>' + Object.keys(db.days[dkey(0)] || {}).length + '</b> из ' + db.habits.length + '</span>'
      + '</div>';

    root.innerHTML = html;
  }

  function onAction(el) {
    var act = el.getAttribute('data-act');
    if (act === 'toggle') {
      var day = el.getAttribute('data-day');
      var habit = el.getAttribute('data-habit');
      if (!db.days[day]) db.days[day] = {};
      if (db.days[day][habit]) delete db.days[day][habit]; else db.days[day][habit] = 1;
      save();
      return render();
    }
    if (act === 'show-add') { showAdd = true; return render(); }
    if (act === 'hide-add') { showAdd = false; return render(); }
    if (act === 'add') {
      var nameEl = document.getElementById('new-name');
      var iconEl = document.getElementById('new-icon');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) { app.toast('Введите название'); return; }
      db.habits.push({ id: uid(), name: name, icon: iconEl ? iconEl.value.trim() || '✅' : '✅' });
      save();
      showAdd = false;
      app.toast('Привычка добавлена');
      return render();
    }
  }

  function activate(api) {
    app = api;
    showAdd = false;
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!db.habits || !(db.habits instanceof Array)) db.habits = [];
    if (!db.days) db.days = {};
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
