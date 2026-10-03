# NaZerak — Stability Roadmap

## Release gates

### Gate 1 — Foundation
- [x] Static production application on REG.RU hosting
- [x] Supabase browser integration with publishable key only
- [x] Discord OAuth / PKCE
- [x] Relative internal routes
- [x] Strict CSP without inline style attributes
- [x] No secret/service_role credentials in frontend

### Gate 2 — Forum
- [x] Forum index
- [x] Hierarchical forum node tree with six natural top-level sections
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
- [x] Local production-server publication check for browser smoke
- [x] Desktop forum smoke
- [x] Mobile forum smoke
- [x] Section/members/search/profile browser smoke coverage
- [ ] Final browser-smoke pass on the latest revision

### Gate 5 — Production domain
- [x] Production origin is `https://nazerak.ru`
- [x] Application routes remain relative
- [x] Browser smoke base URL configurable
- [x] Production hosting and SFTP deployment documented
- [x] Supabase production URL documented
- [x] Hosting and SFTP deployment configured
- [x] Production canonical/OG/robots/sitemap normalized
- [ ] Run full fresh-session authentication and forum smoke on `https://nazerak.ru`

## CI deployment separation

Browser QA runs against a local HTTP server built from the exact checked-out commit. A successful QA run triggers the production SFTP deployment.

## Design rule

The forum uses a single natural hierarchy: information and rules, state and organizations, game world, support, development and community. Government structures are forum subsections, not separate homepage navigation.

## Stability rule

Do not add new features before the current release gate is green. Every UI or database change must be followed by static checks, Supabase runtime checks, browser smoke, and a second security review when permissions or user data are touched.
