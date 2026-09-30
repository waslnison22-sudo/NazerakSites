# NaZerak — Discord авторизация и личный кабинет

Авторизация построена на **Discord OAuth + Supabase Auth**. Сам сайт остаётся статическим и продолжает работать через GitHub Pages.

## 1. Создать отдельный Supabase project

Не используй сторонний проект сайта или магазина. Создай отдельный проект только для NaZerak.

После создания запиши:
- Project URL вида `https://<project-ref>.supabase.co`
- Publishable key вида `sb_publishable_...`

В браузер можно публиковать только publishable key. **Discord Client Secret и Supabase service_role никогда не добавляй в GitHub.**

## 2. Создать таблицы NaZerak

Открой Supabase → SQL Editor и выполни содержимое:

`supabase/schema.sql`

В схеме включён RLS: пользователь может читать и менять только собственный профиль, а заявки на медиа-партнёрство доступны только их владельцу.

## 3. Подключить Discord

В Supabase открой:

**Authentication → Sign In / Providers → Discord**

Callback URL будет:

`https://<project-ref>.supabase.co/auth/v1/callback`

В Discord Developer Portal:

**Applications → твое приложение → OAuth2 → Redirects**

добавь этот callback URL и сохрани Client ID + Client Secret.

Затем в Supabase включи Discord и вставь Client ID / Client Secret.

## 4. Разрешить возврат на сайт NaZerak

В Supabase Auth → URL Configuration добавь адрес GitHub Pages:

`https://waslnison22-sudo.github.io/NazerakSites/cabinet.html`

и будущий адрес:

`https://nazerak.is-a.dev/cabinet.html`

Для локального запуска можно добавить адрес вида:

`http://localhost:8000/cabinet.html`

## 5. Заполнить публичную конфигурацию сайта

Открой `auth-config.js` и вставь:

```js
window.NAZERAK_SUPABASE_CONFIG = {
  url: "https://<project-ref>.supabase.co",
  publishableKey: "sb_publishable_..."
};
```

Это **единственный** секретоподобный параметр, который должен находиться в публичном клиенте. Publishable key предназначен для браузерного использования.

## 6. Как работает регистрация

Отдельной формы «регистрация» не нужно.

Нажатие **Войти через Discord** отправляет игрока в Discord:
- существующий пользователь входит;
- новый пользователь автоматически появляется в Supabase Auth;
- после возврата открывается личный кабинет;
- профиль NaZerak создаётся автоматически.

## 7. Что уже есть в кабинете

- вход через Discord;
- сохранение сессии;
- выход;
- имя, Discord username и аватар;
- дата создания аккаунта;
- дата последнего входа;
- Supabase user ID;
- Minecraft-ник;
- отправка заявки на медиа-партнёрство;
- история своих заявок и их статус.

## 8. Что пока нельзя делать безопасно без серверной части

Проверку владения Minecraft-аккаунтом нельзя считать настоящей только потому, что пользователь написал ник.

Для настоящей привязки нужно подтвердить аккаунт через сервер NaZerak: плагин/серверный API должен связать игрока с Auth user ID и менять подтверждённое состояние на серверной стороне.

## 9. После настройки

После заполнения `auth-config.js`:
1. Открой сайт.
2. Нажми **Войти**.
3. Разреши доступ NaZerak в Discord.
4. После возврата должен открыться `cabinet.html`.
5. Заполни Minecraft-ник и проверь сохранение.
6. Отправь тестовую заявку на медиа-партнёрство.

Официальная документация Supabase для Discord:
https://supabase.com/docs/guides/auth/social-login/auth-discord
