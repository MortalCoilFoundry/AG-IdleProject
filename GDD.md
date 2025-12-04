# Retro Putt: Green Pocket - Game Design Document

## 1. Project Overview
**Concept**: Top-down, 2D golf physics puzzle game.
**Aesthetic**: Game Boy Retro (GBR) style.
**Resolution**: 600x600 (Canvas).
**Palette**:
- Darkest: `#0f380f` (Walls/UI/Text)
- Dark: `#306230` (Shadows/Hazards/Particles)
- Light: `#8bac0f` (Grass/Background)
- Lightest: `#9bbc0f` (Ball/Highlight)

## 2. Core Mechanics

## 3. Architecture (Event-Driven)
The game uses a global `EventBus` to manage state transitions:
- `STROKE_TAKEN`: Input released -> Increment strokes, lock input, play sound, emit particles.
- `BALL_STOPPED`: Velocity threshold met -> Unlock input, enable aim line.
- `WALL_HIT`: Collision detected -> Play sound, emit particles, shake screen.
- `SAND_ENTER`: Hazard overlap -> Emit particles.
- `HOLE_REACHED`: Gravity well success -> Play sound, emit particles, trigger `LEVEL_COMPLETE`.

## 4. Levels
1.  **The Green**: Open field. Teaches input. PAR 2.
2.  **The Bank**: Central obstacle. Teaches wall bouncing. PAR 3.
3.  **The Trap**: Large sand hazard. Teaches friction management. PAR 3.

# Retro Putt: Green Pocket - Game Design Document

## 1. Project Overview
**Concept**: Top-down, 2D golf physics puzzle game.
**Aesthetic**: Game Boy Retro (GBR) style.
**Resolution**: 600x600 (Canvas).
**Palette**:
- Darkest: `#0f380f` (Walls/UI/Text)
- Dark: `#306230` (Shadows/Hazards/Particles)
- Light: `#8bac0f` (Grass/Background)
- Lightest: `#9bbc0f` (Ball/Highlight)

## 2. Core Mechanics
### Physics
- **Input**: Slingshot (Drag & Release). Power clamped to max length.
- **Predictive Aim**:
  - **Simulation**: "Dry run" of physics engine (180 frames) accounting for Drag, Wind, and Slopes.
  - **Visuals**: "Breadcrumb" trail (dots) showing path + "Ghost Ball" showing final resting position.
### Test Chamber (Sandbox)
A dedicated debugging level (`TestChamber.js`) accessible via the Course Select menu.
- **Purpose**: Rapid prototyping of mechanics (Wind, Slopes, Hazards) without altering campaign levels.
- **Features**: Infinite loop (reloads itself on completion), contains entity types for testing.

## 5. Polish & Juice (Implemented)
- **Visuals**:
  - **Scanlines**: CSS overlay for LCD effect.
  - **Font**: "Press Start 2P" (Google Fonts).
  - **Particles**: Square debris on shots, wall hits, and hole-ins.
  - **Screen Shake**: Camera offset applied on wall impacts.
  - **Sand Texture**: Procedural noise (speckles) added to hazards for grit.
  - **Ball Stop**: "Puff" of dark green particles (`#306230`) emitted when the ball settles.
- **Audio Architecture**:
  - **Buses**: 5-channel mixing board (`master`, `music`, `ambience`, `ui`, `sfx`) via Web Audio API `GainNodes`.
  - **Routing**:
    - `sfx`: Tones, hits, wall bounces.
    - `ambience`: Procedural wind, pink noise floor.
    - `ui`: Blips, clicks.
  - **Persistence**: Volume settings saved to `localStorage` (`retro-putt-settings`).
  - **Feedback**: Interactive audio previews when adjusting volume (blips, chords, noise bursts).

## 6. User Interface & Display
### Pixel-Perfect Letterboxing
- **Logical Resolution**: 600x600 buffer.
- **Viewport**: 540x540 visible gameplay area, centered within the logical world (Offset: 30, 60).
- **Rendering**:
  - `Renderer.js` clips drawing to the viewport and translates the origin.
  - CSS enforces `image-rendering: pixelated` for crisp 1:1 pixels.
- **Layout**:
  - Responsive container (`#game-container`) sized to `min(100vw, 100vh - 120px)`.
  - Fixed top/bottom ribbons (60px height) cover the "dead zones" of the logical world.

### Camera System
- **Concept**: Clamped Follow.
- **Problem**: The logical world is 600x600, but the visible viewport is only 540x540.
- **Solution**: A camera tracks the ball to keep it centered within the viewport, allowing the player to explore the full level.
- **Constraints**:
  - **Clamping**: The camera is clamped to the world bounds (0-600) so the player never sees "outside" the level.
  - **Pixel-Perfect**: No scaling is used. The view is a 1:1 window into the larger world.
- **Implementation**:
  - `Renderer.js`: Applies a translation `(-cameraX, -cameraY)` before drawing the world.
  - `Game.js`: Updates `cameraX/Y` every frame based on ball position.
  - `Input.js`: Adds `cameraX/Y` to mouse coordinates to map screen clicks to the scrolling world.

### Input System
- **Global Handling**: Listeners attached to `window` to capture input across the entire screen, including ribbons.
- **Coordinate Mapping**:
  - Input coordinates are scaled from display size to logical size (600x600).
  - **Offset Correction**: Coordinates are shifted by (-30, -60) to align with the rendered viewport.
- **Robustness**:
  - Clamped to logical bounds (0-600).
  - Ignores clicks on UI buttons.
  - `touch-action: none` prevents scrolling on mobile.

#### Feature: Mobile-First Retro Ribbon UI + Modal System
**Status**: Implemented (Core + Settings Module)
**Architecture**:
- **DOM Overlay**: All UI exists in HTML/CSS above the canvas (`z-index: 20+`).
- **Ribbons**: Fixed top/bottom bars (60px) framing the 540x540 viewport.
- **Modal System**:
  - **Container**: `#modal-container` slides up from bottom (CSS transition).
  - **Overlay**: `#modal-overlay` provides dimming and click-to-dismiss.
  - **Dynamic Content**: `SettingsModal.js` injects HTML into the container on demand.

**Implemented Modules**:
1.  **Settings Modal**:
    - **Retro Meter**: Custom volume control using 10 `<div>` blocks instead of sliders.
    - **Interaction**: `<` and `>` buttons with immediate visual/audio feedback.
    - **Visuals**: Pixel-perfect styling, "lit" vs "unlit" blocks using GBR palette.

**UI Layout**:
```text
+--------------------------------------------------+
|   [≡]  Retro Putt         ★ 3   PAR 3   ○ 2     |  ← Top Ribbon
+--------------------------------------------------+
|                                                  |
|               [gameplay area 540×540]            |
|                                                  |
+--------------------------------------------------+
|   <  Courses  |  Balls  |  Settings  |  Editor >|  ← Bottom Ribbon
+--------------------------------------------------+
```
**Interaction Flow**:
- Tap "Settings" -> Modal slides up.
- Tap `<` on SFX -> SFX volume lowers, blocks update, "Blip" plays.
- Tap "Back" or Overlay -> Modal slides down.