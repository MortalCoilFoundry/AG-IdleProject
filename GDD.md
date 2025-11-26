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
