# NaZerak Forum HUD Reboot — Audit & Execution Plan

Status: preparation / isolated branch only. No production files have been uploaded to nazerak.ru.
Baseline: `main` HEAD `7367cd200ccdcd847ddfcc0c0481e5eb0180b20e` (2026-10-04).

## 1. Objective

Rebuild the forum interface as a coherent, readable, responsive community product. This is a structural redesign, not a color pass. Preserve existing routes, Supabase views, authentication, authorization, topic creation/reply flows, and data contracts unless an audit proves a change is necessary.

## 2. Current repository findings

- Forum is a static multi-page frontend backed by Supabase. Forum pages: `forum.html`, `forum-category.html`, `topic.html`, `forum-members.html`, `forum-search.html`, `forum-user.html`.
- Forum styling is now separated into `forum.css?v=12`, while shared navigation, site layout and common controls remain in `styles.css?v=37`.
- Dynamic rendering is in `forum.js`, `forum-category.js`, `topic.js`, `forum-members.js`, `forum-search.js`, `user.js`, and shared `forum-ui.js`. These files use data attributes and Supabase view/query contracts; visual work must not casually rename or remove these hooks.
- The current CSS still uses small text for core content and metadata (examples include 9–13px values for tags, row titles, metadata, table headings and labels). This conflicts with the stated readability goal and is a redesign issue, not merely a mobile issue.
- The forum index uses a two-column desktop grid with a 336px side column. The current page screenshot shows weak visual balance and low information value in the right rail; this layout must be evaluated against actual content density rather than retained automatically.
- Current `assets/images` tree contains `forum-hero.svg` and documentation only. The documented `forum-hero.jpg`, `hero-world.jpg`, `world-panel.jpg`, `partnership.jpg`, and `og-cover.png` are not present in the current tree. Do not reference these absent files or fabricate image paths. Check all available assets on the isolated branch again before wiring any visuals.
- The current GitHub commit history shows a rapid v11/v12 stylesheet and markup rebuild, but commit metadata attributes these commits to the repository owner. GitHub metadata alone does not establish which changes were authored by Grok, Copilot, or a person; audit by content and diff, not assumptions.
- The latest known QA run on commit `7367cd2` failed during static QA because `scripts/qa-checks.mjs` expected the obsolete literal phrase `single authoritative forum surface`, while the current stylesheet identifies itself as v12. Supabase and browser smoke steps were skipped as a result. The isolated branch corrects this obsolete check to assert actual component selectors. This correction still requires a fresh full QA run.
- Production deploy workflow is gated to successful QA on `main`. This reboot branch is isolated from `main`; no SFTP/production deployment is intended during preparation.

## 3. Design principles

- Use a precise, restrained dark interface with clear surfaces and rectangular geometry. Avoid ornamental glass blur, unnecessary gradients, excessive shadows, stacked cards and decorative panels.
- Strong typographic hierarchy: readable body text, prominent page titles, visible section titles, distinct metadata. Avoid shrinking information to preserve desktop density; hide or reorganize secondary data at narrow widths.
- Main content must have stable left/right alignment, consistent gutters, predictable vertical rhythm and deliberate maximum width.
- Buttons and other primary actions must be visually obvious, text-labelled and comfortably sized. Project target: primary actions and mobile interactive controls at least 44×44 CSS px; avoid adjacent micro-targets. WCAG 2.2 SC 2.5.8 defines a 24×24 CSS px minimum with exceptions, but this project adopts the more comfortable 44px design target for key actions.
- No content collisions: long Russian titles, usernames, role names, avatars, counters, links, errors and empty states must wrap, clamp only when an accessible full value remains, or move to another line.
- Responsive design is a layout change, not simply smaller desktop CSS. Validate 320, 360, 390, 768, 1024, 1280, 1440 and 1920 CSS-pixel widths.
- Respect keyboard focus, screen-reader labels, contrast and `prefers-reduced-motion`. Motion should communicate state only and never delay interaction.
- Keep the forum operational: preserve Supabase calls, role permissions, Discord auth, routes, posting rules, search, reply and profile interactions.

## 4. Reference review and what to borrow

- XenForo community showcase (2025): a simpler forum-first experience, category-level context and less click-heavy navigation. Borrow the clarity and conversational flow, not the exact visual theme: https://xenforo.com/community/threads/showcase-a-more-modern-user-experience.230362/
- Matreshka RP forum: a real RP forum organizes high-volume information by clear forum groups, shows latest activity and makes server/category destinations obvious. Borrow the scannable hierarchy and status labels, not its legacy visual density: https://forum.matrp.ru/index.php
- W3C WCAG 2.2 target-size guidance: interactive controls should be easy to activate; formal minimum is 24×24 CSS px subject to exceptions. NaZerak's key controls should target 44px for practical touch comfort: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- A modern community template reference (Discusli): useful for comparing categories, topics, user lists, profiles and compose states as one family of screens; avoid copying card-heavy patterns without regard to NaZerak content: https://www.behance.net/gallery/236082343/Discusli-Modern-Forum-Community-Template

