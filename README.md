# platontube

## 🚀 Публикация

Сайт опубликован и доступен на GitHub Pages:
- **gh-pages ветка:** https://github.com/comaplatan-create/platontube/tree/gh-pages
- **Сайт:** https://comaplatan-create.github.io/platontube/

При каждом push в `main` ветку GitHub Actions автоматически собирает и публикует сайт.

## 🛠 Разработка

```bash
npm install          # Установить зависимости
npm run dev         # Запустить локальный сервер (http://localhost:3000)
npm run build       # Собрать для production
npm run preview     # Просмотреть production сборку
npm run lint        # Проверить типы TypeScript
```

## 📦 Структура проекта

- `src/pages/` - React компоненты страниц
- `src/components/` - Переиспользуемые компоненты
- `src/lib/` - Утилиты и контексты (Firebase, Auth, Theme)
- `dist/` - Собранный сайт для публикации

## ✅ Исправленные ошибки

- ✅ Переименована папка `pges` → `pages` (исправлена опечатка)
- ✅ Добавлен GitHub Actions workflow для автоматической публикации
- ✅ Настроена конфигурация GitHub Pages (gh-pages ветка)