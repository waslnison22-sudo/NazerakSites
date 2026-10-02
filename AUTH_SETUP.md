# NaZerak — настройка Supabase + Discord

Сайт NaZerak настроен на Supabase project:

- Project ref: `ujlbyzvdsncvqbrhasuw`
- Project URL: `https://ujlbyzvdsncvqbrhasuw.supabase.co`

Состояние проекта и настройки Auth нужно подтверждать непосредственно в Supabase Dashboard. Репозиторий хранит только публичную browser-конфигурацию; секреты и Discord Client Secret в GitHub не используются.

## 1. Схема базы данных

Репозиторий содержит эталонную схему в `supabase/schema.sql` и миграцию для ограничения browser-привилегий.

После применения схемы проверь в Supabase Dashboard:

- `profiles` и `media_applications`;
- RLS для обеих таблиц;
- права ролей `anon` и `authenticated`;
- Security Advisor.

Не считай состояние базы подтверждённым только по этому файлу.

## 2. API Keys

Открой **Supabase → Project → Settings → API Keys**.

Используй **Publishable key** формата `sb_publishable_...`.

Этот ключ уже записан в `auth-config.js`.

Не вставляй в сайт и не отправляй в чат:

- `sb_secret_...`
- `service_role`
- Discord Client Secret
- пароли или админские токены

## 3. Discord Application

Открой: https://discord.com/developers

Нажми **New Application** и назови приложение **NaZerak**.

Дальше: **OAuth2 → Redirects**.

Добавь ровно:

```text
https://ujlbyzvdsncvqbrhasuw.supabase.co/auth/v1/callback
```

Не добавляй к callback `/cabinet.html`.

Нажми **Save Changes**.

## 4. Включить Discord в Supabase

Открой **Authentication → Sign In / Providers → Discord**.

Включи **Discord → Enabled**.

Вставь:

- Client ID из Discord Developer Portal;
- Client Secret из Discord Developer Portal.

Нажми **Save**.

Client Secret вводится только в Supabase Dashboard.

## 5. URL Configuration

Открой **Authentication → URL Configuration**.

### Site URL

Пока оставить:

```text
https://waslnison22-sudo.github.io/NazerakSites/
```

После переноса на новый хостинг сменить на:

```text
https://nazerak.ru/
```

### Redirect URLs

Сейчас:

```text
https://waslnison22-sudo.github.io/NazerakSites/cabinet.html
http://localhost:8000/cabinet.html
```

Перед переключением домена добавить, не удаляя старый URL:

```text
https://nazerak.ru/cabinet.html
```

После подтверждения работы нового домена старый GitHub Pages redirect можно удалить.

Production URL лучше добавлять точным совпадением.

## 6. Что уже сделано в GitHub

`auth-config.js` уже содержит Project URL и Publishable key.

В сайте уже есть:

- вход через Discord;
- сохранение сессии;
- личный кабинет;
- Discord имя и аватар;
- Minecraft профиль;
- защищённая таблица для собственных медиа-заявок и чтение истории;
- приём новых заявок пока отключён в интерфейсе, поскольку нет панели команды для безопасного рассмотрения;
- выход из аккаунта.

## 7. Проверка

1. Открой `https://waslnison22-sudo.github.io/NazerakSites/`.
2. Нажми **Войти**.
3. Разреши вход через Discord.
4. После авторизации должен открыться `cabinet.html`.
5. В кабинете должны появиться Discord имя и аватар.
6. Введи Minecraft ник и нажми **Сохранить**.
7. Проверь, что раздел медиа-партнёрства закрыт по умолчанию и честно сообщает о временно отключённом приёме заявок.
8. Нажми **Выйти из аккаунта**.

## 8. Ошибки

### `redirect_uri_mismatch`
В Discord должен быть точно:

```text
https://ujlbyzvdsncvqbrhasuw.supabase.co/auth/v1/callback
```

### `Provider not enabled`
Проверь **Authentication → Sign In / Providers → Discord → Enabled**.

### После Discord не открывается кабинет
Проверь **Authentication → URL Configuration → Redirect URLs** и наличие:

```text
https://waslnison22-sudo.github.io/NazerakSites/cabinet.html
```

### Профиль не сохраняется
Проверь, что вход выполнен через Discord, затем открой **Table Editor → profiles**.

### Медиа-заявки
Таблица `media_applications` пока хранит прежние записи, но у команды нет подключённой панели рассмотрения и уведомлений. Поэтому форма отправки в кабинете намеренно отключена, чтобы пользователь не отправлял обращение в неотслеживаемую очередь. До запуска безопасной модерации свяжись с командой через официальный Discord.

## 9. Minecraft verification

Сейчас введённый ник отображается как **НЕ ПОДТВЕРЖДЁН**.

Это намеренно: введённый ник не доказывает владение аккаунтом. Настоящую проверку позже подключим через серверный плагин/серверный контур.

## Официальные документы

Supabase — Discord OAuth: https://supabase.com/docs/guides/auth/social-login/auth-discord
Supabase — Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
Supabase — API Keys: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
Supabase — PKCE: https://supabase.com/docs/guides/auth/sessions/pkce-flow
Discord Developer Portal: https://discord.com/developers


Архитектура и план развития кабинета: `docs/account-architecture.md`.
