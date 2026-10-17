# NaZerak Forum Next — design preview

This folder is a **standalone, non-production design prototype** for a new forum direction.

## Open locally
Open `index.html` in a modern browser. The concept uses only local HTML, CSS and JavaScript; it does not require a build step or external fonts/CDNs.

## What to review
- Desktop layout at 1440 px and 1280 px
- Tablet layout around 768–1024 px
- Mobile layout at 390 px and narrow 320 px
- Mobile menu opens/closes and exposes its state accessibly
- Search filters sample board rows, reports results and can be cleared
- Long text wraps without overlapping counts or controls

## Data & production boundary
All example board names in the preview are proposals, and all latest-topic labels are explicitly marked as demonstration content. No production topic, forum count, player count, database row or account has been fabricated. This folder does not connect to Supabase or replace any live route.

Before implementation, compare the proposed categories with the real Supabase schema, authorization checks and the existing public URL structure. The complete direction, layout rules, route inventory and release gates are in [DESIGN.md](./DESIGN.md).
