# Agent Handoff: Retro Putt

## Current State
**Camera-Enabled Pixel Perfection**. The game now supports a **600x600 logical world** viewed through a **540x540 viewport** via a clamped camera system. This resolves previous visibility issues where content > 540px was inaccessible.

## Critical Architecture (DO NOT BREAK)
### 1. Rendering (Camera & Viewport)
-   **Viewport**: Fixed at 540x540, offset by (30, 60).
-   **Camera**: Tracks the ball, clamped to world bounds (0-600).
-   **Translation**: `Renderer.startScene()` applies `translate(VIEWPORT_X - cameraX, VIEWPORT_Y - cameraY)`. **Always maintain this order.**
-   **CSS**: `#game-container` uses `box-sizing: border-box` to ensure the 4px border doesn't cause overflow/cutoff.

### 2. Input System (World-Aware)
-   **Mapping**: Input coordinates must now account for **both** the viewport offset (-30, -60) **AND** the camera offset (+cameraX, +cameraY).
-   **Logic**: `Input.js` maps screen clicks -> logical world coordinates.

## Troubleshooting & Lessons Learned
-   **The "Invisible Level" Trap**: The previous agent set up a 600x600 world in a 540x540 viewport *without* a camera, making the bottom 60px (where Level 6 starts) invisible. **Lesson**: Always verify that logical bounds fit within the visible viewport, or implement scrolling immediately.
-   **CSS Box Model**: The game container was being cut off by 4px because `box-sizing: border-box` was missing. **Lesson**: When using `min(100vw...)`, always account for borders/padding.
-   **Input Sync**: When adding a camera, you **MUST** update the Input system. If you scroll the world but not the input, clicks will drift.

## Next Steps
-   **Level Design**: You now have the full 600x600 space (and potentially more if you expand `LOGICAL_WIDTH/HEIGHT`).
-   **Polish**: The camera snaps instantly. Consider adding **smooth lerping** (e.g., `camX += (targetX - camX) * 0.1`) for a better feel.
-   **Debug**: The Level Select is currently enabled in `index.html`. Hide it for production.
