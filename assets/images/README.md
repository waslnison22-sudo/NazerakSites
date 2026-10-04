# Визуалы NaZerak

Изображения подключаются автоматически, когда соответствующий файл появляется в этой папке. Без файла интерфейс остаётся на безопасной CSS-заглушке — битых изображений в UI не создаётся.

| Файл | Слот |
|------|------|
| `forum-hero.jpg` | Hero форума |
| `hero-world.jpg` | Hero главной |
| `world-panel.jpg` | Блок «Мир» на главной |
| `partnership.jpg` | Блок «Сообщество» на главной |
| `og-cover.png` | Open Graph / социальная карточка |

Рекомендуемый формат для крупных визуалов: JPG/WebP, около 1920 px по ширине. Для прозрачных элементов можно использовать PNG.

## Важно

В текущем состоянии репозитория сами бинарные изображения ещё не находятся в `assets/images/` — там только этот файл-инструкция. Поэтому код уже подготовлен под реальные визуалы, но не выдаёт 404-запросы и не показывает пустые «сломанные» картинки.

Ничего дополнительно менять в HTML после загрузки этих файлов не требуется.


### Current 2026-10-04 artwork status

The Library contains two relevant NaZeRaK assets: the red city/megapolis artwork is the preferred forum hero source, and the red-black brand pack is the visual reference for supporting graphics. They are not currently committed as binary files in this GitHub directory. The loader therefore does not probe guessed filenames and produces no 404s. Add the chosen binary asset here, then reference it with `data-image-src` on the matching media slot.
