# Визуалы NaZerak

Основные визуалы подключаются через явные ссылки из страниц и CSS. Отсутствующие опциональные изображения не должны создавать 404 в браузерной консоли.

| Файл | Слот |
|------|------|
| `forum-hero.jpg` | Hero форума |
| `hero-world.jpg` | Hero главной |
| `world-panel.jpg` | Блок «Мир» на главной |
| `partnership.jpg` | Блок «Сообщество» на главной |
| `og-cover.png` | Open Graph / социальная карточка |

Рекомендуемый формат для крупных визуалов: JPG/WebP, около 1920 px по ширине. Для прозрачных элементов можно использовать PNG.

## Важно

Текущий репозиторий содержит `forum-hero.svg` — это рабочий hero-визуал форума. Дополнительные JPG/PNG/WebP-файлы из списка ниже пока не закоммичены.

Ничего дополнительно менять в HTML после загрузки этих файлов не требуется.


### Current 2026-10-04 artwork status

The repository currently commits the forum hero as `forum-hero.svg`. The current GitHub tree does not contain the additional binary artwork names listed below. Do not add guessed runtime probes for files that are not present; add an asset first, then wire it explicitly.
