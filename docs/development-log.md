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


## 2026-10-04 — Forum visual cleanup and micro-error pass (v36)

### Completed
- Removed the visible forum readiness/status pill from the forum header. Runtime loading/error handling remains in JavaScript; the status control is now non-visual.
- Reworked the forum hero composition: forum title and description stay anchored to the left, while the action buttons are moved directly beneath them into the lower-left area of the header.
- Removed the empty-state copy that described the forum as ready; an empty forum now communicates the state through the heading only.
- Removed per-category publication-access policy text from forum category pages. Permission logic remains enforced in JavaScript/Supabase and is not being weakened.
- Removed the visual posting-mode label from forum index rows. The posting mode remains part of the data/permission flow.
- Removed the empty-category ready-state copy.
- Preserved mobile stacking and touch sizing.

### Audit scope
- Repository: `waslnison22-sudo/NazerakSites`
- Branch: `main`
- Base commit: `8e15381df442e5d7d777a396d85bcda3502cb55b`
- Checked forum index/category markup, dynamic renderers, shared forum CSS and existing browser smoke coverage.
- No authorization/RLS logic was changed; only explanatory UI was removed.

### Release gates
- Desktop header alignment.
- 650/390/320px responsive layout and overflow.
- Forum/category runtime rendering.
- Existing QA/browser smoke must pass on the resulting commit before production acceptance.

## 2026-10-04 — Forum incident audit and recovery

### Incident
The forum regression was traced to the commit series immediately after `a6de9d51dc74342f23a2e4ffdd88ee83996f48c4`. That series introduced a parallel `forum-styles.css` / `animations.css` styling layer and rewrote several forum scripts. The latest commit `97ccb220be2bf4bed0e47c89b72963523332a83c` also replaced the stable topic/profile/search logic with incompatible simplified code.

### Confirmed failures
- `topic.js` queried `forum_topics` for fields that belong to public forum views, so topic loading could fail at the database layer.
- `topic.js` stopped loading/rendering `forum_posts`, so replies were lost from the topic page.
- `user.js` switched from `joined_at` to a non-existent `created_at` field and lost the bounded request guards / stable role rendering.
- `forum-search.js` lost URL-query initialization and submit handling and only searched titles.
- `forum-user.html` gained inline styles that violate the site's CSP/QA contract.
- `forum-styles.css` was loaded after `styles.css` and overrode the reference-led forum layout, creating a conflicting cascade.
- Latest QA run `37158780904` failed before browser smoke with forum-related errors; latest production deploy for that commit was skipped.

### Recovery
Restored all forum surface HTML and the affected forum scripts to the last known good baseline `a6de9d51dc74342f23a2e4ffdd88ee83996f48c4`. Removed the conflicting `forum-styles.css` and `animations.css` files. Synchronized global stylesheet cache references to `v36` and fixed a stray closing tag in `forum.html`.

### Verification
A GitHub compare from `a6de9d51…` to the recovery head `fb9225862a4750028e29f9ec791af85a2ff88713` reports only four files changed: `index.html`, `cabinet.html`, `404.html`, and `forum.html`. The forum HTML/JS/CSS implementation is otherwise back on the prior baseline. A fresh QA run is queued for the recovery head.


## 2026-10-04 — forum second audit: architecture and production runtime integrity

### What was wrong
- The forum's shared stylesheet had accumulated multiple appended generations of forum selectors, causing later layers to override earlier layout decisions unpredictably.
- Forum category rows and their CSS data contract diverged; the renderer used different class names than the table stylesheet expected.
- A category row contained nested links, producing invalid interaction/HTML structure.
- The frontend refreshed forum-author activity, but production column grants did not allow browser INSERT/UPDATE on the required author fields.
- Reply activity did not update `forum_topics.last_post_at` automatically, so latest-activity ordering could become stale.

