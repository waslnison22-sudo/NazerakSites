# NaZerak — настройка Supabase + Discord

Сейчас проект NaZerak уже подключён к Supabase project:

- Project ref: `ujlbyzvdsncvqbrhasuw`
- Project URL: `https://ujlbyzvdsncvqbrhasuw.supabase.co`
- Регион: EU (eu-west-1)
- Статус: ACTIVE_HEALTHY

Браузер использует только **Publishable key**. Секретные ключи и Discord Client Secret в GitHub не используются.

## 1. База уже подготовлена

В проекте Supabase уже созданы таблицы:

- `profiles`
- `media_applications`

Для обеих таблиц включён RLS.

Права ограничены:

- `profiles`: SELECT / INSERT / UPDATE только своей строки;
- `media_applications`: SELECT / INSERT только своих заявок;
- анонимный доступ к этим таблицам запрещён.

Security Advisor после установки схемы не показывает предупреждений.

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

```text
https://waslnison22-sudo.github.io/NazerakSites/
```

### Redirect URLs

Добавь:

```text
https://waslnison22-sudo.github.io/NazerakSites/cabinet.html
http://localhost:8000/cabinet.html
```

После подключения домена добавь:

```text
https://nazerak.is-a.dev/cabinet.html
```

Production URL лучше добавлять точным совпадением.

## 6. Что уже сделано в GitHub

`auth-config.js` уже содержит Project URL и Publishable key.

В сайте уже есть:

- вход через Discord;
- сохранение сессии;
- личный кабинет;
- Discord имя и аватар;
- Minecraft профиль;
- заявка на медиа-партнёрство;
- история собственных заявок;
- выход из аккаунта.

## 7. Проверка

1. Открой `https://waslnison22-sudo.github.io/NazerakSites/`.
2. Нажми **Войти**.
3. Разреши вход через Discord.
4. После авторизации должен открыться `cabinet.html`.
5. В кабинете должны появиться Discord имя и аватар.
6. Введи Minecraft ник и нажми **Сохранить**.
7. Создай тестовую медиа-заявку.
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

### Заявка не сохраняется
Проверь **Table Editor → media_applications**.

## 9. Minecraft verification

Сейчас введённый ник отображается как **НЕ ПОДТВЕРЖДЁН**.

Это намеренно: введённый ник не доказывает владение аккаунтом. Настоящую проверку позже подключим через серверный плагин/серверный контур.

## Официальные документы

Supabase — Discord OAuth: https://supabase.com/docs/guides/auth/social-login/auth-discord
Supabase — Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
Supabase — API Keys: https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
Discord Developer Portal: https://discord.com/developers
