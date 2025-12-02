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
- **Friction**:
  - Grass: 0.97 decay/frame.
  - Sand: 0.85 decay/frame (High drag).
- **Collision**:
  - Walls: Restitution 0.75 (Bounce).
  - Stop Threshold: Velocity < 0.05 sets state to `isMoving = false`.
- **Gravity Well**: Hole applies centripetal force when ball is close and slow (< 15 speed).

### Game Loop
- **Stroke Counter**: Tracks attempts vs PAR.
- **Progression**: Completing a hole loads the next level automatically after a delay.
- **End Game**: Summary screen displaying Total Strokes vs Total PAR.

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

## 5. Polish & Juice (Implemented)
- **Visuals**:
  - **Scanlines**: CSS overlay for LCD effect.
  - **Font**: "Press Start 2P" (Google Fonts).
  - **Particles**: Square debris on shots, wall hits, and hole-ins.
  - **Screen Shake**: Camera offset applied on wall impacts.
- **Audio**:
  - Oscillator-based chiptune SFX (Square/Sawtooth/Sine waves).

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
**Status**: Implemented (core) / Ready for Expansion  
**Core Events Added**:
- `UI_RIBBON_TAP` → { section: 'menu' | 'courses' | 'colors' | 'settings' | 'editor' }
- `UI_MODAL_OPEN` → { id: string, data?: any }
- `UI_MODAL_CLOSE` → { id: string }
- `UI_SHOW_MAIN_MENU` → (opens the main pause menu)
**Systems Touched**: Renderer, Input, new UIManager  
**Feature Flag**: `FEATURE_RIBBON_UI`
**Estimated Scope**: Medium
**Notes / Ideas**:
- All UI lives in DOM overlay (performant, accessible, easy to style with CSS pixels).
- Gameplay canvas is shrunk to 540×540 safe zone (30px padding on all sides).
- Ribbon uses 4-color GBR palette + dithered shadows.
- Modals are full-screen, slide up from bottom, swipe-down or [X] to close.
- Every modal is a self-contained .html snippet + .js controller → infinitely extendable.

+--------------------------------------------------+
|   [≡]  Retro Putt         ★ 3   PAR 3   ○ 2     |  ← Top ribbon (always visible, touchable)
+--------------------------------------------------+
|                                                  |
|                                                  |
|               [gameplay area 540×540]            |
|                                                  |
|                                                  |
+--------------------------------------------------+
|   <  Courses  |  Balls  |  Settings  |  Editor >|  ← Bottom ribbon (swipeable/carousel feel)
+--------------------------------------------------+

When you tap "Courses" → full-screen retro modal slides in from bottom with big X or swipe-down to close.