### Implemented
- Removed the forum-specific cascade from the global `styles.css` and introduced one authoritative `forum.css?v=1` shared by all forum routes.
- Rebuilt the forum index composition around a single `.forum-index-grid`: categories as the primary area, latest discussions and community resources as the secondary column; mobile collapses to one column.
- Corrected the forum hero to keep title/description on the left and actions directly below them on the lower-left.
- Aligned category topic rows with one explicit markup/CSS contract and removed nested links.
- Added browser smoke assertions for desktop composition, hero alignment, category row structure and nested-link integrity.
- Added repo migration `20261004000000_forum_runtime_integrity.sql` and synchronized `supabase/schema.sql`.
- Applied the runtime integrity migration directly to production project `ujlbyzvdsncvqbrhasuw`: forum-author INSERT/UPDATE grants, automatic `last_post_at` trigger, and activity backfill.
- Restored `last_seen_at` updates in forum author synchronization.

### Production verification
- Production Supabase project is ACTIVE_HEALTHY on PostgreSQL 17.
- Current forum content counts: 33 category nodes, 27 forums, 0 topics, 0 posts, 1 author. The zero-content state is expected because starter topics are not seeded automatically.
- Verified the new author column grants and `forum_topic_last_post_touch` trigger exist in production.

### Release state
- Static QA and Supabase runtime smoke reached success during the current cleanup sequence; browser smoke remains the final acceptance gate for the newest head.
- REG.RU production deploy remains gated by `DEPLOY_ENABLED`; no REG.RU deployment is claimed without a successful production deployment run.


## 2026-10-04 — regression audit after external model edits

### Repository state reviewed
- Re-read the current repository tree and recent commits after additional changes from other coding assistants.
- Confirmed the image directory contains only its README; no forum-hero.jpg, hero-world.jpg, or world-panel.jpg assets are committed.
- Reviewed the shared runtime script, forum rendering modules, browser smoke diagnostics, static QA and the latest GitHub Actions result.

### Regression found
- The newest script.js change attempted to probe optional artwork by constructing new Image() and requesting three not-yet-committed JPG files.
- The browser smoke test treats unexpected console 404s as failures. As a result, static QA and Supabase runtime smoke passed, but homepage browser smoke failed on a local missing-file 404. Pages build succeeded, while production deploy was skipped by the QA gate.
- This was an actual regression introduced by the optional-artwork probe, not evidence of a Supabase or JavaScript syntax failure.

### Correction
- Removed speculative image requests from the shared script. Optional art remains a documented asset slot and should only be activated after the actual files are added and verified.
- Bumped the shared script.js cache revision from v17 to v18 on the main site, cabinet and forum routes so clients do not retain the old script.
- Kept the stricter browser diagnostic in place; do not weaken the test to ignore missing local resources.

### Verification status
- Static QA and runtime smoke were green on the failing commit; browser smoke exposed the missing-asset regression.
- A fresh QA and deployment run is required for the corrective commit chain. Do not mark production updated until the current QA and production deploy runs are confirmed successful.


## 2026-10-04 — forum publishing failure recovery

### Defects found
- Forum index topic creation could leave the publish button permanently disabled when author synchronization failed or the insert request threw.
- Category topic creation had the same failure path; it also assumed a successful insert always returned a topic ID.
- Topic replies could leave the reply button disabled when author synchronization failed, and an exception during insert or refresh could bypass restoration of the button label/state.

### Corrections
- Wrapped topic creation and reply submission in try/catch/finally so submit controls are restored on every return/error path.
- Replaced direct backend error text in these submit paths with user-readable retry guidance; technical errors remain in console diagnostics.
- Validate that a topic insert returns a usable ID before navigating to the topic.
- Extended static QA to guard that all three forum submit flows restore their button state in finally.

### Verification
- Static and browser QA are running against the corrective commit chain. Production status remains unconfirmed until the matching QA and deploy result is successful.


## 2026-10-04 — verified recovery release

- The first retry-control QA assertion exposed a stale static expectation: QA still required script.js?v=17 after page references had moved to v18. The test failed before runtime/browser checks; the assertion was corrected to v18.
- Exact corrected commit: 62c551d1486f2b51ae1145b94f1e8c0e974f294b.
- QA run 37181252277 completed successfully. Static release checks, Supabase runtime smoke, and browser smoke all passed, including homepage desktop/mobile, forum index/category/member/search/profile routes, 320px narrow layouts, 404, OAuth start, and cabinet anonymous/profile-timeout cases.
- Production deployment run 37181293844 completed successfully for that exact tested commit. This confirms the GitHub Actions SFTP workflow completed; it does not independently prove that every visitor's browser cache has refreshed.


