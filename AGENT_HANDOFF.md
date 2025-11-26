# Agent Handoff: Retro Putt

## Project Status
Functional prototype complete with 3 levels, physics, audio, and visual polish.
**Tech Stack**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS.
**Run Command**: `python -m http.server 8000` (Required due to CORS/Modules).

## System Architecture
Entry point: `src/main.js` -> Instantiates `src/core/Game.js`.

### Core Components
- **Game.js**: Main loop (`requestAnimationFrame`). Manages `Physics`, `Renderer`, `Input`, `LevelManager`.
- **EventBus.js**: Pub/Sub system. **CRITICAL**: All game logic interactions (scoring, audio triggers) happen here. Do not couple systems directly if possible.
- **Physics.js**: Handles movement, collision resolution (AABB for walls/hazards, Circle for hole), and friction.
- **Renderer.js**: Canvas 2D context wrapper. Handles drawing and **Screen Shake** (via `ctx.translate`).
- **Input.js**: Mouse/Touch listeners. Calculates drag vector.

## Implementation Details & "Gotchas"
### 1. File Integrity & Tooling
- **Issue**: `replace_file_content` caused file truncation and duplication in `Game.js` and `Renderer.js` during development.
- **Advice**: When making significant changes to core files, verify the file content immediately after. If the file looks malformed (e.g., missing methods, duplicate classes), use `write_to_file` to overwrite it completely with the correct content.

### 2. HTML Structure
- **Issue**: `index.html` was accidentally corrupted, removing the `<canvas>` element, causing `getContext` null errors.
- **Advice**: Always ensure `#game-container` and `#game-canvas` exist. The UI layer sits *above* the canvas.

### 3. Audio Context
- **Detail**: Audio uses `AudioContext` with simple Oscillators.
- **Constraint**: Browsers require user interaction to resume `AudioContext`. The first click/drag usually handles this, but be aware of "AudioContext was not allowed to start" warnings.

### 4. Physics Tuning
- **Friction**: `0.97` (Grass) vs `0.85` (Sand). These values are tuned for the 600x600 canvas and current force multipliers. Changing canvas size requires re-tuning.
- **Hole Gravity**: The "suck" effect only triggers if speed < 15. If the ball moves too fast, it skips the hole (intended mechanic).

## Future Roadmap
- **Mobile Optimization**: Touch controls are implemented but could be refined (prevent scroll).
- **Level Editor**: JSON-based level structure in `LevelManager.js` is ready for externalization.
- **Persistence**: Save high scores to `localStorage`.
