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


## Автоматический деплой после Git push

Production публикуется не напрямую из `push`. Сначала workflow `NaZerak QA` проверяет текущий commit. После успешного QA workflow `NaZerak Production Deploy` забирает именно `head_sha` успешно проверенного прогона и загружает его на хостинг по SSH/rsync.

Перед включением задаются GitHub Actions secrets в environment `production`:

- `DEPLOY_ENABLED=true`
- `DEPLOY_HOST` — SSH/SFTP hostname хостинга
- `DEPLOY_PORT` — обычно `22`
- `DEPLOY_USER` — отдельный deploy-пользователь, не root
- `DEPLOY_PATH` — document root сайта
- `DEPLOY_PASSWORD` — пароль SSH/SFTP пользователя хостинга

Приватный ключ не хранится в репозитории. GitHub Actions Secrets предназначены именно для такого подключения; доступ к секретам должен иметь минимально необходимый scope. 

Текущий deploy workflow использует SFTP поверх SSH. Перед загрузкой он собирает отдельный web-root и исключает `.git`, `.github`, `supabase`, `scripts`, `docs`, `templates` и служебные markdown-файлы.

До включения `DEPLOY_ENABLED=true` production deployment остаётся выключенным, поэтому текущая публикация GitHub Pages продолжает работать как резерв.

## DNS и HTTPS

На хостинге сначала создаётся сайт для `nazerak.ru` и назначается его document root. Затем DNS домена направляется на выданный хостингом A/AAAA или CNAME target. Для `www` обычно настраивается отдельный CNAME или redirect на основной домен. После проверки DNS включается TLS/HTTPS и желательно принудительно перенаправляется HTTP → HTTPS.

## Supabase Auth

После появления сайта на `https://nazerak.ru` в Supabase Auth URL Configuration нужно установить Site URL и разрешить точные redirect URLs:

- `https://nazerak.ru/`
- `https://nazerak.ru/cabinet.html`

Старые GitHub Pages redirect URLs лучше оставить на переходный период, а удалить уже после подтверждения нового production.

## Если хостинг даёт только FTP/FTPS

Текущий production workflow рассчитан на SSH. Для FTP/FTPS deploy-адаптер меняется на актуальный FTP Deploy action; код сайта и QA-цепочка при этом не меняются.