## 2026-10-04 — forum typography readability pass v2

### Audit finding
- The authoritative forum stylesheet contained 99 font-size declarations; 45 were between 7px and 9px. That made secondary labels, metadata, roles, tags and helper text too small for comfortable reading, especially on mobile.

### Implemented
- Raised the forum's smallest text sizes: 7–8px to 10px, 9px to 11px, 10px to 12px, 11px to 12px, 12px to 13px, and 13px to 14px. Display headings and mobile viewport-specific headline clamps were left intact.
- Bumped the forum stylesheet cache to v2 on all six forum routes and updated the static QA contract.
- Kept wrapping and responsive grid rules in place so longer labels can wrap rather than force horizontal overflow.

### Verification status
- This typography change requires a fresh browser QA run at desktop and narrow mobile widths before it is accepted. It is not yet declared visually final; screenshots remain a needed human visual acceptance step.


## 2026-10-04 — full forum audit and targeted cleanup

### Current repository audit
- Reviewed the current HEAD and latest changes from external coding assistants instead of assuming the previous v35 snapshot was still authoritative.
- Confirmed the current forum already uses a dedicated `forum.css`; older global forum overrides should not be reintroduced.
- Found forum index markup with malformed section/container closing order around the resources block. This could cause browser DOM repair and inconsistent grid placement.
- Found that category descriptions were still rendered from backend metadata and subforum rows exposed their descriptive text. These are unnecessary in the publishing flow and risk repeating publication-access explanations.
- Confirmed posting restrictions are enforced in frontend selection/visibility logic and remain intact; presentation cleanup does not grant new permissions.
- Confirmed the old “Форум готов” text/status is absent from visible hero markup in the current HTML; retained only an assistive status node, hidden from visual display.

### Changes in this pass
- Corrected the forum index section nesting so the three grid sections close in the proper order.
- Simplified the empty-topic markup and removed the obsolete blank/misaligned closure.
- Removed category description output from the category header and removed descriptions from each subforum row and parent group heading; the structure stays scannable without permission-policy paragraphs.
- Kept `posting_mode`, permission lookup and publish authorization checks unchanged.
- Anchored forum hero actions to the lower-left beneath the title/description on desktop; made action wrapping intentional on narrow mobile screens.
- Added static QA assertions for hidden status and removed category policy copy.
- Added browser smoke coverage for hero action placement and no visible status badge.
- Updated forum stylesheet references to v3 and documented the audit.

### Verification discipline
- This commit is not treated as released until the exact-head QA browser suite and the REG.RU production deploy workflow report success.


### Follow-up regression correction
- The first QA pass correctly caught that stylesheet v3 was expected in tests before all six forum route HTML files had been cache-busted. Aligned forum index, category, topic, members, search and profile pages to the same v3 stylesheet revision.
- Removed remaining backend description output from parent section headings and removed the category selector's visible “official” access label; posting authorization logic remains unchanged.
- Latest QA is rerunning against the corrected source head; earlier failed runs are treated as stale and not as final verification.


## 2026-10-04 — concurrent-edit reconciliation and dead artifact cleanup

### Regressions from concurrent edits
- An additional script.js redesign-helper commit reintroduced automatic probes for artwork files that are not present in the repository. Removed the probes again from the current source and bumped script.js references to v20 across the homepage, cabinet and all forum routes; QA now expects v20.
- The forum category description was removed from markup as requested, but forum-category.js still dereferenced the deleted element. Removed that stale DOM write and bumped forum-category.js to v3 on the category route and in QA.
- The hero placement test relied on getComputedStyle(marginTop) equalling the literal string auto. Replaced it with rendered geometry checks for left alignment and bottom spacing, which tests the visible result rather than a browser-specific computed-value representation.

### Repository cleanup
- Removed REDESIGN_STATUS.txt because it claimed the live site still served an old build while describing an absent ZIP artifact; it was not a user-facing page or a valid release source.
- Removed assets/ui/patterns.css after checking that no public HTML or source reference consumed its classes or stylesheet. No active page depended on it.

### Verification
- These corrections are committed, but the exact latest head must complete static QA, Supabase runtime smoke and browser smoke before it is accepted. A successful production deployment is required before describing the latest forum typography/layout as live.


