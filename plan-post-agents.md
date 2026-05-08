# plan‑post‑agents.md

## Assumptions
- MVP targets **two players** only (WASD + Q, Arrow + Ctrl).
- Phaser is loaded via CDN; no local `node_modules` on GitHub Pages.
- Power‑up activation is immediate; UI for selection is deferred.
- Only the **Chaser** enemy type will be implemented after the core loop works.
- Fixed 13 × 13 tile map, 32 px tiles, grid‑snapped movement.

## Success Criteria
1. Deployable static site (no console errors).
2. Two‑player movement, grid‑snapped, cannot cross walls.
3. Bomb placement (`Q` / `Ctrl`) with 2 s timer, explosion destroys soft walls.
4. Each player starts with 3 lives; a hit reduces life and respawns with 1 s invulnerability.
5. HUD displays lives for both players.
6. Simple wave pause after all enemies cleared (currently none).
7. No runtime errors throughout a full play‑through.

*All criteria must be met before any “feature‑complete” tag is added.*

## Minimal Implementation Steps
| Step | Description | Files |
|------|-------------|-------|
| S1 | Verify CDN script in `index.html`. | `index.html` |
| S2 | Remove ES‑module import of Phaser. | `src/main.js` |
| S3 | Keep only WASD + Q (P1) and Arrow + Ctrl (P2) bindings. | `src/main.js` |
| S4 | Comment out enemy‑spawn code; keep placeholder for Chaser. | `src/main.js` |
| S5 | Ensure bomb explosion stops at soft walls and removes the wall sprite. | `src/main.js` |
| S6 | Simplify HUD to show only player lives. | `src/main.js` |
| S7 | Confirm GitHub Pages source points to `master` (or `gh‑pages`). | N/A |
| S8 | (Optional) Add minimal `README.md` with live URL and controls. | New file |

## Risks & Mitigations
- **Missing CDN** → test locally and on GitHub Pages.
- **Key conflicts** → keep strict mapping, no extra power‑up keys for MVP.
- **Out‑of‑bounds explosion** → bounds checks already present.
- **Power‑up visual gaps** → postpone spawning; focus on wall destruction.
- **Caching** → ensure a fresh commit and wait a minute after push.

## Immediate Next Actions
1. Run `npm run dev`; verify two‑player controls, bomb logic, HUD.
2. Open the live site; inspect console for errors.
3. Get user confirmation on two‑player‑only scope and Chaser‑only enemy plan.
4. Once confirmed, add the first Chaser wave (still a surgical change) and a brief “next wave” timer.

---

*Prepared using the AGENTS guidelines: think before coding, keep it simple, modify only what is required, and define clear success criteria.*
