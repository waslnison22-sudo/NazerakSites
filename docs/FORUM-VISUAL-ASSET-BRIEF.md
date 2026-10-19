# NaZerak Forum — visual asset generation brief

Status: preparation only. Do not publish image assets until they are generated, reviewed, optimized and integrated through the release branch.

## Art direction
- Original premium Russian Minecraft community / role-play project; inspired by the information architecture of XenForo communities, not a copy of any one site.
- Main UI palette: near-black #08090C, charcoal #0E1116 / #13171E, subtle neutral borders #292E38, near-white text #F4F5F7, restrained red #FF5367.
- The imagery should add atmosphere and place, not compete with topic titles, post content or controls.
- Avoid: neon cyberpunk, RGB glow, dashboard/SaaS look, giant text baked into images, watermarks, fake UI, random lettering, logos copied from other servers, noisy particle effects, excessive red haze, blurry upscales.

## Image 1 — Forum masthead / community atmosphere
Purpose: quiet, wide visual for a forum landing/header area; not a full-page background.
Prompt:
“Premium cinematic Minecraft-inspired landscape for a serious Russian role-play community called NaZerak, wide panoramic 16:5 composition, distant block-built mountain ridges and dense spruce forest, a small believable settlement barely visible in the distance, late dusk with subtle warm horizon light, dark charcoal shadows and natural muted colors, sophisticated realistic shader rendering, high-detail voxel geometry, clean composition with generous dark negative space on the left for interface text, no people close-up, no typography, no letters, no logos, no watermark, no UI, restrained contrast, professional game environment key art.”
Negative constraints: no ocean dominating the frame, no oversaturated sunset, no fog hiding the entire landscape, no text, no watermark, no fake UI.

## Image 2 — Community / world card
Purpose: small supporting image for a forum category or community card; crop-safe at 4:3.
Prompt:
“Cinematic Minecraft role-play world environment, compact central-European inspired block-built town square with stone buildings, spruce trees, understated lamps, believable scale and materials, cloudy late-afternoon light, dark graphite and desaturated natural palette with tiny warm lights, premium shader quality, clean readable silhouettes, 4:3 composition, no text, no logos, no watermark, no UI.”
Negative constraints: no fantasy castles, no anime, no neon, no giant characters, no interface overlays.

## Image 3 — Government / organizations card
Purpose: card illustration for role-play institutions and organizations; crop-safe at 4:3.
Prompt:
“Minecraft-inspired civic government building in a grounded modern European town, stone and dark timber architecture, broad steps and a modest square, spruce trees and natural overcast daylight, cinematic but believable role-play server environment, premium high-detail block geometry, muted charcoal, stone gray and restrained warm window light, 4:3 composition, no flags with readable symbols, no text, no logos, no watermark, no UI.”
Negative constraints: no real-world national insignia, no propaganda imagery, no neon, no fantasy throne room, no text.

## Image 4 — Gameplay / world card
Purpose: card illustration for the gameplay-world category; crop-safe at 4:3.
Prompt:
“Beautiful Minecraft survival role-play environment, forest road leading between detailed spruce forest and a small block-built settlement, late autumn ground cover and damp stone path, realistic shader lighting, natural muted green, brown and graphite colors, subtle cinematic depth, premium game screenshot quality without looking like a UI screenshot, 4:3 composition, no text, no logo, no watermark, no HUD.”
Negative constraints: no inventory, no crosshair, no HUD, no unreadable signs, no oversaturated colors.

## Image 5 — Community / members card
Purpose: supporting card image, not a user-avatar sheet.
Prompt:
“Atmospheric Minecraft multiplayer community gathering in a small town square, a few distant blocky player silhouettes seen from behind, environment remains the main subject, natural clothes and believable scale, subdued warm window lighting against dark spruce and stone architecture, premium cinematic game rendering, no recognizable real people, no text, no logos, no watermark, 4:3 composition.”
Negative constraints: no close-up faces, no crowded chaotic scene, no text, no UI, no weapons in foreground.

## Technical delivery requirements
- Generate each image separately; never combine assets into a collage or contact sheet.
- Keep an original full-resolution master and export optimized WebP derivatives for the site.
- Wide masthead target: 2400×750 or larger at the same aspect ratio; card images target: 1200×900 or larger.
- Check crop safety at desktop, tablet and mobile sizes. Do not place essential subjects near edges.
- Compress images, verify dimensions and file size, inspect at 100%, and ensure no text artifacts/watermarks.
- Use descriptive filenames under `assets/images/forum/`: `forum-masthead.webp`, `community-world.webp`, `government-organization.webp`, `game-world.webp`, `community-members.webp`.
- Do not replace the main homepage's existing autumn hero image. Forum images are separate assets and must not change the homepage hero.
- Only integrate imagery where it supports navigation or atmosphere; avoid putting large photos behind post text and long topic lists.

## Review gate before integration
1. Verify visual coherence across the set without forcing every image to be identical.
2. Reject obvious generated artifacts, malformed block geometry, fake lettering, watermarks, or overprocessed edges.
3. Review all target crops (16:5, 4:3, mobile narrow crop).
4. Optimize to WebP and test actual page loading.
5. Add visual regression screenshots at 1440px and 390px widths.