### Final release verification — 2026-10-04
- Latest verified source head before this log-only update: c7a6adfb16cb92ad93963ba3a71fb7314da9a7ec.
- NaZerak QA run 37182217474 completed with success, including the browser smoke suite.
- REG.RU production deployment run 37182281410 completed with success. SFTP upload, obsolete-route cleanup, production content checks for / and /forum.html, and TLS certificate verification all succeeded.
- The corrected script and forum stylesheet versions are included in this release. Visual sign-off remains limited to automated geometry/responsive assertions; a human screenshot review is still recommended for subjective polish.


## 2026-10-04 — current-head audit and forum status/access-copy cleanup

### Baseline reconciled
- Audited the current default-branch HTML, dedicated forum stylesheet, index/category scripts, static QA and browser smoke checks rather than assuming the earlier v35 source was still authoritative.
- Current architecture uses shared `styles.css?v=36` plus the forum-specific `forum.css?v=3`; the older v35 visual layer is not the current source of truth.
- Confirmed hero alignment and lower-left action placement were already implemented in forum stylesheet v3 and have browser geometry assertions. Preserved that work rather than re-appending conflicting hero CSS.
- Confirmed the visible forum-ready badge had already been hidden, but hidden markup and JavaScript still retained the obsolete “ФОРУМ ГОТОВ” state.
- Confirmed category access descriptions were already removed from visible category markup and forum rows; removed the remaining unused category description field from the category lookup.

### Corrections applied
- Removed the hidden `data-forum-state` node from `forum.html`.
- Removed the unused state mutation helper and loading/ready/error state writes from `forum.js`. User-facing connection and data failures remain surfaced through the existing accessible message region.
- Removed modal copy describing who publishes official sections; retained concise instructions to select a section and write the first post. Authorization and database policy logic are unchanged.
- Removed the unused `description` field from the category directory select in `forum-category.js`; category resolution and permission checks are unchanged.
- Bumped `forum.js` to v5 and `forum-category.js` to v4 in their route HTML.
- Updated static QA to reject any remaining forum state node / “ФОРУМ ГОТОВ” lifecycle, category policy description hooks, and obsolete publication-access copy; aligned expected script cache revisions.

### Release and visual verification
- Previous verified baseline: QA run 37182352478 succeeded and production deploy 37182394296 succeeded for the recorded release.
- These corrections are newer than that baseline and are not considered released until QA and production deployment complete on their exact resulting HEAD.
- Browser smoke already checks hero left alignment, lower-left button geometry, no visible status and loaded forum sections. The updated source must pass the full suite.
- Live page could not be inspected through the available web page reader during this pass. Automated browser assertions are not a substitute for screenshot-based subjective review.
- No Supabase schema, RLS policy, or posting permission logic was changed.


### Verified release addendum — 2026-10-04
- Exact resulting HEAD: `f98ddab186b19ab143de03acdae8536c30858e31`.
- QA run `37182675457`: **success**. Static release checks and Supabase runtime smoke passed; browser smoke passed for homepage desktop/mobile, forum index desktop/mobile/narrow mobile, official/category/narrow category, members/narrow members, search, user profile, 404, OAuth start, and cabinet desktop/mobile/tablet plus profile-timeout isolation.
- Production deploy run `37182735551`: **success**. SFTP upload, obsolete route cleanup, production HTTP content checks for `/` and `/forum.html`, and runner TLS verification step all completed successfully.
- TLS verification step emitted a warning that the certificate is not trusted by the runner; the deploy workflow is configured to continue after this independent TLS check. Do not describe the public certificate chain as trusted based on this run.
- These corrections are now included in the successfully deployed tested commit. Screenshot-based visual sign-off is still outstanding.


## 2026-10-04 — NaZerak full frontend micro-error audit / v37

### Scope
Audited the current main branch after the large external-assistant edit series, including:
- all published HTML routes;
- shared styles.css and authoritative forum.css;
- forum index/category/topic/members/search/profile renderers;
- global navigation/auth loading;
- browser smoke and static QA contracts;
- repository asset tree and the separate project image library.

### Confirmed current architecture
- Forum styling is isolated in forum.css; the obsolete parallel forum-styles.css / animations.css layers are absent from main.
- Production deploy and QA for the previous verified cleanup release completed successfully on commit 72d5de6c7f.
- Current forum database snapshot remains intentionally empty of starter topics/posts; forum structure is present and permission logic is retained.

