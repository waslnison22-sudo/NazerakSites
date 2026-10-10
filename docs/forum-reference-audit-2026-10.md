# NaZerak Forum v3 — competitive reference audit
**Research date:** 11 October 2026  
**Status:** Research-backed product/design input; this is not a claim that a new UI has already been implemented or released.  
**Repository branch:** `forum-redesign-research-2026-10`

## Executive conclusion

The forum should be designed as a real community publication and game-world information system, not as a dashboard or a stack of decorative cards. The strongest recurring patterns across the audited roleplay forums are:

- A clear tree of categories, forums, subforums and archives.
- Separate destinations for project rules, support, public discussion, RP content, applications and complaints.
- Activity metadata close to the title: author, last post, reply count, and a human-readable status.
- Server/realm/organization context when content belongs to a specific in-game world.
- Explicit moderation outcomes such as open, pending, approved, rejected, resolved, closed and archived.
- Direct links to official resources and community channels where they help users complete a task.
- A consistent path from forum index → category → thread → author profile → back to the originating category.

These patterns are observed facts in the sources below. The visual synthesis proposed for NaZerak is a design recommendation, not a claim that every reference uses identical UX.

## Source audit

### 1. Majestic RP
**Primary sources:** [Official site](https://majestic-rp.ru/), [official forum](https://forum.majestic-rp.ru/), [official wiki](https://wiki.majestic-rp.ru/)

**Observed**
- The official site directs players to the forum for server rules, player complaints and events.
- Detailed game guides, mechanics and professions are separated into a wiki/knowledge base.
- Login problems are routed to official Discord support.
- The forum front end requires JavaScript in the web research view, so its live visual behavior could not be fully audited from parsed text alone.

**Transfer to NaZerak**
- Keep official rules, public rulings/appeals and events discoverable from the forum index.
- Do not force all knowledge into discussion threads: rules/guides should be easy to scan, link and maintain.
- Add contextual help links where people get stuck (Discord/support), without allowing the community channel to replace in-forum records.

**Confidence:** high for service boundaries; limited for pixel-level/current responsive appearance.

### 2. GTA5RP
**Primary sources:** [Official forum](https://forum.gta5rp.com/), [complaints category](https://forum.gta5rp.com/categories/zhaloby.298/)

**Observed from indexed official forum content**
- The main forum divides project rules, technical support and events from per-server sections.
- The complaints area separates complaints against administrators, leaders and players, with archives under relevant categories.
- Server sections contain their own rules, activities, government organizations and roleplay systems.
- The public HTML reader was denied direct access (403), so this is an information-architecture audit, not a complete visual interaction audit.

**Transfer to NaZerak**
- Do not mix technical support, moderation appeals and general conversation in one undifferentiated feed.
- Make the purpose of a section obvious from its name, and put resolved/archived records in a predictable place.
- Since NaZerak is one Minecraft world/community rather than a many-server GTA network, use realm/world context only when there are real distinct worlds or rule sets; never multiply empty sections just to mimic a larger network.

**Confidence:** high for indexed hierarchy; limited for current visual and behavior testing.

### 3. RMRP
**Primary sources:** [Official forum index](https://forum.rmrp.ru/), [server 1 / Rublyovka](https://forum.rmrp.ru/forums/server-1/), [new-player guide](https://forum.rmrp.ru/threads/kak-nachat-igrat-na-rmrp.186462/)

**Observed**
- A project-rules area exists above server-specific areas.
- The forum tree is deeply structured by server, then organizations/departments and their sub-areas.
- The visible hierarchy includes government, legislative/executive/judicial branches, prosecutor/general prosecutor, investigative committee, FSB, army, hospitals, and organization-specific portals.
- Electronic applications/appeals and Discord links are attached to appropriate organizations.
- RP situations and biographies distinguish approved from rejected content.
- Complaints and applications distinguish categories (players/leaders/administration/amnesty/staff roles) and provide review-oriented subforums.
- The index exposes discussion counts and latest activity for categories/servers.

**Transfer to NaZerak**
- NaZerak’s government/court/prosecutor/MVD/FSB/army/hospital structure should be represented as a navigable hierarchy with clear parent/child relationships, not just generic topics.
- Where a process is formal (application, complaint, appeal, court filing), model its lifecycle and review state explicitly.
- Keep staff-only or private materials out of public navigation and enforce their access in the backend.

**Avoid**
- Reproducing a very deep tree wholesale. It is suitable for a multi-server roleplay network with large volumes, but would overcomplicate a smaller Minecraft community.

**Confidence:** high for structure and content taxonomy; limited for fine visual comparisons because the reader extracts text.

### 4. Matreshka RP
**Primary sources:** [Official forum](https://forum.matrp.ru/index.php), [official support article](https://support.matrp.ru/hc/knowledge_base/articles/1741614407-), [official knowledge base](https://kb.matreshka.gg/hc/knowledge_base/articles/1758725027-)

**Observed**
- The forum presents current news, help, technical-support complaints and sections repeated by individual server (for example server 1, 2, 3 and further).
- Thread labels observed in indexed results include information, open, closed, pinned/important, pending/requiring a decision and resolved outcomes.
- Organization sections contain applications, employee complaints and operational posts, such as hiring/promotion requests.
- Official guidance describes the forum as a place for guides, project news and server-specific discussions; separate in-game support handles assistance and player reports, while Discord is used for community discussion.
- Direct open of the live forum timed out in this reader; indexed forum pages still exposed current content but do not establish exact responsive behavior.

**Transfer to NaZerak**
- Use concise status chips for genuine moderation/workflow states; status text must come from data.
- Separate universal project sections from organization- or world-specific discussions.
- Use a clear, consistent application template where the project has a formal process.
- Empty, pending, and resolved states need distinct visual language but should not rely on color alone.

**Avoid**
- Putting “Open/Closed/Important” tags on everything. Status is meaningful only when a category supports it.

**Confidence:** high for observed taxonomy/statuses; moderate-to-low for exact visuals.

### 5. Black Russia
**Primary sources:** [Official forum](https://forum.blackrussia.online/), [example RP biography thread](https://forum.blackrussia.online/threads/role-play-%D0%B1%D0%B8%D0%BE%D0%B3%D1%80%D0%B0%D1%84%D0%B8%D1%8F-%D0%9C%D0%B8%D0%BB%D1%8B-%D0%9F%D0%BE%D0%BF%D0%B8%D1%82%D0%BE%D0%B2%D0%B0.7684646/)

**Observed**
- The site requires JavaScript in the research reader, limiting an automated full-page audit.
- Indexed thread data exposes author profile information (registration date, post/reaction/score counts), an explicit decision/status at the thread top, and a locked/reply-disabled state.
- A third-party screenshot of the forum index shows a dark, dense forum layout, compact primary navigation and conventional row-based section hierarchy. This image is a secondary source and is not enough to certify the current official appearance.

**Transfer to NaZerak**
- Thread state should be visible before a user opens or reads a long topic.
- Author profile metadata can help establish continuity, but public profiles should display only safe, purposeful details.
- Reuse functional ideas, not another project’s exact branding, copied art, logos or distinctive color treatment.

**Confidence:** moderate for thread/profile states; low for up-to-date visual details from secondary imagery.

### 6. REGION RP
**Primary source:** [Official forum](https://forum.region.game/)

**Observed**
- Rules and server-specific organization sections are clearly separated.
- The visible organization hierarchy includes government, legislative/executive/judicial branches, prosecutor and investigative committee.
- Court filings, citizen appeals and prosecutor submissions may have separate “reviewed” / “rejected” archives.
- Complaints are separated by player, organization leader and server administration.
- RP situations and biographies distinguish approved and rejected records.
- Staff online, users online and forum totals appear in the index. These are useful only when live data is real and reliable.

**Transfer to NaZerak**
- Build formal government/legal sections as a compact but understandable tree.
- Put the current actionable destination first, then expose completed/archive records as secondary navigation.
- Only show live counts and activity if backed by the database and updated correctly; never invent activity to make the UI look populated.

**Confidence:** high for the index taxonomy and visible metadata.

### 7. GTA Role Play / Radmir (additional comparison)
**Sources:** [GTA RolePlay forum](https://forum.gtarp.ru/), [RADMIR GTA 5 forum](https://forum.radmirv.com/)

**Observed**
- GTA Role Play separates rules/useful information, help and technical sections.
- Radmir exposes project rules, complaints against senior administration, general community areas, archive, latest activity and member/online counters.

**Transfer to NaZerak**
- Technical support should not be mixed with public project debate.
- Provide a predictable archive destination and a real latest-activity view.
- User/online/statistics blocks are optional. On NaZerak, priority goes to sections and threads; statistics only exist if reliable and useful.

### 8. Forum platform documentation (interaction and information architecture)
**Primary sources:**
- [XenForo: Nodes and forums](https://docs.xenforo.com/manual/forums/nodes-forums)
- [XenForo: Threads](https://docs.xenforo.com/manual/forums/threads)
- [XenForo: Thread prefixes](https://docs.xenforo.com/manual/forums/thread-prefixes)
- [XenForo: Forum/thread types](https://docs.xenforo.com/manual/forums/forum-thread-types)
- [XenForo: Permissions](https://docs.xenforo.com/manual/access-privileges/permissions)
- [XenForo: Users](https://docs.xenforo.com/manual/users)

**Observed platform patterns**
- A forum tree can model categories, content forums, external/link destinations and static help pages.
- Topics can use prefixes (with allowed groups and applicable forums).
- Separate content types are useful for unstructured discussions, polls, articles/guides, questions with accepted answers, and suggestions.
- Permissions can be both group-level and per-section; confidential sections must be protected at the permission/data layer, not merely hidden with CSS.

**Transfer to NaZerak**
- A compact domain-specific subset is enough for the first release: discussions, official information, suggestions, and workflow topics with status.
- Prefixes should be constrained to relevant sections and user roles.
- Backend rules and database policies are the authority for role/section access.

## Cross-reference matrix

| Pattern | Majestic | GTA5RP | RMRP | Matreshka | Black Russia | REGION |
|---|---|---|---|---|---|---|
| Rules + official information | Observed | Observed | Observed | Observed | Partial | Observed |
| Separate server/world sections | Not verified in this audit | Observed | Observed | Observed | Not fully verified | Observed |
| Formal complaints/applications | Official site points to them | Observed | Observed | Observed | Thread statuses observed | Observed |
| Reviewed/resolved/closed records | Not verified in this audit | Archives observed | Reviewed archive observed | Status labels observed | Thread locking/status observed | Explicit archives observed |
| Legal/government hierarchy | Not verified in this audit | Some server areas | Extensive | Organization hierarchy | Not fully verified | Extensive |
| Full visual audit via reader | No | No (403) | Partial text audit | No (timeout) | No (JS required) | Partial text audit |

“Not verified” means the available research output did not establish the feature; it is not a claim that the site lacks it.

## Design recommendation for NaZerak

### Product position
A premium, dark, Russian-language community forum for a Minecraft world built around governance, organizations, survival and the community. It should feel editorial and grounded in the game world, not like a SaaS dashboard or a clone of a GTA forum.

### Visual direction
- Canvas: near-black graphite, with subtle tonal changes between page, section header and row. Avoid large gradients and a wall of outlined cards.
- Typography: body text 15–17px on desktop, 15–16px on mobile; row titles 16–18px; page title 38–48px depending on viewport. Secondary metadata remains readable.
- Width: content max width around 1280–1360px; stable horizontal gutters 32px desktop, 24px tablet, 16px small mobile.
- Grid: index should use a stable main/aside grid around 2:1 (roughly 800px/340px at wide desktop), with the aside placed below the main content on tablet/mobile. No CSS grid child should have an implicit oversized minimum width.
- Rows: predictable 68–84px desktop height depending on metadata; single clear title column; last activity remains compact; avoid several mismatched independent count columns if they do not aid decisions.
- Contrast: warm off-white for key text, neutral grey for secondary data, restrained NaZerak red for primary action/active state/important flags only.
- Surfaces: one primary content surface per functional region; section groups separated by spacing and subtle dividers; use shadows sparingly.
- Radius: 10–16px for controls/rows and 16–22px for major panels. Avoid pills on large boxes.
- Motion: 160–240ms ease transitions, no mouse-follow glow, parallax or disruptive animation; honor `prefers-reduced-motion`.
- Icons: one consistent local icon system or simple SVG set; do not mix emojis, Unicode symbols and different icon families as a substitute for a coherent system.
- Artwork: use NaZerak-owned/approved artwork only; decorative backgrounds must not compromise text contrast.

### Index composition (desktop)
1. Global nav: logo, Forum, Members, Search, notifications/account. One row with balanced height and no floating controls.
2. Small breadcrumb only where needed, followed by page title and a short useful description.
3. One primary action, “Создать тему”, shown only when user permissions allow; one search control.
4. Main column: six category groups with 1–4 relevant child forum rows each, in the existing approved taxonomy:
   - Информация и правила
   - Государство и организации
   - Игровой мир
   - Обращения и поддержка
   - Проект и развитие
   - Сообщество
5. Each section group has an unmistakable section heading, then simple aligned rows. A forum row may show icon/mark, title, short description, optional fresh activity and counts only when meaningful.
6. Quiet right rail: a compact latest-discussions list, a link group for key destinations and, only if reliable, a community summary. It must never visually compete with the section index.
7. Footer with concise project links and independence/legal statement.

### Category composition
- Breadcrumb → category name/description → primary action → optional search/filter/sort → thread rows → pagination.
- Thread row hierarchy: status/prefix + title; short preview only if it helps; author + category context; reply count + last activity.
- Pins and official notices are grouped at the top and visually distinct but not oversized.
- Filters must actually change query results. A decorative selector is not acceptable.

### Topic composition
- Breadcrumbs and title/status above the discussion.
- Content area constrained for comfortable reading; author panel metadata must not overpower the message.
- Posts use a consistent grid; mobile moves user metadata above or into a compact header rather than squeezing desktop columns.
- Replies/pagination and moderation controls are separated from the post body.
- Locked topic, missing topic, access denied, loading, and backend error have explicit states.

### Information architecture (first version)
1. **Информация и правила**: announcements, rules, server guide, changelog.
2. **Государство и организации**: government/state; court and prosecutor; security/internal affairs; army; hospital; organizations/factions. Keep nested levels shallow initially; add detailed children only when actual usage justifies them.
3. **Игровой мир**: builds/world changes, survival stories, player guides, events, player projects/media.
4. **Обращения и поддержка**: help requests; reports/appeals; application destinations, each with policy/status semantics. Sensitive cases must use appropriate access rules.
5. **Проект и развитие**: suggestions, defect reports, development updates.
6. **Сообщество**: general chat, screenshots/video, creative work, looking for teammates.

No seed topics written as the owner. Do not render empty fake rows, arbitrary thread totals, fake online users, or fake latest messages.

### Core functional inventory
- Index/category/topic with clean routes, breadcrumbs and reliable back navigation.
- Search across permitted topic content and authors; explicit no-results and error states.
- Members directory and public profile with safe visible fields only.
- Create/edit topic and reply with field validation, disabled loading state and duplicate-submit protection.
- Pins/locks/archive/moderation actions based on current authenticated user and server-side permissions.
- Role labels from trusted roles only; no trusting local storage or client-side role names as authority.
- Real notification state (when available), unobtrusive and keyboard/touch usable.
- Consistent signed-out, session-expired, no-permission, empty, error and loading states.
- Discord is a community destination, not an alternative for a record that the forum needs to preserve.

## Repository-aware technical constraints

This repository currently uses static HTML, CSS and JavaScript with Supabase/Postgres and clean routes managed by `.htaccess`/GitHub Actions. Existing files include the forum index/category/topic/search/member/profile/reports views, shared forum scripts, many SQL migrations, a schema snapshot and QA/deployment workflows.

Therefore:
- Keep the current public routes and auth identity flow unless tests prove a route needs an explicit migration.
- Reuse existing schema, RPCs and row-level security policies; review them before altering database behavior.
- Do not introduce a new framework, icon library CDN or third-party font dependency simply for styling.
- Replace the current accumulated forum CSS with a deliberately organized style system rather than appending another layer of overrides.
- Prefer shared, documented components/tokens across index, category, topic, search, members, profile and moderation views.
- Clean up stale cache-version strings in a controlled, tested update; do not bump versions on only some pages.
- Keep production disabled until the entire forum flow, screenshots, static checks and security regression checks pass.

## Existing implementation and data capabilities (repository inspection)

The live codebase is not a blank slate. The schema and migrations already contain or define:

- A forum tree with categories/forums, parent/child ordering, routes/slugs and posting modes.
- Public-safe topic and author projections/counters used by the index and category lists.
- Topic states/metadata: pinned, locked, archived, prefix, views and solution state.
- Replies/posts with per-topic ordering and author identity.
- Forum roles and role assignments, with permission checks that must remain authoritative.
- Social capabilities: post reactions, topic bookmarks, topic watchers, reports and notifications.
- Report workflow values in the current migration: `open`, `reviewing`, `resolved`, `dismissed`.
- A permission-checked moderation RPC for topic actions. Moderation must continue to use this server/database path rather than client-side role checks.
- Existing route templates/scripts for index, category, thread, search, members, public profile and reports/moderation; shared auth/session scripts and clean URL routing.
- A browser smoke workflow and screenshot artifacts, along with static and Supabase-runtime checks.

### UI-to-data mapping

| UI element | Source of truth | Design rule |
|---|---|---|
| Section/category hierarchy | Forum node/category directory | Show only configured accessible nodes; never infer or fabricate nodes. |
| Thread title and snippet | Topic rows / safe public view | Escape output, truncate previews gracefully, link to canonical clean URL. |
| Pinned/locked/archived/solution marker | Topic fields / supported state | Show only a state that exists; label it with text, not color alone. |
| Replies and last activity | Posts and cached public counts/timestamps | Use database-derived values; avoid hand-written counters. |
| Identity and role badge | Authenticated identity + trusted role projection | A display name or role from local storage is never authority. |
| Reactions/bookmarks/following | Existing social tables and policies | Controls must reflect persisted state and backend-confirmed mutations. |
| Moderation/report workflow | Current RPC + report table/policies | Never show a moderation control to unauthorized users; backend still rejects unauthorized calls. |
| Forum alerts/notifications | Notifications table and policies | Distinguish unread/read; avoid placeholder counts if not loaded. |

The redesign should begin by mapping these existing sources into reusable page components. Before adding a database migration, verify that the requested state/function is not already supported by the schema, migration history or RPCs.

## Design and QA acceptance gates

### Layout/visual
Capture and manually inspect:
- 1440×900 desktop
- 1280×800 desktop/laptop
- 1024×768 tablet landscape
- 768×1024 tablet portrait
- 390×844 modern phone
- 320×740 narrow phone

Reject a release if any screenshot shows:
- Misaligned columns, inconsistent left/right edges or accidental horizontal scroll.
- Overlapping headers, title/action collisions or modals beyond the viewport.
- Tiny text, tiny click targets, clipped metadata or unreadable contrast.
- A control that looks clickable but does nothing.
- Empty fake content, wrong author, bogus count, broken icon or placeholder asset.
- Old/new styles visibly fighting one another.

### Accessibility
- Visible keyboard focus; logical tab order; semantic headings and labelled inputs.
- All controls usable without hover; touch targets preferably 44×44px or larger.
- Dialog focus management and Escape/close behavior.
- `prefers-reduced-motion` support.
- Status information readable as text, not color alone.

### Functional/security
- Static QA and browser smoke all pass.
- Test anonymous and signed-in states; create topic, reply, search, member/profile navigation, edit/lock/pin/archive where permitted.
- Verify backend-confirmed writes and meaningful errors.
- Verify RLS/RPC access, no public leakage from private fields/threads, no role spoofing, safe HTML/output handling and CSP integrity.
- Deep links, refresh, back/forward and invalid IDs work on clean routes.
- Production routes are verified externally after release; unverified routes are reported as such.

## Source ledger
- Majestic official site + forum link: https://majestic-rp.ru/ ; https://forum.majestic-rp.ru/
- GTA5RP official forum: https://forum.gta5rp.com/
- RMRP official forum: https://forum.rmrp.ru/
- Matreshka forum: https://forum.matrp.ru/index.php
- Matreshka official support article: https://support.matrp.ru/hc/knowledge_base/articles/1741614407-
- Matreshka knowledge base / official social spaces: https://kb.matreshka.gg/hc/knowledge_base/articles/1758725027-
- Black Russia official forum: https://forum.blackrussia.online/
- REGION official forum: https://forum.region.game/
- GTA RolePlay forum: https://forum.gtarp.ru/
- Radmir GTA 5 forum: https://forum.radmirv.com/
- XenForo nodes/forums manual: https://docs.xenforo.com/manual/forums/nodes-forums
- XenForo threads manual: https://docs.xenforo.com/manual/forums/threads
- XenForo prefixes manual: https://docs.xenforo.com/manual/forums/thread-prefixes
- XenForo forum/thread types: https://docs.xenforo.com/manual/forums/forum-thread-types
- XenForo permissions manual: https://docs.xenforo.com/manual/access-privileges/permissions
- XenForo users manual: https://docs.xenforo.com/manual/users

## Audit limitations
The text-based reader cannot execute the JavaScript-driven forum UIs as a real signed-in browser. GTA5RP's root was denied (403), Black Russia and Majestic returned a JavaScript requirement, and Matreshka timed out on direct open; their publicly indexed pages were still useful for taxonomy/status research. This research does not claim to have tested login-only flows, submit forms, live responsive behavior, or all routes. Those require browser-based implementation QA during the next phase.
