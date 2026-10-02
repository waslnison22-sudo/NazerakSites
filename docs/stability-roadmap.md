# NaZerak — Stability Roadmap

## Release gates

### Gate 1 — Foundation
- [x] Static GitHub Pages application
- [x] Supabase browser integration with publishable key only
- [x] Discord OAuth / PKCE
- [x] Relative internal routes
- [x] Strict CSP without inline style attributes
- [x] No secret/service_role credentials in frontend

### Gate 2 — Forum
- [x] Forum index
- [x] Two top-level worlds: RP and Administration
- [x] Forum section page
- [x] Topic page
- [x] Members directory
- [x] Dedicated search page
- [x] Public hover profile card
- [x] Public full profile
- [x] Role colors and badges
- [x] Manual content model; no seeded project-authored discussions

### Gate 3 — Authorization and security
- [x] Discord account identity binding
- [x] Administrator binding by Discord provider ID
- [x] Server-side forum permissions
- [x] Private protected Discord-role binding table
- [x] Public/private column separation
- [x] Security-invoker public views
- [x] Locked/archived topic reply guard enforced by RLS
- [x] Public forum UUID boundary checks

### Gate 4 — Runtime QA
- [x] Static release checks
- [x] Supabase runtime smoke
- [x] GitHub Pages publication check
- [x] Desktop forum smoke
- [x] Mobile forum smoke
- [x] Section/members/search/profile browser smoke coverage
- [ ] Final browser-smoke pass on the latest revision

### Gate 5 — Production domain
- [x] Planned origin stored as `https://nazerak.ru`
- [x] Application routes remain relative
- [x] Browser smoke base URL configurable
- [x] Migration instructions documented
- [ ] Add new Supabase Site URL and Redirect URL
- [ ] Configure hosting and HTTPS
- [ ] Switch DNS
- [ ] Update canonical/OG/robots/sitemap
- [ ] Run full fresh-session authentication and forum smoke on `https://nazerak.ru`

## Design rule

The forum follows the information architecture of established RP/XenForo-style forums: forum index, section lists, topics, profiles, members, search and community resources. The visual system remains NaZerak-specific.

## Stability rule

Do not add new features before the current release gate is green. Every UI or database change must be followed by static checks, Supabase runtime checks, browser smoke, and a second security review when permissions or user data are touched.