### Bugs found and fixed
1. forum.js error handling still called an undefined setState() helper when forum loading failed. This could mask the original backend error with a ReferenceError. Replaced the broken call with the existing visible error surface.
2. Forum/category/topic timeout wrappers did not clear their timeout handles after successful completion. Added cleanup to prevent stale timers.
3. Category pages with multiple "Создать тему" controls only bound the first control. All category create controls are now bound.
4. An empty category still kept the empty thread-table shell visible behind the empty state. The table now hides when there are no topics.
5. Removed redundant publication-access copy from the forum index modal, category modal and topic reply area. Authorization/permission enforcement is unchanged.
6. Profile role rendering now tolerates both structured role objects and string role slugs instead of silently degrading string roles to the default player role.
7. Empty action-footer spans no longer reserve visual space after the explanatory copy was removed.

### Regression guards strengthened
Static QA now rejects:
- reintroduction of the "Форум готов" status/copy;
- redundant publication-access explanations on forum surfaces;
- an undefined setState() reference in forum.js.

### Visual/asset audit
The separate conversation/library image collection contains NaZerak visual material, including a red city/megapolis hero and a red-black brand pack. The current Git repository, however, contains no committed raster artwork in assets/images/; only the asset README is present. Therefore no image is falsely reported as deployed. The forum remains ready for binary asset integration once the selected artwork is actually placed in the repository.

### Release gate
v37 requires a fresh QA + Pages + REG.RU production deploy cycle. Production is not considered updated merely because the repository commit exists.


## 2026-10-04 — full current-head reconciliation after concurrent edits

### What changed in the repository since the previous audit
The default branch received a dense sequence of forum fixes from the parallel editing pass. I treated the current `main` tree as authoritative and re-read the affected HTML/CSS/JS plus the QA/browser contracts before changing anything. The recent series included forum runtime hardening, removal of obsolete publication/status copy, hover-profile safety work, mobile navigation sizing, forum hero placement, and repeated cache refreshes.

### User-requested forum corrections verified
- The visible «Форум готов» status/pill is gone from the current forum markup.
- The obsolete forum status lifecycle is rejected by static QA.
- Category publication-policy text/hooks are gone from category markup and renderer logic.
- Topic reply no longer carries the «Ответы доступны авторизованным…» explanatory copy; access is still enforced by authentication and database policy.
- Forum hero title/description are left-aligned.
- Hero actions are anchored to the lower-left of the hero on desktop; browser smoke checks the rendered geometry instead of relying on CSS implementation details.
- The mobile hero keeps usable touch targets and switches to a full-width action layout at narrow widths.

### Additional issues found during this pass
1. Static QA expected an older `forum-ui.js?v=1` cache on three routes while those routes had already moved to v2. This caused the current QA run to fail before runtime/browser checks.
2. `styles.css` had continued to receive real changes after the previous cache revision. All HTML routes were aligned to v37.
3. The global `script.js` also changed after its v20 cache. Routes were aligned to v22.
4. Forum-specific CSS had changed after v4, so all forum routes were aligned to the new v6 cache.
5. The documented image-slot system and the actual repository were inconsistent: the homepage already exposed media slots, while `assets/images/` contained only the README and no binary art. The README was corrected so it describes the actual behavior instead of implying files are already present.
6. The media slots had no automatic activation path. A safe loader was added: it silently tests the known local artwork names and inserts an image only after a successful load. Missing artwork therefore leaves the existing CSS composition intact without producing broken-image UI.
7. The forum hero now has its own optional artwork slot. When `assets/images/forum-hero.jpg` is later committed, it will appear automatically and the text remains readable through the dedicated dark overlay.
8. The forum index was still constrained by the child `.forum` width even after the outer canvas was widened. The forum index/category canvas was expanded to 1360px on desktop while preserving narrow mobile gutters.

### Image inventory result
Current GitHub `main` contains `assets/images/README.md` but no committed JPG/JPEG/PNG/WebP files. I therefore did not fake an image integration or claim that the new artwork is live. The code is prepared for the documented files, and the homepage/forum will use them automatically once they exist in the repository.