## 5. Target information architecture

### Forum index
- Compact global header with logo, Forum, Members, Search and account navigation.
- Hero: title and one short description aligned to the left; primary actions anchored to the lower-left area. The hero should support the available artwork without burying text or creating an oversized empty block.
- Search and count as one aligned toolbar, not multiple detached widgets.
- Forum groups as the primary content, with clear group title and forum rows. Each row should prioritize forum name and short useful description; latest activity and counts are secondary and must not force tiny columns.
- Latest discussions should provide useful context (topic title, category/author, time/replies) and should not become a largely empty narrow rail. At desktop, choose a balanced two-column layout only if actual content fills both columns; otherwise use a single broad flow.
- Community shortcuts and stats should be consolidated into a small useful region or footer, not repeated as redundant cards.

### Category
- Breadcrumbs, title, meaningful short description and a clear create-topic action.
- Topic list rows with readable title, author/category context, reply count and last activity.
- On mobile, use a deliberate stacked row layout, with no shrunken table columns.

### Topic
- Title and category context, author and date.
- Readable posts with author identity and content, using a desktop author rail only where width allows.
- Reply composer, locked/archived states, login prompt and error/loading/empty states.
- Long posts, code, links and images must remain within the content area.

### Members, search and profile
- Consistent page header and spacing.
- Member cards must prioritize avatar, display name and role; less important statistics should wrap or be moved to a secondary line.
- Search results must be easy to scan and explain no-results separately from backend failure.
- Profile should prioritize identity and authored topics, avoid oversized empty profile panels.

### Dialogs and controls
- Topic-creation dialog must fit short mobile viewports, scroll internally where required, maintain visible close/cancel/publish actions and never cover controls with the keyboard.
- Focus management, disabled/loading state, validation, retry and error messages are part of the component design.

## 6. Execution phases

1. **Freeze and map baseline** — pin main SHA; inventory all files, images, routes, queries, role gates, HTML hooks, cache versions, workflows, branch/PR state and recent diffs.
2. **QA contract repair** — remove stale hard-coded visual assertions; replace them with semantic structure, asset and accessibility contracts. Run static QA before visual edits.
3. **Design specification** — define shared tokens, type scale, spacing scale, breakpoints, widths, surfaces, control heights, motion and component anatomy. Produce page-level wireframes or a static isolated preview before changing live markup.
4. **Index rebuild** — implement the index only on the reboot branch; keep JS hooks stable. Validate desktop and mobile screenshots before moving on.
5. **Internal page rebuild** — category, topic, search, members, profile, dialogs and user popover, one family at a time.
6. **Artwork integration** — review actual generated assets, dimensions, crop, contrast, file weight, alt/decoration semantics and CSP. Use only existing verified files.
7. **Functional regression** — verify Discord login, guest state, signed-in navigation, topic creation, role restrictions, replies, locked/archived behavior, search, profile links, timeouts and failures using mocked browser/runtime checks.
8. **Responsive/accessibility QA** — check all target widths, 200% zoom/reflow, keyboard-only operation, focus order, readable text, tap targets, contrast, reduced motion, no clipping/overlap/overflow.
9. **Visual regression and hardening** — capture screenshots for every route/state, compare with agreed reference, remove obsolete CSS and unused selectors only after verifying no runtime use.
10. **Release candidate** — fresh exact-commit QA, Pages build, PR review and explicit visual acceptance. Only after user approval and explicit deployment intent may the tested commit be merged to main and production release considered.

## 7. Acceptance gates

- No horizontal overflow at any supported width.
- No visible overlaps, clipped controls, collapsed text, stuck tooltips, or content behind fixed navigation.
- Primary/mobile actions have a 44×44px minimum target; ordinary body copy is at least 15–16px, secondary readable text generally at least 13–14px. Smaller eyebrow/metadata is permitted only when nonessential and still legible.
- No unlabelled controls or inputs; visible keyboard focus; no motion when reduced-motion is requested.
- All six forum routes load and their main landmarks are visible.
- Loading, empty, error, guest, signed-in, locked, archived, and submit-busy states are visually coherent.
- No Supabase schema or permission changes without a separately justified data/security audit.
- No production deployment during preparation. Release remains blocked until explicit approval.

## 8. Immediate next actions

- Confirm current main SHA and branch base again before implementation.
- Inspect complete v12 stylesheet, global style interactions, HTML and JS output templates, recent artwork commits, and latest QA logs.
- Review actual image files in every reachable relevant branch and current conversation/library attachments; the main tree alone currently has only the forum SVG.
- Repair the stale QA contract in this isolated branch, then arrange a PR-based QA run only if needed; production deploy workflow is scoped to main.
- Build a concise design token/spec sheet and a page-state matrix before writing new visual CSS.
- Do not treat the current screenshot or any one passing static check as proof of a finished HUD.
