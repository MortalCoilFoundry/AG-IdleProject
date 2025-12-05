# Retro Putt: Green Pocket - Game Design Document (v3.1)

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

### 2.3 Hole Interaction (Rim Physics)
The hole is not a binary trigger. It has three distinct zones:
1.  **Capture Zone** (Center + Slow): Ball drops in. Success.
2.  **Rim Zone** (Edge + Fast):
    * *Physics*: Velocity dampened by `0.9`, deflected towards center.
    * *Result*: Ball rattles and pops out unless angle/speed are perfect.
3.  **Ignore Zone** (Far): No effect.

## 3. Architecture & Input Logic (CRITICAL)
**Constraint:** This project uses a strict **State Machine** to arbitrate between Gameplay and Editing.

### 3.1 The State Machine (Arbiter)
Managed by `src/core/Game.js`.
* **Modes**: Mutually exclusive `PLAY` and `EDIT`.
* **Initialization**: Game starts in `LOADING` mode. `init()` must explicitly call `setMode('PLAY')` to trigger the transition.
* **Behavior**:
    * **Switching to PLAY**: Calls `editorSystem.disable()` (removes DOM overlays) -> Calls `input.enable()`.
    * **Switching to EDIT**: Calls `input.disable()` -> Calls `editorSystem.enable()` (activates DOM overlays).

### 3.2 Input Stratification (The "Lazy Load" Pattern)
To prevent Event Bubbling conflicts and "Dead Input," we separate listeners by layer and lifecycle.

* **Game Input (`Input.js`)**:
    * **Target**: `window` (Allows dragging outside canvas bounds).
    * **Lifecycle**: Listeners are attached once. State is managed via an `enabled` flag.
    * **Constraint**: `onStart` coordinates must **NOT** be clamped to 0-600. Valid drags may originate in the margin due to Camera Offsets.

* **Editor Input (`PointerInput.js`)**:
    * **Target**: `canvas` (Captures specific tile clicks).
    * **Lifecycle (Explicit Attach/Detach)**:
        * **Constructor**: Does **NOT** attach listeners.
        * **Attach**: Called only when `EditorSystem.enable()` runs.
        * **Detach**: Called immediately when `EditorSystem.disable()` runs.
    * **Reasoning**: If attached permanently, `PointerInput` calls `preventDefault()` on the canvas, swallowing events before they bubble to the Game Input.

### 3.3 Safe Initialization ("Armored Boot")
`Game.js` must be resilient to DOM timing issues.
* **UI Updates**: Any call to `updateUI` (setting text content) must check if the DOM element exists (`if (this.uiPar) ...`).
* **Failure State**: Unchecked DOM access causes silent constructor crashes, preventing the State Machine from booting.

### 3.4 Event-Driven Core
Systems are decoupled via a global `EventBus`.
* `STROKE_TAKEN`: Input released -> Increment strokes.
* `HOLE_LIP`: Collision detected -> Play "Rim Rattle".
* `BALL_STOPPED`: Threshold met -> Unlock input.

## 4. Data & Serialization
### 4.1 PlayerState (The Bank)
A Singleton class managing persistent data (`localStorage: retro-putt-profile`).
* **Inventory**: Tracks consumables (e.g., `{ prediction: 5 }`).
* **Currency**: Coins collected.

### 4.2 The Camera (Clamped Follow)
* **Dead Zone**: The 60px difference between Logical World (600) and Viewport (540).
* **Behavior**: Camera strictly follows the ball but clamps to `(0, 600)`.

### 4.3 Level Serialization
* **Format**: Base64 encoded JSON (`RP1:` prefix).
* **Compression**: Coordinates divided by 60 (Grid Size).

## 5. Content Roadmap
### 5.1 The Level Editor (Status: Functional)
* **Current Capabilities**: Navigation (Pan/Zoom), Painting (Wall/Sand).
* **Missing Tools**: Logic for `HOLE`, `START`, and `SLOPE` placement needs to be implemented in `EditorSystem.js`.

### 5.2 Campaign Structure
* **Target**: 18 Levels total.
    * **Course 1**: Basics.
    * **Course 2**: Sand & Wind.
    * **Course 3**: Slopes.

## 6. Persistence System (Editor Saves)
### 6.1 Data Structure (Manifest Pattern)
* **Storage**: `localStorage`.
* **Manifest Key**: `rp_editor_manifest`. Stores metadata only (ID, Name, Date).
* **Data Key**: `rp_level_{UUID}`. Stores the actual Base64 string.
* **Constraint**: Separating manifest from data ensures fast loading of the file list.

### 6.2 The "Dirty" State
* **Tracker**: `EditorSystem.isDirty` (Boolean).
* **Trigger**: Set to `true` on any `PAINT`, `PLACE`, or `ERASE` action.
* **Reset**: Set to `false` only after `saveLevel()` completes successfully.
* **Guard**: Attempting to `EXIT`, `LOAD`, or `NEW` while `isDirty === true` triggers a blocking "Save or Discard?" modal.

### 6.3 UI/UX Design
* **Modals**: Custom HTML Overlays (No native `alert/prompt`).
* **Input**: HTML `<input type="text">` with `maxlength="24"`.
* **List**: Scrollable `<ul>` container.
    * *Item*: Name (Left), Date (Right, formatted "MM/DD HH:MM").
    * *Actions*: Load (Click Body), Delete (Trash Icon).