### Verification state
- The previous stale QA failure caused by cache expectations was corrected; a fresh release run is required for the resulting head.
- Pages and production deployment are intentionally not treated as successful until the exact resulting head passes QA and the production gate.
- No Supabase schema/RLS/posting-permission logic was changed in this pass.


## 2026-10-04 — forum micro-error pass / QA regression

### Corrected
- Removed the remaining Discord access-explanation sentence from the topic login surface. Authentication/permission enforcement remains functional; only redundant explanatory UI was removed.
- Made the forum hero actions an explicit desktop lower-left anchor instead of relying on flex auto-margin.
- Kept title and description left-aligned with reserved bottom space so the controls cannot overlap the copy.
- The media loader no longer probes guessed raster filenames that are absent from the repository. It accepts only explicit `data-image-src` values, eliminating the forum 404 detected by browser smoke.
- Bumped only the forum index stylesheet reference to v7 because the new hero-placement rule is consumed by that page; other forum pages continue using the stable v6 stylesheet.
- The image library was re-checked. The selected red NaZeRaK megapolis art is available in the project Library, while the GitHub repository still contains no binary raster assets in `assets/images/`. No nonexistent production image was claimed as deployed.

### QA finding and resolution
Browser smoke run `37185499919` had already passed static QA and Supabase runtime smoke but failed on one forum resource 404. The current change removes that request at the source rather than weakening the browser test.

### Release gate
A new exact-head QA run must pass static QA, Supabase runtime smoke and browser smoke before production deployment is accepted.


## 2026-10-04 — browser-smoke geometry correction

The first explicit lower-left hero anchor passed the left-edge requirement but rendered with a 101px bottom gap in browser smoke. The cause was the absolute-positioning variant interacting with the existing forum surface sizing rules. It was replaced with a box-sized flex layout that reserves the bottom padding and uses `margin-top:auto` for deterministic lower-left placement. The browser assertion remains unchanged so the visual contract is tested rather than weakened.

## 2026-10-04 — forum reference correction / current-head pass

### Visual issue confirmed
A supplied browser screenshot showed the public GitHub Pages forum still displaying the older composition: excessive top whitespace, no artwork in the hero, weak section hierarchy, and the hero controls not visually matching the intended layout. The repository was therefore treated as the source of truth, but the failed exact-head QA explains why the screenshot can still represent the previously deployed build.

### Current changes
- Connected the forum hero media slot to a real repository-local SVG artwork asset so the hero no longer depends on a missing raster file.
- Reduced the forum index excessive top padding beneath the fixed navigation.
- Tightened hero height, typography, search spacing and desktop two-column proportions toward the supplied reference.
- Kept the title and description left aligned and the two hero actions in the lower-left action row.
- Added a dark red city atmosphere as a lightweight local SVG asset; it is self-hosted and requires no external CDN.
- Preserved dynamic Supabase forum data, topic creation, permissions and profile links.

### QA finding
The exact prior head 9201bb2 had static QA and Supabase smoke passing but browser smoke failing because the lower-left hero geometry still had a 45px bottom gap. The new v9 hero layout is intended to resolve that exact regression without weakening the browser assertion.

### Asset audit
The project Library contains the supplied NaZerak megapolis artwork and a red-black brand pack. The megapolis image is retained as the preferred visual reference; the committed hero uses a lightweight SVG so production does not depend on a Library-only binary that is not present in GitHub.

### Release gate
The current head is not considered live until exact-head QA, Pages build/deployment and REG.RU production deployment complete successfully.


## 2026-10-04 — full forum audit / v11 visual reconstruction

### Current-state audit after external edits
- Re-read the current main tree and the latest forum commit sequence instead of relying on the earlier v35 snapshot.
- Confirmed the repository is now using one authoritative forum.css, but its cache versions were inconsistent: index used v10 while internal forum routes still used v6. This could leave different pages on different visual generations in real browsers.
- Confirmed the previous publication-access helper text and forum-ready status are no longer present in the current forum markup/renderers.
- Confirmed the forum hero has an explicit artwork slot. The only image currently committed in assets/images is forum-hero.svg; the larger binary visuals documented in assets/images/README.md are not committed to the Git tree at this time.
- Confirmed latest QA/deploy head before this pass was 4276118c1451: QA passed and the REG.RU production deploy completed successfully.

