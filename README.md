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

## 🔒 Firebase — авторизованные домены (OAuth)

Чтобы вход через Google работал корректно, нужно добавить домены в список "Authorized domains" в Firebase Console.

Шаги (я открыл страницу для вас — нужно только подтвердить в консоли):

1. Откройте: https://console.firebase.google.com/project/sacred-city-p5xj8/authentication/providers
2. Перейдите на вкладку **Sign-in method**.
3. Прокрутите до блока **Authorized domains** и нажмите **Add domain**.
4. Добавьте эти домены:
	- `localhost`
	- `comaplatan-create.github.io`
5. Сохраните изменения.

Если вы используете собственные OAuth credentials в Google Cloud, проверьте также **Authorized JavaScript origins** в Google Cloud Console (Credentials):

	- `http://localhost:3000`
	- `https://comaplatan-create.github.io`

Примечание: я не могу изменить эти настройки без доступа к вашей Firebase-консоли — я уже открыл страницу, и вы можете просто нажать "Add domain" и ввести домены выше. Если хотите, могу снова открыть страницу или добавить подробные инструкции с картинками.