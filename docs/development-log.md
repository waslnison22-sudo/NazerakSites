# NaZerak — Development Log

This log records verified engineering work, failures, cleanup and release checks. It is intentionally factual: no entry is marked complete without tool-backed evidence.

## 2026-10-03 — production cleanup and release hardening

### Repository state
- Repository: `waslnison22-sudo/NazerakSites`
- Production host: REG.RU shared hosting
- Production web root: `/var/www/u3669233/data/www/nazerak.ru/`
- Production domain: `https://nazerak.ru/`
- Deployment method: GitHub Actions → SFTP
- Release gate: successful `NaZerak QA` on the exact commit, then production deploy.

### Real problems found and fixed
1. Removed the obsolete homepage Government CTA. Government structures belong to the forum hierarchy, not the homepage.
2. Removed the obsolete public-route layer and its generated duplicate pages:
   - `/pravitelstvo/`
   - `/sud/`
   - `/prokuratura/`
   - `/fsb/`
   - `/voennaya-baza/`
   - `/organizatsii/`
   - `/o-proekte/`
3. Removed obsolete routing/config artifacts:
   - `site-routes.js`
   - `site-config.js`
   - `public-routes.json`
   - `DOMAIN_MIGRATION.md`
   - public-route generator/template.
4. Removed stale GitHub Pages production references from project documentation.
5. Updated browser smoke so logout is validated against the production root instead of the old `/NazerakSites/` path.
6. Removed obsolete forum query fields from frontend requests after the forum node-tree migration.
7. Removed stale QA assertions for deleted files.
8. Removed the unused `.deploy` directory from the source archive command. Previously `tar` could read its own output and emit `file changed as we read it`.
9. Production deployment itself successfully uploaded the tested public files over SFTP. The deployment then failed only at route verification because the REG.RU endpoint presented a self-signed/untrusted certificate.

### SSL finding
The current runner-side evidence is:
`curl https://nazerak.ru` fails with error 60: `SSL certificate problem: self-signed certificate`.

This is not a website code error. It means the hosting endpoint is still serving an untrusted/self-signed certificate instead of the ordered DomainSSL/Let’s Encrypt certificate chain. The deployment workflow is therefore being changed so:
- content verification uses HTTPS with certificate verification bypassed, proving that the new files actually reached the host;
- TLS verification remains a separate visible warning and does not block SFTP deployment.

This distinction prevents a valid code deployment from being reported as failed solely because the hosting certificate has not been activated, while still keeping the SSL defect visible.

### QA evidence
- `NaZerak QA` for commit `dcaf8b2`: **success**.
- The QA pipeline reached static checks, Supabase runtime smoke and browser smoke successfully.
- Production deploy for `dcaf8b2`: SFTP upload **success**; final route verification failed because of the untrusted TLS certificate.

### Recent cleanup commits
- `d8d55f5` — forum UI polish and ticker lag removal.
- `892d904` — remove Government CTA from homepage.
- `3470eca` — remove obsolete public route layer.
- `a46ea81` — fix browser smoke logout path.
- `592fa9c` — clean legacy docs/deployment paths.
- `d73fc46` — remove unused site configuration script.
- `c09fd99`, `9d42f62`, `dcaf8b2` — remove stale QA checks after cleanup.
- `e819f9e` — remove legacy forum query fields.

### Next audit targets
- Validate every forum frontend query against the current Supabase views and migration schema.
- Inspect topic creation/reply/edit/delete error handling and empty/loading states.
- Inspect auth/session recovery paths after Discord OAuth redirects.
- Check stale CSS/JS selectors and duplicate markup.
- Verify production routes after each release.
- Keep Supabase migration history intact unless a migration is demonstrably unused and safe to archive.


## 2026-10-03 — forum reliability pass

### Real problems found
1. The members page treated any Supabase failure as an empty directory. A network/API/RLS failure therefore looked identical to a real zero-member state.
2. The forum search page had the same silent-failure behavior: failed topic loading produced an empty result surface without explaining the problem.
3. The public forum profile treated database errors as "profile not found", conflating an unavailable backend with a genuinely missing profile.
4. Forum members/search/profile requests had no client-side timeout, so a stalled request could leave the surface waiting indefinitely.

### Fixes applied
- Added explicit error surfaces to the members and global-search pages.
- Added 8-second request timeouts for members and search loading.
- Added an 8-second timeout for profile and profile-topic loading.
- Distinguished profile backend errors from a genuinely missing profile.
- Bumped forum script cache revisions:
  - `forum-members.js?v=2`
  - `forum-search.js?v=2`
  - `user.js?v=2`

