/* Плагин «Расписание» (schedule). v1.0.0
 * activate(app): app.load() / app.save(json) / app.toast(text) / app.close()
 * Данные: { lessons: [{id,day,hour,dur,title,who}] }
 * Недельное расписание занятий: колонки-дни, сортировка по времени, подсветка «сейчас».
 */
(function () {
  var app = null, root = null;
  var db = { lessons: [] };
  var showAdd = false;
  var DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid() { return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function save() { try { app.save(JSON.stringify(db)); } catch (e) { app.toast('Не удалось сохранить'); } }
  function todayIndex() { var d = new Date().getDay(); return (d + 6) % 7; }

  function render() {
    if (!root) return;
    var today = todayIndex();
    var hourNow = new Date().getHours() + new Date().getMinutes() / 60;

    var html = '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">';
    for (var d = 0; d < 7; d++) {
      var count = db.lessons.filter(function (l) { return l.day === d; }).length;
      html += '<button class="chip' + (d === today ? ' active' : '') + '" data-act="scroll-day" data-day="' + d + '">'
        + esc(DAYS[d]) + (count > 0 ? ' · ' + count : '') + '</button>';
    }
    html += '</div>';

    html += '<div class="row" style="gap:10px;align-items:flex-start;overflow-x:auto;padding-bottom:8px">';
    var any = false;
    for (var d = 0; d < 7; d++) {
      var dayLessons = db.lessons.filter(function (l) { return l.day === d; })
        .sort(function (a, b) { return (a.hour || 0) - (b.hour || 0); });
      html += '<div style="min-width:140px;flex:1" id="day-' + d + '">';
      html += '<div class="muted" style="font-size:12px;margin:2px 2px 6px;font-weight:600'
        + (d === today ? ';color:var(--accent)' : '') + '">' + esc(DAYS_FULL[d]) + '</div>';
      if (dayLessons.length === 0) {
        html += '<div class="card muted" style="padding:8px;font-size:12px;text-align:center">—</div>';
      }
      dayLessons.forEach(function (l) {
        any = true;
        var isNow = d === today && hourNow >= (l.hour || 0) && hourNow < (l.hour || 0) + (l.dur || 1);
        html += '<div class="card" style="padding:8px;margin-bottom:6px;' + (isNow ? 'border:1.5px solid var(--accent)' : '') + '">'
          + '<div style="font-size:11px" class="muted">' + esc(l.hour) + ':00' + (l.dur && l.dur > 1 ? '–' + (l.hour + l.dur) + ':00' : '') + '</div>'
          + '<b style="font-size:13px">' + esc(l.title) + '</b>'
          + (l.who ? '<div class="muted" style="font-size:11px">' + esc(l.who) + '</div>' : '')
          + '<button class="btn danger small" data-act="del" data-id="' + esc(l.id) + '" style="margin-top:5px">✕</button>'
          + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    if (!any) {
      html += '<div class="card" style="text-align:center"><p class="muted" style="margin:6px 0">Расписание пусто — добавьте первое занятие</p></div>';
    }

    html += '<div class="card" style="text-align:center;padding:10px"><button class="btn" data-act="show-add">+ Занятие</button></div>';
    if (showAdd) {
      var dayOptions = '';
      for (var d = 0; d < 7; d++) dayOptions += '<option value="' + d + '"' + (d === today ? ' selected' : '') + '>' + esc(DAYS_FULL[d]) + '</option>';
      html += '<div class="card" style="border:1px solid var(--accent)">'
        + '<input type="text" id="f-title" placeholder="Что, например «Английский»" style="width:100%;margin-bottom:6px">'
        + '<div class="row" style="margin-bottom:6px">'
        + '<select id="f-day" style="width:130px">' + dayOptions + '</select>'
        + '<input type="number" id="f-hour" min="0" max="23" class="grow" placeholder="Час, например 16">'
        + '<input type="number" id="f-dur" min="1" max="12" style="width:70px" placeholder="Часов" value="1">'
        + '</div>'
        + '<input type="text" id="f-who" placeholder="Кто (необязательно)" style="width:100%;margin-bottom:6px">'
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
    if (act === 'scroll-day') {
      var day = el.getAttribute('data-day');
      var target = document.getElementById('day-' + day);
      if (target) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      return;
    }
    if (act === 'del') {
      db.lessons = db.lessons.filter(function (l) { return l.id !== id; });
      save();
      return render();
    }
    if (act === 'show-add') { showAdd = true; return render(); }
    if (act === 'hide-add') { showAdd = false; return render(); }
    if (act === 'add') {
      var title = ((document.getElementById('f-title') || {}).value || '').trim();
      var day = parseInt((document.getElementById('f-day') || {}).value, 10) || 0;
      var hour = parseInt((document.getElementById('f-hour') || {}).value, 10) || 0;
      var dur = parseInt((document.getElementById('f-dur') || {}).value, 10) || 1;
      var who = ((document.getElementById('f-who') || {}).value || '').trim();
      if (!title) { app.toast('Введите название'); return; }
      if (hour < 0 || hour > 23) { app.toast('Час от 0 до 23'); return; }
      db.lessons.push({ id: uid(), day: day, hour: hour, dur: dur, title: title, who: who });
      save();
      showAdd = false;
      app.toast('Занятие добавлено');
      return render();
    }
  }

  function activate(api) {
    app = api;
    showAdd = false;
    try { db = JSON.parse(app.load() || '{}') || {}; } catch (e) { db = {}; }
    if (!db.lessons || !(db.lessons instanceof Array)) db.lessons = [];
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
