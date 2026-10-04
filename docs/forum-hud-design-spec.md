# NaZerak Forum HUD — Visual Specification v0.1

Status: design preparation only. No production upload.
Baseline: main at 7367cd200ccdcd847ddfcc0c0481e5eb0180b20e.

## Design intent

NaZerak is a Minecraft roleplay community. The forum should feel like a dependable community service—not a marketing landing page, game HUD imitation, or generic dashboard. Prioritize orientation, reading, participation and trust.

Visual direction:
- Dark charcoal foundation, restrained NaZerak red for primary actions and active states.
- Mostly solid rectangular surfaces with subtle borders. Avoid glass blur, glossy layers, oversized shadows, and unnecessary glow.
- Strong Russian typography and natural wrapping. Use the existing system font stack until a bundled font is verified.
- Consistent alignment, content width and vertical rhythm.
- Short functional motion only; honor prefers-reduced-motion.

## Proposed design tokens

| Token | Target |
|---|---|
| Page background | #08090D / #0B0D12 |
| Main surface | #11151C |
| Raised surface | #171C24 |
| Main text | Near-white, high contrast |
| Secondary text | Medium gray, still legible |
| Accent | NaZerak red, used selectively |
| Content max width | 1320–1400px, after correcting shared container constraint |
| Desktop gutter | 24px |
| Tablet gutter | 20px |
| Mobile gutter | 16px |
| Body text | 16px |
| Secondary text | 14px |
| Dense metadata | 12px minimum, nonessential only |
| Main title | 48–64px desktop; 34–42px mobile |
| Section title | 22–26px |
| Row title | 16–18px |
| Button label | 14–15px |
| Primary action height | 48px desktop; 48–52px touch |
| Icon-only action | 44×44px minimum, with accessible name |
| Spacing steps | 4, 8, 12, 16, 24, 32, 40px |
| Corner geometry | 8–12px controls; 12–16px major surfaces |
| Focus ring | 2px visible outline with 2–3px offset |

These are proposed constraints, not current implementation values. Validate final contrast and font rendering in screenshots.

## Page compositions

### Global forum header
- Stable 64–72px header, solid rather than translucent blur on forum routes.
- Brand at left; Forum, Members, Search and account navigation at right.
- Desktop navigation labels remain legible and have adequate target height.
- Mobile navigation becomes a labelled menu with a 44px control and vertical 44px rows.
- Header never obscures anchors or main content.

### Forum index
- Hero is a useful banner, not a huge empty block. Align its text with the content below.
- Title and short description form one left-aligned group. Main actions sit at lower-left with clear hierarchy and stable spacing.
- Hero artwork is background-only and must not compete with text; test desktop and portrait crop.
- Search and count form one toolbar.
- Forum groups are primary. Each row prioritizes name and useful description; latest activity and counts are secondary and must not force tiny columns.
- Keep a side rail only if content density supports it. Empty latest activity must not leave a large dead column; collapse or reposition it.
- Consolidate community shortcuts and statistics instead of repeating cards or navigation.

### Category
- Breadcrumbs are quiet but readable.
- Title, short description and create action share a clear header.
- Topic rows prioritize title and author/context; reply count and latest activity are secondary.
- Tablet/mobile use deliberate stacked rows, not compressed desktop columns.
- Long titles wrap without clipping or colliding with controls.

### Topic
- Heading, category and date do not collide.
- Post content is the dominant reading surface.
- Author rail is allowed on wide screens; it becomes a compact author strip at narrower widths.
- Paragraphs, lists, quotes, code, links and images stay within the content area.
- Reply composer belongs to the same reading flow, with distinct locked, archived, guest, loading, error and empty states.

### Members
- 3 columns on wide desktop, 2 on tablet, 1 on mobile where content needs it.
- Name and role are primary; post counts and Minecraft name are secondary and readable.
- Whole member card is one coherent link; mobile action height at least 44px.
- Avatar size is stable with a designed missing-avatar fallback.

### Search
- Search field is at least 48px high and 16px on mobile.
- Result title and count remain distinct.
- Reuse topic-row anatomy where semantics match.
- Empty query, no matches, loading and backend failure are visually distinct.

### Profile
- Prioritize identity, role, Minecraft binding and authored topics.
- Do not reserve a large empty panel for absent bio or statistics.
- Use the same topic-row anatomy as search/category where practical.

### Composer and overlays
- Dialog is capped on desktop; mobile leaves 12–16px safe gutters.
- Short mobile viewports scroll internally while close, cancel and publish remain reachable.
- Labels are 14px; controls at least 48px high; textarea 16px with readable line-height.
- Busy state preserves dimensions and label; disabled state remains legible.
- Popovers remain within viewport and cannot depend on hover alone.

## Responsive behavior

| Width | Expected composition |
|---|---|
| 1920–1440 | Wide centered canvas, controlled line length, optional side rail |
| 1280 | Desktop only if every column remains readable |
| 1024 | Reduce side rail or move it below primary content |
| 768 | Single-column index; no squeezed metric columns |
| 390 | Mobile stack, readable text and full-size controls |
| 360 | Same mobile behavior with additional wrapping |
| 320 | Minimum supported width; no clipping, overlap or horizontal scroll |

Breakpoints are content-driven, not chosen only by device labels. Also validate at 200% zoom.

## Accessibility and interaction

- Primary buttons, menu, clear/reset, reply/create/publish controls target at least 44×44px.
- WCAG 2.2 SC 2.5.8 defines a 24×24 CSS px minimum with exceptions; 44px is the project target for important touch actions.
- Icon-only actions have accessible names; fields have programmatic labels.
- Check contrast for normal and muted text. Metadata must remain legible.
- Keyboard focus is visible and not hidden under sticky header or dialogs.
- Motion respects reduced-motion; no action is hover-only.
- At 200% zoom, information remains available without page-level two-dimensional scrolling, except intrinsically scrollable code/media.

## Artwork rules

- Re-scan the exact branch tree before integration. At baseline, assets/images contains forum-hero.svg and documentation only. Other JPG/PNG/WebP names in the guide are not verified files.
- Never infer paths from old prompts or placeholder documentation.
- Hero artwork needs sufficient contrast behind Russian text and actions; overlay only if screenshot evidence requires it.
- Post images use max-width:100%, intrinsic height and safe overflow behavior.
- Decorative images are hidden from assistive technology; informative images have concise alt text.
- Verify exact filename, dimensions, aspect ratio, file weight, CSP and crop. No speculative asset probes or 404s.

## Validation matrix

For all six routes, capture 1440×900, 1280×800, 768×1024, 390×844, 320×740 and 200% zoom. Include guest/authenticated navigation; populated and empty lists; long Russian titles/usernames; missing avatar; role badge; loading, timeout, error and no-results states; open/locked/archived topics; composer validation, busy, success and cancel states.

Measure horizontal overflow, clipping, overlap, computed type scale, target dimensions and spacing, line wrapping, console/page errors, failed same-origin requests, focus order, Escape handling and reduced-motion behavior.

## Stop conditions

Do not merge to main or deploy to nazerak.ru if core text falls below the specified floor, important controls are undersized, content clips/overlaps, an asset path is unverified, any data hook/permission/auth/posting/search/profile behavior regresses, exact-head QA is not successful, or screenshots have not been visually reviewed.
