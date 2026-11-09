# notes-plugins-registry

Каталог плагинов для приложения «Заметки».

Приложение читает `index.json` отсюда и по `download_url` скачивает и устанавливает плагины.

## Формат index.json

```json
[
  {
    "id": "kinder-crm",
    "name": "Журнал и Табель",
    "version": "1.0.0",
    "author": "Legoman",
    "description": "Учёт посещаемости, оплат и детских групп",
    "icon": "📋",
    "download_url": "https://raw.githubusercontent.com/Legoman-1337/notes-plugins-registry/main/plugins/kinder-crm/kinder-crm.zip"
  }
]
```

- Исходники плагинов лежат в `src/<id>/` (manifest.json + plugin.js).
- В `plugins/<id>/` — собранный zip, на который указывает `download_url`.

## Как опубликовать новый плагин или обновление

1. Добавь папку `src/<id>/` с `manifest.json` и `plugin.js`.
2. Заzipуй содержимое в `plugins/<id>/<id>.zip`.
3. Добавь запись в `index.json` (для обновления — подними `version`).
