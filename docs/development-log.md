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
