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
| BRAND-01 | P2 | Confirmed | `cabinet-hud.css` gives `.brand__mark` a boxed border/background while other pages use a naked red “N”; brand mark may look inconsistent between cabinet and public pages. | To fix after visual regression check |
| CSP-01 | P1 | Likely | Multiple HTML pages repeat a meta CSP; policies are not fully consistent (404 has a narrower Discord image host allowlist). Inline-script/style behavior and all external requests must be audited before changing CSP. | Audit required |
| ROUTE-01 | P2 | Confirmed | Apache `.htaccess` implements clean URLs and legacy redirects; GitHub Pages does not execute Apache rewrite rules. Route parity between production hosting and Pages must be explicit. | Audit required |
| QA-01 | P2 | Confirmed | `scripts/qa-checks.mjs` contains a broad required-file list and browser smoke tests exist, but this session cannot run them locally. The production QA workflow is the execution evidence. | Use CI on each patch |
| UI-01 | P2 | Hypothesis | Multiple page-specific stylesheets (`styles.css`, `forum.css`, `forum-v2.css`, `cabinet-hud.css`, `home-hud.css`) can drift; shared tokens and route-level consistency need a full pass. | Inspect affected selectors and screenshots where available |
| AUTH-02 | P1 | Unverified | Real provider sign-in after the recent deployment was not confirmed end-to-end by a human session. Passing simulated OAuth smoke does not prove the Discord/Supabase dashboard configuration is correct. | Requires live test after config confirmation |

## Batches

### Batch 0 — Baseline and guardrails
- [x] Inspect repository identity and main commit.
- [x] Confirm latest QA, GitHub Pages build and production deploy runs succeeded for the same production commit.
- [x] Create feature branch from production baseline.
- [x] Establish audit ledger.
- [ ] Complete page/asset/route inventory.
- [ ] Make bounded fixes, review diffs, and run CI.

### Next actions
1. Inspect every page entry point and shared script/style contracts; compare canonical links and asset paths.
2. Verify the user-supplied homepage image is present in the repo and trace every reference before changing image layout.
3. Fix confirmed consistency/accessibility defects with minimal shared-token changes, then add regression assertions.
