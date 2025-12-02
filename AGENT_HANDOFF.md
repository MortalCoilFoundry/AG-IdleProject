# Agent Handoff: Retro Putt

## Current State
**Pixel-Perfect & Responsive**. The game now features a robust 540x540 letterboxed viewport within a 600x600 logical world, centered perfectly on all devices with accurate input.

## Critical Architecture (DO NOT BREAK)
### 1. Rendering (Letterboxing)
- **Logical Buffer**: 600x600 (`Renderer.LOGICAL_WIDTH`).
- **Viewport**: 540x540 (`Renderer.VIEWPORT_W`), offset by (30, 60).
- **Clipping**: `Renderer.startScene()` clips to the viewport and translates the origin. **Always use this.**
- **CSS**: `#game-container` is the "Safe Green Zone" sized to `min(100vw, 100vh - 120px)`. `#game-canvas` is scaled (111.11%) and offset inside it.

### 2. Input System (The "Holy Grail" Fix)
- **Global Listeners**: `Input.js` listens on `window` (not canvas) to capture clicks on ribbons/margins.
- **Coordinate Mapping**:
  1.  Scale: `canvas.width / rect.width` (Display -> Logical).
  2.  **Offset**: Subtract `(30, 60)` to match the rendered viewport. **CRITICAL**.
- **Robustness**: Clamped to 0-600. Ignores UI buttons.

## Pitfalls & Lessons Learned
-   **Input Re-instantiation**: **NEVER** put `new Input()` in the game loop. It resets drag state every frame. Initialize once in `init()`.
-   **Viewport Offset**: If input feels "off" or "misses" the ball, check if the (30, 60) offset is being subtracted. The visual ball is drawn at `(x+30, y+60)`, so input must account for this.
-   **CSS Fragility**: `replace_file_content` often fails on `style.css` due to formatting. **Overwrite the file** if extensive changes are needed.
-   **Dead Zones**: Canvas event listeners miss clicks on the "ribbons" (which visually border the game). Use `window` listeners to fix this.

## Next Steps
-   **Gameplay**: Add new levels (currently only 4).
-   **Polish**: Add "hole-in" animations or transition effects.
-   **Audio**: Tune wind noise (currently basic sine wave).
