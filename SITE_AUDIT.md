# NaZerak — Site Audit & Rebuild Ledger

- **Repository:** `waslnison22-sudo/NazerakSites`
- **Production baseline inspected:** `e43ca5fb23a4a237096b06ee227ef5dbc6cbf509` (`main`)
- **Working branch:** `site-rebuild-audit-20261021`
- **Date:** 2026-10-21
- **Execution limits:** GitHub repository reads/writes and GitHub Actions evidence are available. This session does not expose a local checkout or terminal, so local build commands cannot be run directly. CI results count only for the exact commit and workflow. Supabase Dashboard URL configuration has not been independently read or changed.
- **User goal:** Rebuild and improve the existing NaZerak site into a beautiful, reliable, coherent, responsive, accessible site while preserving the supplied artwork, existing routes, forum, account and integrations.

## Acceptance criteria

1. All public routes load, internal links resolve, and the official domain is canonical.
2. Registration/login/logout and OAuth return remain on `nazerak.ru`; external provider configuration is separately verified.
3. Homepage uses the user-provided artwork, with intentional crop/overlay and readable text at desktop and mobile sizes.
4. Forum index, categories, topic, search, members, profile and reports have coherent shared navigation, typography, spacing and empty/loading/error states.
5. Cabinet states (guest, loading, signed in, error) are understandable and keyboard-accessible.
6. No broken asset references, missing scripts/styles, duplicate IDs, invalid external URL handling, horizontal overflow, or obvious console errors in tested routes.
7. Accessibility basics: landmarks, one primary heading per page, visible keyboard focus, labelled controls, contrast, reduced-motion support and useful image alternatives.
8. Security boundaries: no secrets in browser files, safe URL handling, restrictive CSP aligned with real dependencies, RLS/authorization not inferred from frontend hiding.
9. SEO/canonical/robots/sitemap metadata matches the actual public routes.
10. Changes are committed to a feature branch, diff reviewed, relevant CI passes, and production deployment only occurs after explicit user release request and checks.

## Findings ledger

| ID | Severity | Confidence | Evidence / impact | Status |
|---|---|---|---|---|
| AUTH-01 | P1 | Confirmed in prior incident; external cause unverified | User was returned to `waslnison22-sudo.github.io/NazerakSites/?code=...`. Code now pins the OAuth redirect to the official domain and safely avoids copying a PKCE code across origins. Supabase Site URL / Redirect URLs are documented but not verified in the live dashboard. | Mitigation shipped; live provider config blocked |
| VIS-01 | P2 | Confirmed | Homepage stylesheet currently references `assets/images/nazerak-autumn-hero.webp`; user-provided replacement art must remain the source of truth and must be checked as a real repo asset before release. | Verify asset bytes and rendering in browser |
| BRAND-01 | P2 | Confirmed | `cabinet-hud.css` gave `.brand__mark` a boxed border/background while other pages use a naked red “N”. | Fixed in branch; cabinet browser smoke passed on `dc2d8a8ffa728aa81ba7a23a927fc3e844ea4c2d` |
| CSP-01 | P1 | Likely | Multiple HTML pages repeat a meta CSP; policies are not fully consistent (404 has a narrower Discord image host allowlist). Inline-script/style behavior and all external requests must be audited before changing CSP. | Audit required |
| ROUTE-01 | P2 | Confirmed | Apache `.htaccess` implements clean URLs and legacy redirects; GitHub Pages does not execute Apache rewrite rules. Route parity between production hosting and Pages must be explicit. | Audit required |
| QA-01 | P2 | Confirmed | `scripts/qa-checks.mjs` and browser/route smoke workflows exist; local shell is unavailable in this session. | Latest branch CI passed: run `39613576791`, job `119269896021`, commit `dc2d8a8ffa728aa81ba7a23a927fc3e844ea4c2d` |
| UI-01 | P2 | Hypothesis | Multiple page-specific stylesheets (`styles.css`, `forum.css`, `forum-v2.css`, `cabinet-hud.css`, `home-hud.css`) can drift; shared tokens and route-level consistency need a full pass. | Inspect affected selectors and screenshots where available |
| AUTH-02 | P1 | Unverified | Real provider sign-in after the recent deployment was not confirmed end-to-end by a human session. Passing simulated OAuth smoke does not prove the Discord/Supabase dashboard configuration is correct. | Requires live test after config confirmation |

## Batches

### Batch 0 — Baseline and guardrails
- [x] Inspect repository identity and main commit.
- [x] Confirm latest QA, GitHub Pages build and production deploy runs succeeded for the same production commit.
- [x] Create feature branch from production baseline.
- [x] Establish audit ledger.
- [x] Initial page/asset/route inventory: static HTML + shared JS/CSS, Apache clean-route rules, Supabase Auth, forum, cabinet, and production/Pages workflows.
- [x] Fix cabinet brand-mark mismatch and add a computed-style regression assertion.
- [ ] Complete route/asset/security review and remaining bounded fixes.
- [x] Run branch CI and record outcomes for the current batch.
- [ ] Review the complete PR diff before promoting it out of draft.

### Batch 1 — Visual consistency
- Changed `cabinet-hud.css` so the header/footer N mark is no longer boxed and matches the red unboxed mark used across the site.
- Changed `scripts/cabinet-hud-smoke.mjs` to assert the computed border and background, preventing the inconsistency from returning.
- Commits: `76a7d896f118be7e0afaa820c89c92508f6aa659`, `04d58f76c73dd61bd073cb90d01a0ac63eef6c92`.
- Verification: `NaZerak QA PASSED`; `NaZerak runtime smoke PASSED`; browser smoke passed homepage desktop/mobile, forum routes and responsive widths, search, category, members, profile, 404, OAuth start and safe legacy callback, avatar fallback, and anonymous cabinet desktop/mobile/tablet. Additional forum shell, homepage HUD, cabinet HUD, forum concept, screen gallery, and homepage concept smoke tests all passed. CI run: `39613576791`, job `119269896021`, commit `dc2d8a8ffa728aa81ba7a23a927fc3e844ea4c2d`. First run failed because the runner could not resolve the Playwright download host; retry succeeded. These are automated smoke tests, not a live end-to-end Discord signup or an accessibility certification.

### Next actions
1. Complete route-by-route CSP and canonical/redirect audit, preserving provider requirements and clean routes.
2. Confirm the user-supplied homepage artwork is present as a tracked asset and verify its live crop; do not generate or invent replacement artwork.
3. Verify real Discord signup/login after confirming Supabase Site URL and Redirect URLs; mocked browser smoke does not prove live provider configuration.
4. Inspect full PR diff and decide whether additional bounded fixes are warranted before removing draft status.