### v11 implementation
- Reconstructed the forum index composition again at the surface level rather than adding another generic card treatment.
- Made the hero a large image-aware composition with the title/description anchored left and actions fixed to the lower-left on desktop.
- Reduced the card-stack appearance of forum directory groups: rows are now separator-driven surfaces with a restrained red hover rail.
- Gave the forum directory more horizontal space on desktop and a clearer primary/sidebar proportion.
- Simplified the search area so it reads as a tool row instead of another large panel.
- Simplified latest discussions and community resources into lighter directory lists.
- Kept narrow mobile layouts as stacked, full-width controls rather than compressed desktop columns.
- Bumped all forum route forum.css references to v11.

### Functional micro-fix
- Fixed forum profile hover-card positioning. The previous JavaScript positionCard() function was intentionally empty while the card used fixed top-right placement, so the profile preview did not follow the hovered author. The card now clamps to the viewport and prefers to open below the trigger, falling above when necessary.
- Bumped forum-ui.js to v3 on all forum routes.

### QA hardening
- Static QA now checks that the obsolete forum-ready status does not return.
- Static QA checks the category page for reintroduced publication-access helper text.
- Static QA checks that the forum hero artwork slot remains wired.
- Static QA expectation now matches forum.css v11 and forum-ui v3.

### Artwork note
The repository documentation names forum-hero.jpg, hero-world.jpg, world-panel.jpg, partnership.jpg and og-cover.png as intended visual assets. They are not currently present as binary files in the Git tree. The forum implementation therefore does not request guessed missing files and remains free of intentional 404s. The committed forum-hero.svg is used as the current safe fallback/hero artwork.


### v11 QA correction
- The first v11 browser run reached the forum page successfully but failed its new hero geometry assertion because the assertion compared the button group to the outer hero border while the design intentionally aligns buttons with the padded title/description column.
- The implementation itself kept the requested lower-left alignment; the test was corrected to compare the action group's left edge with the hero content column and still enforce the bottom anchoring.


## 2026-10-04 — full forum audit and v12 reconstruction

### Current-state audit
The current main branch was re-read after the latest external-assistant changes. The important finding was not a missing polish rule but a conflicting visual history: forum.css had accumulated multiple forum generations (v3–v11) inside one file. The latest rules were overriding earlier rules, while the screenshot still looked like the previous visual system.

The forum content/rendering contract remains dynamic and must stay intact:
- forum_node_directory for the section tree;
- forum_topic_list for topic data;
- forum_community_stats for counters;
- forum_my_permissions for publishing permissions.

No RLS/permission logic was weakened.

### User-requested cleanup
- The visible forum readiness/status pill is not part of the current forum header.
- The category publication-policy container was still present in forum-category.html even though it was hidden. It was removed completely so the obsolete publication-access UI cannot reappear.
- The forum hero keeps the title/description on the left and the action buttons at the lower-left.
- The old empty-state “forum ready” copy remains removed.
- No publication-access explanation is rendered by the current forum.js / forum-category.js row renderers.

### Visual reconstruction v12
forum.css was rewritten rather than extended. The new file is a single authoritative forum stylesheet with:
- image-backed hero;
- left-aligned content and lower-left actions;
- clear primary/secondary column hierarchy;
- flatter directory rows instead of stacked cards;
- stronger section separators and restrained hover indicators;
- coherent category, search, members, topic and profile surfaces;
- full mobile restructuring rather than desktop shrinkage;
- 16px mobile inputs and minimum touch targets;
- overflow-safe topic content;
- reduced-motion support.

The committed forum artwork is assets/images/forum-hero.svg. The current GitHub tree contains one forum artwork asset; no additional JPG/PNG/WebP forum artwork is currently committed on main.

### QA corrections
- Forum CSS cache references were bumped to forum.css?v=12.
- Static QA was aligned with v12.
- Browser smoke was corrected to validate the new hero artwork layer instead of the old data-image-slot contract.
- The smoke suite continues to enforce the absence of the visible forum status UI, correct hero geometry, desktop two-column composition, narrow mobile overflow safety and removal of obsolete publication-policy UI.

### Release gate
The current v12 changes are not considered released until the fresh NaZerak QA, Pages build and production deployment for the resulting head are observed.

