# Переход NaZerak на Nazerak.ru

Текущая публикация остаётся на GitHub Pages до момента, когда домен и DNS будут готовы.

## Что уже сделано в архитектуре

- Все пользовательские переходы внутри сайта используют относительные URL (`./forum.html`, `./cabinet.html` и т.д.).
- OAuth callback строится от текущего origin в браузере, поэтому после переезда на `https://nazerak.ru` приложение не требует переписывания callback-кода.
- Публичная конфигурация вынесена в `site-config.js`; запланированный origin указан как `https://nazerak.ru`.
- Форумные страницы также используют относительные маршруты.
- Supabase publishable key и Discord OAuth secrets не зависят от домена и не помещаются в клиентский код.
- GitHub Pages-specific canonical/robots/sitemap пока намеренно оставлены на текущем домене до фактического переключения.

## Что сделать в день переноса

1. Добавить `https://nazerak.ru/cabinet.html` и `https://nazerak.ru/` в Supabase Auth Redirect URLs, сохранив старые GitHub Pages URLs на переходный период.
2. Проверить, что Discord OAuth продолжает использовать callback Supabase: `https://ujlbyzvdsncvqbrhasuw.supabase.co/auth/v1/callback` — менять его на домен сайта не нужно, если OAuth по-прежнему работает через Supabase.
3. Подключить новый хостинг и проверить HTTPS до изменения DNS.
4. Переключить DNS домена на новый хостинг.
5. После подтверждения `https://nazerak.ru/` обновить canonical/OG URL в `index.html`, `robots.txt` и `sitemap.xml` на новый домен.
6. Проверить Discord login, cabinet, forum index, category, topic, member profile and search from a fresh browser session.
7. Только после этого удалить старые redirect URLs и старую публикацию, если она больше не нужна.

## Человекочитаемые публичные URL

Публичные страницы генерируются из public-routes.json. Базовые адреса вида /pravitelstvo, /sud, /prokuratura и /fsb не зависят от GitHub Pages или Supabase. Внутри репозитория они представлены как каталоги со своим index.html, поэтому после переноса на новый хостинг пути сохраняются.

Генератор: node scripts/generate-public-routes.mjs. Для новых разделов сначала добавляется запись в public-routes.json, затем генератор создаёт соответствующий каталог и страницу.

## Важное правило

Не добавляй `nazerak.ru` в `CNAME` GitHub Pages заранее: пока DNS и новый хостинг не готовы, это может преждевременно переключить публикацию.