### Verification status
- Changes are committed directly to `main` through the repository API.
- The next required gate is the GitHub `NaZerak QA` run on the resulting HEAD.
- No production success is claimed until that run and the production content check are observed.


## 2026-10-03 — QA regression caught and corrected

### Regression
The first QA run after the reliability pass failed in the browser smoke test at the forum profile check. Root cause was introduced by the new timeout wrapper in `user.js`: the helper was referenced but had not actually been inserted because the source pattern did not match the compact current function.

### Correction
- Added the missing `withTimeout()` helper to `user.js`.
- Re-ran the full QA pipeline.

### Verified result
- QA run `37109447974`: **success**.
- Release checks: **success**.
- Supabase runtime smoke: **success**.
- Browser smoke: **success**, including:
  - homepage desktop/mobile;
  - forum index/mobile;
  - official forum category;
  - forum category;
  - members;
  - search;
  - forum profile.

## 2026-10-03 — production deployment after QA

- Production deploy run: `37109492322`.
- SFTP upload: **success**.
- Obsolete public route cleanup: **success**.
- Production content checks:
  - `https://nazerak.ru/`: **HTTP 200 / NaZerak content confirmed**.
  - `https://nazerak.ru/forum.html`: **HTTP 200 / NaZerak content confirmed**.
- TLS check still reports:
  `curl: (60) SSL certificate problem: self-signed certificate`.
- Therefore the deployment is healthy at the content/SFTP level, but the public certificate chain is **still not trusted by the GitHub runner**. This remains an infrastructure issue to resolve in REG.RU; it is not marked fixed.


## 2026-10-03 — forum visual system v30

### User-reported issues addressed
- Forum surfaces looked like rigid rectangular panels.
- Visual hierarchy and interaction motion felt basic and abrupt.
- Glassmorphism was missing.

### Changes
- Introduced translucent glass surfaces with blur/saturation, layered gradients, subtle inner highlights and restrained shadows.
- Increased corner radii across forum hero, categories, lists, member cards, topic posts, reply areas, modal and profile popover.
- Replaced abrupt hover feedback with eased transitions and gentle elevation, without hover-induced padding/layout shifts.
- Improved focus-visible outlines and included reduced-motion handling.
- Added mobile-specific radius and spacing adjustments.
- Bumped shared stylesheet references and QA expectation from v29 to v30.

### Design research
- Reviewed publicly indexed Majestic and Matreshka community knowledge/forum structures. Their information architecture emphasizes clear category discovery, separated functional sections and actionable topic/application paths. The NaZerak skin remains original rather than copying their branding or proprietary UI.

### Verification
- Static and browser QA are pending on the resulting HEAD.
- Screenshot-based visual acceptance has not yet been performed; do not treat this as final design approval.


## 2026-10-04 — forum runtime hardening and interaction polish

### Changes
- Added bounded 10-second waits to the forum index, category and topic data-loading requests so stalled backend reads surface an actionable error instead of leaving the screen indefinitely loading.
- Bounded auth-session lookup on those forum screens; if session lookup stalls, the public read-only forum remains accessible and the page falls back to the available auth state.
- Added the conventional `/` keyboard shortcut to focus and select the forum index search field. The shortcut ignores typing controls and editable content to avoid hijacking normal text input.
- Extended static QA guards for the keyboard shortcut and bounded forum data requests.

### Verification
- JavaScript source was re-fetched after the changes and the topic timeout wrapper was inspected for balanced Promise/timeout syntax.
- Full GitHub QA for the final commit is required before considering these changes release-ready. Production deployment is not claimed for this hardening pass.


## 2026-10-04 — forum reference layout and mobile resilience v32

### Changes
- Reworked the forum index composition into a desktop two-column layout: forum categories remain the primary column, with latest discussions and community resources in a supporting sidebar. The layout collapses to a single column below 1000px.
- Kept category content as unified forum rows with separators rather than independent row cards, and reduced sidebar density to better match the approved reference.
- Rebuilt mobile-specific sizing and wrapping rules for forum index, category, search, members, topic, profile and creation modal surfaces.
- Increased touch targets, used 16px input text to avoid mobile browser zoom, constrained grid children to prevent overflow, allowed long names and topic content to wrap, and made the topic composer/modal fit within dynamic viewport height.
- Added narrow-device refinements and disabled hover elevation on touch-only devices.
- Bumped stylesheet cache revision to v32 across published HTML pages and updated static QA expectations.