## 2026-10-04 — forum HUD reboot preparation (isolated branch)

### Scope and production safety
- Created isolated preparation branch: `forum-hud-reboot-prep-20261004`, based on main commit `7367cd200ccdcd847ddfcc0c0481e5eb0180b20e`.
- No changes were uploaded to `nazerak.ru`; no production deployment was triggered by this work.
- Main branch remains the baseline. Design and QA preparation is isolated from the public site.

### Current-state audit
- Re-checked all six forum routes, current forum stylesheet separation, dynamic rendering scripts, workflow deployment gates, and recent v11/v12 changes.
- The current forum system uses `forum.css?v=12` with shared global styles at `styles.css?v=37`; runtime content is rendered by page-specific scripts and shared `forum-ui.js`.
- The stylesheet still includes small values for primary reading context (9–13px on tags, metadata, table headings, topic titles and row labels). The new design must establish a readable type scale and must not compress core text to preserve desktop columns.
- The screenshot supplied in this conversation confirms visible imbalance: the hero text/actions do not form a strong compact composition, the forum index is too dense, and the latest-activity rail is visually weak when empty.
- Main currently contains only `assets/images/forum-hero.svg` plus documentation in `assets/images`. Other names in the asset guide are not present in the current tree and must not be referenced until exact files are found.
- GitHub commit metadata lists the latest v11/v12 changes under the repository owner. This does not reliably identify whether individual changes were produced by Grok, Copilot, or direct editing; review diffs and behavior rather than assuming authorship.
- Latest inspected QA run `37194440970` failed during static QA on the obsolete string assertion `single authoritative forum surface`; subsequent Supabase and browser smoke steps were skipped.

### QA correction prepared
- Replaced the obsolete literal stylesheet-name assertion with a component contract checking the forum hero, index grid, board row and topic post selectors.
- This QA correction is on the isolated branch and has not yet been executed in a fresh full workflow. It is not recorded as passed.

### Reference review
- Reviewed the XenForo community showcase for category context, streamlined navigation and conversational flow.
- Reviewed the Matreshka RP forum for real-world roleplay forum grouping, status labels and latest-activity information architecture.
- Reviewed W3C WCAG 2.2 target-size guidance; the project target for primary and mobile controls is set to 44×44 CSS px, exceeding the formal 24×24 minimum where practical.
- Reviewed a modern forum/community template as a cross-page reference for category, thread, member, profile and compose screens. These are structural references, not designs to copy literally.

### Reboot rule
The next visual implementation must be built component-by-component on this branch, preserve all existing data hooks and permissions, and pass screenshot-based review at desktop and mobile sizes before advancing. No main merge or production deploy without explicit approval and exact-commit QA.


### Design specification prepared
- Added `docs/forum-hud-design-spec.md` on the isolated reboot branch.
- Defined proposed type scale, spacing, surface treatment, content widths, target dimensions, per-route composition, responsive behavior, artwork rules and stop conditions.
- Set project design targets of 16px body copy, 14px secondary copy, 12px only for nonessential dense metadata, and 44×44px for important interactive targets.
- Documented the distinction between formal WCAG 2.2 target-size minimum and the more comfortable project target.
- The spec is a preparation artifact; it is not proof that the visual implementation is complete or tested.
- Production site remains unchanged.


### v13 isolated readability correction
- The draft PR browser smoke completed desktop index, forum mobile, narrow forum, official category and standard category checks, then failed at the 320px category form input: computed font size was 12px while the test expected 16px.
- Raised the forum stylesheet's compact font-size values to a 12px floor, with core text values increased to 14–16px. This is a first readability correction, not a claim that the entire visual system is complete.
- Set forum-scoped shared button labels to 14px and minimum height to 48px; forum navigation rows target 44px; icon clear/close controls target 44px.
- Set composer labels to 14px, input/select/textarea text to 16px, help text to 12px and modal description to 14px.
- Bumped forum stylesheet references from v12 to v13 across all six forum routes and aligned static QA expectations.
- These edits are only on the isolated reboot branch. They have not been deployed to nazerak.ru.
- Required next check: rerun PR QA, inspect the first failing assertion if any, then extend the browser regression matrix to assert readable text and control dimensions across every forum route. Screenshot review remains mandatory before declaring visual acceptance.
