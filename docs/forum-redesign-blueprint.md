# NaZerak Forum — redesign blueprint (2026-10)

## Purpose

Replace the current forum presentation through a deliberate, evidence-based redesign. This is a product and implementation contract, not a promise that the forum is already rebuilt or deployed.

Reference projects to study for interaction and information architecture: Majestic RP, GTA5RP, RMRP, Matreshka RP, Black Russia, Region RP and similar roleplay communities. Do not copy logos, artwork, proprietary copy, or distinctive brand styling.

## Product principles

1. **A forum first, not a dashboard.** Content hierarchy, discussions and people take priority over decorative cards.
2. **A coherent product.** Index, category, topic, member directory, search, profile, new-topic flow, cabinet and moderation share the same design system.
3. **Readable at a glance.** Large enough type, clear line lengths, useful metadata, generous row height and obvious interactive states.
4. **Restrained identity.** Near-black/graphite surfaces, white typography, muted secondary text, NaZerak red only for important actions and state. Avoid neon, cyberpunk HUDs, excessive glass, gradients and repeated outlined cards.
5. **Real behavior only.** Never invent online counts, activity, users, posts, or success messages. Real backend data and authorization remain authoritative.
6. **Mobile is a first-class layout.** No clipped controls, horizontal overflow, microscopic buttons, or desktop tables squeezed onto phones.
7. **Preserve continuity.** Keep account identity, Supabase integration, existing topic/reply behavior, permissions, clean URLs and deployment architecture unless a verified issue requires a deliberate migration.

## Reference audit questions

For each reference, inspect the forum itself where accessible (not only its marketing site):
- How top-level categories and nested subforums are presented.
- How recent activity, last reply, author, topic status and counts are prioritized.
- How server/department/faction sections scale without becoming an unscannable wall.
- How reports, applications, rules, support and roleplay content are separated.
- How a user gets from category to topic, replies, profile and back.
- How search, pagination, filters, breadcrumbs and mobile navigation behave.
- Which patterns are useful for NaZerak and which should not be copied.

Record findings as observations, not assumptions. If a reference cannot be inspected, mark it unavailable rather than claiming it was audited.

## Information architecture

Keep these six primary areas:
1. **Информация и правила** — announcements, project rules, guides and server information.
2. **Государство и организации** — government, court, prosecutor, FSB, МВД, army, hospital and other organizations; nested structure should be expandable.
3. **Игровой мир** — player stories, RP biographies/situations, events and in-game content.
4. **Обращения и поддержка** — player reports, appeals, help requests and technical issues, with clear access and status semantics.
5. **Проект и развитие** — updates, suggestions, bug reports and project feedback.
6. **Сообщество** — general conversation, media, creations and community activity.

Do not create empty placeholder subforums merely to make the index look populated. Sections and latest-topic previews must be driven by actual configured data. The user creates forum topics; do not seed topics under the user's name.

## Required screen designs

### Forum index
- Shared global navigation and account entry.
- Clear title and concise description.
- One primary action to create a topic (gated by authentication and permissions).
- Search entry point.
- Strong category hierarchy with a readable row-based layout; each row shows only useful metadata.
- Recent discussions panel on wide screens; moves below primary content on narrow screens.
- No fake statistics, fake recent topics or empty decorative widgets.

### Category
- Breadcrumbs and category heading with short contextual description.
- Topic list with clear pinned/locked/solved or review status where supported by actual schema.
- Author, last activity and reply metadata with sensible responsive behavior.
- Search/filter/pagination only where backed by real behavior.
- Empty, loading, error and access-denied states.

### Topic
- Breadcrumbs, title and status.
- Posts with readable measure, stable author identity and role labels only when sourced from trusted role data.
- Clear reply action, reply composer, pagination and moderation actions based on permissions.
- Preserve deep links and clean URLs; handle missing/deleted/unavailable topics safely.

### Search and members
- Search supports meaningful query states, empty results and errors.
- Members directory uses real data, legible identities, role labels and profile links.
- Filters/pagination must work; no decorative controls.

### Profile, cabinet and moderation
- Consistent profile header, identity and role presentation.
- Clear Minecraft account binding and media-partner application state where currently supported.
- Moderation surfaces separate from public content and enforce authorization server-side/RLS-side.
- Do not expose private account data or moderation-only fields in public queries.

### New topic and replies
- Explicit category selection, title and content fields with inline validation.
- Prevent duplicate submission and show backend-confirmed success/failure.
- Preserve typed content if submission fails where practical.
- Do not report success before Supabase confirms the write.
- Permission failures, expired sessions and network errors need actionable messages.

## Visual system direction

- Background: near-black; surfaces: graphite with subtle tonal separation.
- Text: high-contrast off-white; secondary text muted but readable.
- Red accent: primary CTA, selected state and small status signals only.
- Layout: predictable max-width, consistent gutters, grid aligned to a spacing scale.
- Corners: moderately rounded, not pill-shaped everything; use borders sparingly.
- Typography: clear hierarchy with comfortable line-height; no tiny all-caps labels as primary information.
- Motion: subtle 160–260 ms transitions; respect prefers-reduced-motion.
- Focus: visible keyboard focus; semantics, labels and contrast must be tested.
- Imagery: only purposeful, locally hosted or approved assets; never use random stock art to fill space.

## Technical audit before UI implementation

Inspect all forum-related HTML, CSS and JavaScript, route/redirect handling, auth/session lifecycle, Supabase queries, schema and migrations, RLS policies, CSP, and QA/deploy workflows. Map each page to its scripts and data dependencies. Identify duplicate styles, stale version strings, brittle selectors and route mismatches before changing implementation.

Pages to include at minimum:
- forum index
- category
- topic
- search
- members
- member profile
- cabinet/auth entry
- moderation/reports
- 404 and clean-route behavior

Do not replace the working auth/database path with mock data or a frontend-only permission check.

## QA acceptance gates

### Static and security
- Existing static QA passes.
- No duplicate IDs, broken local asset references, stale cache versions or new secrets.
- RLS and role/permission checks remain intact; no private data leakage.
- CSP remains as restrictive as the integrations allow.

### Functional browser flows
- Open index and navigate to every major screen.
- Search by query and handle empty/error states.
- Authenticated user can create a topic in an allowed section and see backend-confirmed result.
- Authenticated user can reply where permitted.
- Unauthenticated and unauthorized actions are blocked with clear messages.
- Profile, members, clean URLs, back/forward navigation and expired session are checked.
- Moderation actions are verified against actual permissions.

### Responsive and visual
Capture screenshots at 1440x900, 1024x768, 768x1024, 390x844 and 320x740.
Check alignment, type scale, spacing, wrapping, modal bounds, focus, overflow, sticky header overlap, touch target size and content density. Inspect screenshots; passing a DOM test alone is not visual sign-off.

### Release
Do not deploy to production until static, functional, security and responsive gates pass. Verify the actual production domain and clean routes after deployment; report any route not externally verified as unverified.

## Delivery sequence

1. Inspect repository state and all current forum routes/data dependencies.
2. Audit reference patterns and write findings.
3. Produce a screen-by-screen design specification and shared tokens.
4. Implement index, category and topic as the first coherent vertical slice.
5. Implement search, members, profiles, create/reply and moderation.
6. Run functional and responsive QA, inspect screenshots, fix regressions.
7. Run release/security gate and production verification.
8. Summarize changed files, evidence, limitations and deploy status.

## Non-goals

- Do not publish an unverified mockup as the finished forum.
- Do not remove existing functionality just to simplify the design.
- Do not create sample topics attributed to the project owner.
- Do not claim reference review, test success or deployment without evidence.
