# NaZerak — официальный сайт

Официальный статический сайт проекта NaZerak.

## Актуальные данные

- Minecraft: **1.21.11**
- IP сервера: **nazehard.rustix.cc**
- Официальный Discord: https://discord.gg/2KvsYYDHN6

## Структура

- `index.html` — главная страница
- `styles.css` — оформление, адаптивность и motion
- `script.js` — меню, scroll-анимации, микроинтеракции и копирование IP
- `favicon.svg` — иконка сайта
- `404.html` — страница ошибки
- `.nojekyll` — отключение Jekyll-обработки

Сайт не использует npm, сборщик или внешние UI-библиотеки.

## Локальный запуск

Для локального HTTP-запуска:

```bash
python -m http.server 8000
```

После этого открыть `http://localhost:8000`.

## GitHub Pages

Сайт рассчитан на публикацию **напрямую из ветки `main`**, без CI/CD и без отдельного веб-сервера.

В GitHub открыть:

**Settings → Pages → Build and deployment → Source → Deploy from a branch**

Затем:

**Branch: `main` / Folder: `/(root)`**

После сохранения GitHub Pages будет раздавать содержимое репозитория.

## Домен

Планируемый адрес проекта:

`https://nazerak.is-a.dev`

После регистрации домена его нужно указать в настройках Custom domain у GitHub Pages. Отдельный VPS/хостинг для статического сайта не требуется.

## Принципы

Сайт должен оставаться быстрым и простым для хостинга:

- публичная часть остаётся статической и не требует собственного VPS;
- backend/БД нужны только для авторизации и функций личного кабинета;
- Node.js на сервере не требуется;
- без тяжёлых UI-фреймворков;
- реальные данные проекта добавляются только после подтверждения;
- анимации должны уважать `prefers-reduced-motion`.


## Discord авторизация и личный кабинет

В репозитории уже находятся:
- `cabinet.html` — личный кабинет;
- `auth.js` — Discord OAuth, сессия, профиль и заявки;
- `auth-config.js` — публичная конфигурация Supabase;
- `supabase/schema.sql` — таблицы и RLS;
- `AUTH_SETUP.md` — пошаговая настройка Discord + Supabase.

Для настоящего входа нужно создать отдельный Supabase project для NaZerak, выполнить SQL-схему, включить Discord Provider и заполнить `auth-config.js`. Discord Client Secret и Supabase service_role остаются только в настройках Supabase и в GitHub не попадают.

