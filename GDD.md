# Retro Putt: Green Pocket - Game Design Document (v2.0)

## 1. Project Overview
* **Concept**: Top-down, 2D golf physics puzzle game where "simulation physics" meets "Game Boy aesthetics."
* **Core Loop**: Putt -> Earn Currency/Stars -> Upgrade/Restock -> Unlock Courses.
* **Aesthetic**: Game Boy Retro (GBR) style.
* **Resolution**:
    * **Logical**: 600x600 (The World/Grid).
    * **Viewport**: 540x540 (The Camera Window).
* **Palette (Strict 4-Color)**:
    * `#0f380f` (Darkest: Walls, UI Text, Outlines)
    * `#306230` (Dark: Shadows, Sand, Particles)
    * `#8bac0f` (Light: Grass, UI Backgrounds)
    * `#9bbc0f` (Lightest: Ball, Highlights, Aim Line)

## 2. Core Mechanics: The "Feel"
### 2.1 Movement Physics (Simulation)
* **Linear Drag**: Friction is applied via **Subtractive Logic** (`speed - constant`), not multiplicative decay. This ensures the ball comes to a true "Zero" stop.
    * *Grass*: 0.03 drag/frame.
    * *Sand*: 0.15 drag/frame (Heavy penalty).
* **The "Sticky" Threshold**: To prevent infinite sliding on gentle slopes, the ball applies **Static Friction** logic:
    * IF `speed < 0.1` AND `external_force < 0.08` -> Ball Stops.
    * *Exception*: Gravity Wells (Holes) override this to allow slow drops.

### 2.2 Environmental Forces
* **Slopes**: Defined as vector fields. Visually represented by "Flowing Arrows" overlay.
    * *Tiers*: Gentle (0.05), Moderate (0.1), Steep (0.15).
* **Wind**: Defined as AABB zones.
    * **Scalar Rule**: Wind force is dampened by a `0.03` scalar to create a "drifting" breeze rather than a jet engine boost.
    * **Terminal Velocity**: Drag vs. Wind naturally creates a top speed cap.

### 2.3 Hole Interaction (Rim Physics)
The hole is not a binary trigger. It has three distinct zones based on distance and speed:
1.  **Capture Zone** (Center + Slow): Ball drops in. Success.
2.  **Rim Zone** (Edge + Fast):
    * *Visual*: Ball deflects sharply towards center (Orbital curve).
    * *Physics*: Velocity dampened by `0.9` (Impact energy loss).
    * *Audio*: "Tock" sound (Lip-out).
    * *Result*: Ball rattles and likely pops out unless angle is perfect.
3.  **Ignore Zone** (Far): No effect.

### 2.4 Aiming Systems
* **Basic Aim (Default)**:
    * A static, dashed line showing **Launch Power** only.
    * Ignores Wind, Slopes, and Drag.
* **Predictive Chip (Consumable Power-Up)**:
    * **Activation**: Toggle via 'P' key or UI. Charge consumed on `STROKE_TAKEN`.
    * **Simulation**: Runs a 180-frame "Dry Run" of the physics engine.
    * **Visuals**: "Breadcrumbs" (dots) that show the true curved path, plus a "Ghost Ball" at the resting coordinates.
    * **Animation**: "Retro Marquee" effect (dots flash in a traveling wave).

## 3. Architecture & Data
### 3.1 Event-Driven Core
Systems are decoupled via a global `EventBus`.
* `STROKE_TAKEN`: Input released -> Increment strokes, Inventory consumes 'Prediction Chip', Lock Input.
* `HOLE_LIP`: Collision detected -> Play "Rim Rattle", Emit Particles.
* `BALL_STOPPED`: Threshold met -> Unlock input, Camera re-centers.

### 3.2 PlayerState (The Bank)
A Singleton class managing persistent data (`localStorage: retro-putt-profile`).
* **Inventory**: Tracks consumables (e.g., `{ prediction: 5 }`).
* **Currency**: Coins collected during gameplay.
* **Progress**: Stars earned per level (Max 3 stars based on PAR).
* **Unlock State**: Which courses are available.

### 3.3 The Camera (Clamped Follow)
* **Dead Zone**: The 60px difference between Logical World (600) and Viewport (540).
* **Behavior**: Camera strictly follows the ball but clamps to `(0, 600)`, ensuring no "black void" is ever seen outside level bounds.

### 3.4 Level Serialization ("Share Codes")
* **Format**: Base64 encoded JSON with a version prefix (`RP1:`).
* **Compression**: Coordinates are divided by 60 (Grid Size) to save space.
* **Usage**: Used for Level Editor export/import and defining Campaign levels in `Levels.js`.

## 4. UI & Polish
* **Ribbon UI**: HTML overlays (`z-index: 20`) frame the canvas (Top: Stats, Bottom: Navigation).
* **Modals**: Slide-up HTML panels for Settings and Course Selection.
* **Audio**:
    * **Dynamic Mixing**: 5-channel bus (`sfx`, `ambience`, `music`, `ui`, `master`).
    * **Feedback**: UI elements "Blip" or "Click" on interaction.
* **Juice**:
    * **Particles**: Grass divots on stop, sparkles on hole-in.
    * **Screen Shake**: Subtlety applied on Wall Hits (Directional).

## 5. Content Roadmap
### 5.1 The Level Editor (Priority: High)
* **Goal**: Move away from code-based level definitions.
* **Features**:
    * Grid-Snapping (60px).
    * "Paint" terrain types (Wall, Sand, Water).
    * Place Entities (Hole, Start, Slopes, Wind).
    * **Serialization**: Export/Import via "Share Codes".

### 5.2 The "Pro Shop" (Priority: Medium)
* **Concept**: A new Modal tab.
* **Exchange**: Spend earned **Coins** or **Stars**.
* **Goods**:
    * Refill "Predictive Chips."
    * Unlock "Ball Skins" (e.g., 8-ball, Cube, Eyeball).

### 5.3 Campaign Structure
* **Target**: 18 Levels total.
* **Progression**:
    * **Course 1 (The Green)**: Levels 1-6 (Basics).
    * **Course 2 (The Dunes)**: Levels 7-12 (Sand & Wind focus).
    * **Course 3 (The Peak)**: Levels 13-18 (Slopes & Precision focus).