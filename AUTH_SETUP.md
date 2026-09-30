# NaZerak — Discord авторизация и личный кабинет

Авторизация NaZerak построена на **Discord OAuth + Supabase Auth**.

Сам сайт остаётся статическим и работает через GitHub Pages. Supabase нужен для авторизации, профилей и заявок из личного кабинета.

## Что нужно получить

Тебе понадобятся:

1. Supabase Project URL
2. Supabase Publishable key
3. Discord Client ID
4. Discord Client Secret

В GitHub попадут только первые два.

**Никогда не клади в GitHub и не отправляй в чат Discord Client Secret или Supabase Secret key / service_role.**

---

# 1. Создать Supabase project

Открой Supabase Dashboard и создай отдельный проект именно для NaZerak.

Не используй старый проект HellsaizShop — для NaZerak лучше отдельная база, чтобы данные разных проектов не смешивались.

На текущем Supabase Free Plan разрешены два активных бесплатных проекта с учётом действующего лимита. Для старта NaZerak этого достаточно.

После создания открой проект.

### Получить Project URL и Publishable key

Открой:

**Settings → API Keys**

Нужен:

**Publishable key**

Он начинается с:

    sb_publishable_

Также нужен:

**Project URL**

Он имеет вид:

    https://xxxxxxxx.supabase.co

В разделе Secret keys ничего для сайта копировать не нужно.

---

# 2. Создать таблицы NaZerak

В Supabase открой:

**SQL Editor → New query**

В репозитории NaZerak открой файл:

    supabase/schema.sql

Скопируй **весь файл целиком** в SQL Editor.

Нажми:

**Run**

После выполнения в Table Editor должны появиться:

- profiles
- media_applications

RLS уже включён в нашей схеме.

Пользователь сможет работать только со своими строками.

---

# 3. Создать Discord Application

Открой:

**Discord Developer Portal**

Нажми:

**New Application**

Название:

**NaZerak**

После создания открой:

**OAuth2**

Найди:

**Redirects**

---

# 4. Получить Callback URL из Supabase

Вернись в Supabase:

**Authentication → Sign In / Providers → Discord**

Скопируй значение:

**Callback URL**

Оно будет примерно таким:

    https://ТВОЙ-PROJECT-REF.supabase.co/auth/v1/callback

Это значение нужно вставить в Discord без изменений.

### В Discord

Открой:

**OAuth2 → Redirects → Add Redirect**

Вставь callback URL из Supabase.

Нажми:

**Save Changes**

После этого скопируй:

**Client ID**

и создай/скопируй:

**Client Secret**

Client Secret сохрани у себя.

---

# 5. Включить Discord Provider в Supabase

В Supabase:

**Authentication → Sign In / Providers → Discord**

Включи:

**Discord Enabled → ON**

Заполни:

**Client ID**

**Client Secret**

Нажми:

**Save**

После этого Supabase сможет проводить авторизацию через Discord.

---

# 6. Настроить возврат пользователя на NaZerak

Открой:

**Authentication → URL Configuration**

### Site URL

Поставь основной адрес GitHub Pages:

    https://waslnison22-sudo.github.io/NazerakSites/

### Redirect URLs

Добавь:

    https://waslnison22-sudo.github.io/NazerakSites/cabinet.html

Для локального теста добавь:

    http://localhost:8000/cabinet.html

После подключения домена NaZerak добавь:

    https://nazerak.is-a.dev/cabinet.html

В production лучше использовать точные URL.

---

# 7. Подключить Supabase к сайту

В GitHub открой:

    auth-config.js

Сейчас там:

    window.NAZERAK_SUPABASE_CONFIG = {
      url: "",
      publishableKey: ""
    };

Замени на:

    window.NAZERAK_SUPABASE_CONFIG = {
      url: "https://ТВОЙ-PROJECT-REF.supabase.co",
      publishableKey: "sb_publishable_ТВОЙ-КЛЮЧ"
    };

Например:

    window.NAZERAK_SUPABASE_CONFIG = {
      url: "https://abc123.supabase.co",
      publishableKey: "sb_publishable_xxxxxxxxx"
    };

Сохрани файл в ветку main.

### Что можно хранить в GitHub

Можно:

- Supabase Project URL
- Supabase Publishable key

Нельзя:

- Discord Client Secret
- Supabase Secret key
- service_role
- админские токены
- пароли

---

# 8. Как работает регистрация

Отдельной формы регистрации нет.

Игрок нажимает:

**Войти через Discord**

Дальше:

    NaZerak → Supabase Auth → Discord → Supabase → cabinet.html

Первый вход создаёт пользователя в Supabase Auth.

Последующие входы используют его существующий аккаунт.

Пароль Discord сайт не получает.

---

# 9. Что пользователь получает

### Discord

- имя;
- username;
- аватар;
- дата создания аккаунта;
- последний вход;
- Supabase User ID.

### Minecraft

Можно сохранить Minecraft ник.

Сейчас он отображается как:

**НЕ ПОДТВЕРЖДЁН**

Это специально.

Просто введённый ник не является доказательством владения аккаунтом.

### Медиа-партнёрство

Можно:

- указать канал;
- написать описание;
- отправить заявку;
- посмотреть историю своих заявок;
- видеть статус заявки.

---

# 10. Проверка после настройки

Проверяй строго по порядку.

### Тест 1 — сайт

Открой:

    https://waslnison22-sudo.github.io/NazerakSites/

Нажми:

**Войти**

### Тест 2 — Discord

Должен открыться Discord OAuth.

Разреши доступ.

После авторизации должен открыться:

    cabinet.html

### Тест 3 — кабинет

Должны появиться:

- Discord имя;
- аватар;
- информация об аккаунте;
- Minecraft-профиль;
- медиа-заявки.

### Тест 4 — Minecraft

Введи:

    TestNaZerak

Нажми:

**Сохранить**

Должно появиться:

**Игровой профиль сохранён.**

### Тест 5 — медиа

Создай тестовую заявку.

Она должна появиться в:

**МОИ ЗАЯВКИ**

### Тест 6 — выход

Нажми:

**Выйти из аккаунта**

Сайт должен вернуть пользователя на главную.

---

# 11. Ошибки

## Provider not enabled

Проверь:

**Authentication → Providers → Discord**

Discord должен быть включён.

## redirect_uri_mismatch

Проверь Discord:

**OAuth2 → Redirects**

Там должен находиться точный callback Supabase:

    https://ТВОЙ-PROJECT-REF.supabase.co/auth/v1/callback

Не добавляй к этому URL:

    /cabinet.html

## После Discord возвращает ошибку

Проверь:

**Authentication → URL Configuration → Redirect URLs**

Должен быть:

    https://waslnison22-sudo.github.io/NazerakSites/cabinet.html

## Профиль не сохраняется

Проверь:

**Table Editor → profiles**

и повторно выполни:

    supabase/schema.sql

## Медиа-заявка не сохраняется

Проверь:

**Table Editor → media_applications**

и наличие RLS-политик из schema.sql.

---

# 12. Безопасность

В репозитории допускаются:

    Supabase Project URL
    sb_publishable_...

В репозитории запрещены:

    sb_secret_...
    service_role
    Discord Client Secret
    admin tokens
    passwords

Publishable key предназначен для публичного клиента.

Secret key и service_role имеют привилегии backend-уровня и не должны попадать в браузерный JavaScript.

---

# 13. Следующий этап

После успешного входа подключаем настоящую связь:

    Discord
       ↓
    NaZerak Account
       ↓
    Minecraft account
       ↓
    Server verification
       ↓
    Player statistics

Тогда появятся:

- подтверждение Minecraft аккаунта;
- Discord ↔ Minecraft связь;
- текущий online игрока;
- статистика;
- достижения;
- история;
- дополнительные функции кабинета.

Для настоящего доказательства владения Minecraft аккаунтом понадобится серверный компонент/плагин NaZerak. Одного введённого ника недостаточно.

---

# Официальная документация

Supabase — Discord OAuth:
https://supabase.com/docs/guides/auth/social-login/auth-discord

Supabase — Redirect URLs:
https://supabase.com/docs/guides/auth/redirect-urls

Supabase — API keys:
https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys

Discord Developer Portal:
https://discord.com/developers

# Порядок действий

**Supabase project**
→ **SQL schema**
→ **Discord Application**
→ **Callback URL**
→ **Discord Client ID + Secret в Supabase**
→ **Redirect URLs**
→ **auth-config.js**
→ **вход через Discord**
→ **проверка кабинета**
