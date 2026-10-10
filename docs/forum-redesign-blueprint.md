# NaZerak Forum — redesign blueprint
Version: 1.0 · 2026-10-09
Status: design contract; not a production release.

## Product objective
Rebuild the forum as a coherent community product, not a skin over the current index. Keep the existing static-site deployment, clean routes, Supabase-backed identity/content and Discord entry point unless code audit proves a safe migration is necessary. Preserve existing posts, profiles, role data, auth and moderation workflows. No destructive schema changes.

## Reference synthesis
Study the public information architecture and interaction patterns of Majestic RP, GTA5RP, RMRP, Matreshka RP, Black Russia, Region RP and adjacent Russian-language roleplay communities. Borrow proven patterns (clear category hierarchy, visible latest activity, profile/role identity, official announcements, applications and moderation affordances), never their branding, assets, text, or exact layouts. NaZerak should feel like its own Minecraft society.

## Visual direction: editorial community forum
- Canvas: near-black graphite (#08090C); raised surfaces #101217 / #151820; text #F3F4F6; muted text #A5AAB4; NaZerak red #FF334A reserved for primary actions, selected state and tiny status accents.
- No giant promotional hero, fake online counters, decorative HUD, glowing outlines, neon gradients, dense card walls or excessive glassmorphism.
- Use a centered content frame (max-width 1440px) with a 12-column desktop grid, predictable gutters and consistent spacing scale (4/8/12/16/24/32/48/64).
- Typography: readable Russian sans-serif, body 15–16px desktop and at least 15px mobile; section headings 22–28px; page title 36–44px desktop, 30–34px mobile. Line height 1.45–1.7. No microcopy used for essential controls.
- Surface hierarchy: page → section → rows. Prefer calm dividers and whitespace over enclosing every element in a bordered card. Radius 8–12px for controls, 14–18px for larger surfaces; avoid rounding everything to pills.
- Motion is subtle (160–240ms), respects prefers-reduced-motion, and never shifts layout.

## Information architecture
1. Forum index: compact title/intro and primary “Создать тему” action; section groups; rows with icon/initial, section title, short description, topic/reply counts and last activity; latest discussions in a restrained right rail on wide screens.
2. Category: breadcrumb, category title/description, topic list, sorting/filtering, pagination and new-topic action.
3. Topic: breadcrumb and title; status badges only when meaningful; author identity/role; readable post body; reply composer; reply pagination; edit/report/reaction states; sticky topic toolbar only when useful.
4. Members: searchable/filterable member directory and clear profile identity.
5. Profile: avatar, username, actual assigned roles, activity and existing public profile fields; never fabricate roles or stats.
6. Search: usable query, category and author filters; clear empty/loading/error states.
7. Creation/edit flows: accessible modal or page with validation, pending state, clear server errors and duplicate-submit protection.
8. Moderation: permission-gated actions, confirmations for destructive operations, auditability and understandable empty states.

## Layout contract
- Desktop ≥1200px: main column around 8/12 and secondary rail around 4/12; minimum 24px gutter. Main content aligned to one vertical grid.
- Tablet 768–1199px: reduce gutters; side rail may stack below main content; no squeezed three/four-column metadata.
- Mobile <768px: one column; navigation collapses accessibly; board rows become stacked content; no horizontal scrolling; touch targets preferably 44×44px or larger.
- 320px narrow viewport is a release test, not an afterthought. Long Russian words, usernames and titles must wrap safely.
- All controls have hover, focus-visible, active, disabled, loading, success and error states as relevant. Keyboard and screen-reader labels are required.

## Functional and data integrity requirements
- Keep current auth provider, Supabase client initialization, clean URL routing and Discord invite. Do not rewrite authentication merely to restyle the UI.
- Confirm every route’s script selectors and data contracts before markup changes. Existing database objects and field names must be discovered from repository migrations/runtime code, not guessed.
- No fake topic/member counts, placeholder topics attributed to the user, hard-coded identity/permissions, or optimistic “success” without server confirmation.
- Escape/sanitize user-generated content at render boundaries; never use untrusted HTML directly. Preserve CSP and external-link protections.
- Permission checks must be enforced by backend/RLS, not only hidden buttons.
- Loading, no-data, offline/network failure, unauthorized, validation error and server error states must be designed and tested.

## Implementation sequence
1. Baseline audit: inspect every forum page, shared styles, scripts, route rewrites, Supabase schema/RLS, auth and CI workflows. Record current behavior and establish screenshots/tests before touching code.
2. Design system: implement scoped forum tokens, typography, spacing, grid, controls, rows, breadcrumbs, badges, empty/loading/error states; remove conflicting legacy overrides only after selectors are mapped.
3. Build index and category as the first vertical slice; keep production unchanged until review and QA.
4. Rebuild topic view and composer/reply flow without breaking data or permissions.
5. Align members, profiles, search, reports and cabinet entry points to the same system.
6. Accessibility, security and responsive audit; add automated regression tests.
7. Browser QA at 1440×900, 1024×768, 768×1024, 390×844 and 320×740; test keyboard navigation, reduced motion, no horizontal overflow, long content, signed-out/signed-in/role-limited states, empty and failure states.
8. Run static QA, browser smoke, auth/Supabase smoke and deployment gate. Open PR with screenshots and evidence. Deploy only after checks pass; verify public routes and TLS afterward.

## Acceptance criteria
- No horizontal overflow at 320px, 390px, tablet or desktop.
- No clipped headings, overlapped controls, misaligned columns, micro-buttons or unreadable metadata.
- All visible controls do something real and their success/failure is reflected accurately.
- Forum pages share one design system and consistent spacing/alignment.
- Existing content, identities, roles, auth and permissions survive the rebuild.
- Automated checks and browser tests pass; production deployment is explicitly verified.
- No deployment to the live domain during design/implementation before the release gate passes.

## Risks to actively inspect
- Legacy CSS appended in multiple generations with selector collisions.
- Markup/script selector drift after redesign.
- Clean routes depending on hosting rewrites.
- Supabase RLS or auth redirect issues.
- Mobile header and long-content overflow.
- Cache-busted assets out of sync between pages.
- Deploy workflow falsely passing on skipped uploads or stale marker checks.