### Verification status
- The stylesheet, affected page references and QA version expectation were updated in `main`.
- Browser smoke includes a mobile horizontal-overflow assertion for forum pages; the v32 changes still require a completed GitHub QA run and visual review at narrow widths before release acceptance.
- No production deployment is claimed.


## 2026-10-04 — reference-led forum reconstruction plan and v33

### Audit findings
- The actual forum index lacked the approved reference's rules action and used “Последние темы” rather than “Последние обсуждения”.
- No dedicated scenic artwork exists in the forum markup yet; CSS atmosphere is only a fallback, not a substitute for generated NaZerak environment art.
- Forum content is rendered dynamically by `forum.js`; redesign must preserve data selectors and real Supabase content.
- Earlier visual passes accumulated appended overrides, creating a maintenance risk. Consolidation is required after visual verification.
- Index and internal routes share the `.forum` class, so desktop grid rules must be isolated from category/search/member/profile pages.

### Delivery plan
1. Audit markup, dynamic renderers, styles and browser checks against the accepted image.
2. Establish a coherent system for surfaces, typography, spacing, breakpoints and motion.
3. Reconstruct the index composition: hero, search, forum groups, latest discussions and resource sidebar.
4. Refine category rows, topic previews, counts, avatars, status labels and actions.
5. Align category, topic, search, member and profile pages.
6. Verify at 320, 360/390, 768 and desktop widths; remove overflow, clipping and tiny controls.
7. Preserve and test Supabase, Discord auth, permissions, topic creation, replies, profiles and failure states.
8. Run static/runtime/browser QA, inspect screenshots and iterate before release acceptance.

### Implemented in v33
- Adjusted the index toward the reference with a wider content area, atmospheric CSS hero fallback, legible search toolbar, unified glass forum groups, quieter monochrome icons and a calmer sidebar.
- Isolated the desktop two-column index layout from internal forum routes.
- Added the secondary “Правила форума” action and renamed the sidebar heading to “Последние обсуждения”.
- Bumped stylesheet references to v33 and aligned static QA checks.

### Verification / limitations
- The revision is committed to `main`, but visual acceptance is not complete.
- The scenic hero artwork still awaits generation/integration.
- Full QA and screenshot review are pending; no production deployment is claimed.


## 2026-10-04 — desktop forum canvas correction v34

- Follow-up audit found the shared `.container` capped the index at the global site width, so the 1360px forum canvas could not reach its intended desktop width.
- Scoped a wider container to `body[data-forum]` only, retaining narrower reading widths on internal forum routes. Added explicit grid-column spans for the hero, search toolbar and status message.
- Added a browser assertion at 1440px that the index uses a two-column CSS grid and has a canvas wider than 1100px. Existing 390px and 320px mobile checks remain.
- Updated the forum stylesheet cache reference and QA expectation to v34.
- v33 QA and its production deployment passed. v34 is a new follow-up revision; QA and deployment are pending until their workflows complete.


### v34 follow-up — mobile regression coverage
- Added narrow 320px browser smoke cases for a forum category and the members directory, alongside the existing 320px forum-index and 390px mobile scenarios.
- These checks validate resolved category/member content and rely on shared browser assertions for horizontal overflow, accessible controls, same-origin links and runtime diagnostics.
- The v34 desktop grid assertion and added narrow-screen cases require the current QA workflow to complete before acceptance.


## 2026-10-04 — forum block reconstruction v35

The previous forum blocks were judged visually raw, so the next layer was rebuilt at component level rather than adding another generic glass overlay.

### Implemented
- Rebuilt category-page header, breadcrumbs, topic-list shell and topic rows with a calmer hierarchy and fewer nested boxes.
- Rebuilt topic header, post layout, author column, reply composer and login state as a single coherent discussion system.
- Desktop posts use a real forum reading structure: author rail + message body, rather than stacked card fragments.
- Mobile posts collapse into author strip + content with full-width actions.
- Increased mobile touch targets and removed the desktop table header on narrow screens instead of shrinking it until it becomes unusable.
- Added 320/380/760px responsive rules for category and topic pages.
- Added overflow-safe media/content behavior for topic posts.
- Bumped stylesheet cache revision to v35 and aligned static QA.

### Acceptance rule
v35 is not considered visually finished until browser screenshots are checked at desktop and narrow mobile sizes. Generated scenic artwork for the hero remains a separate integration step.
