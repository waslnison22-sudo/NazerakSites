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
