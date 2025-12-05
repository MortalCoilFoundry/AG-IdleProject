# Agent Handoff - Phase 2.6 Complete

## Summary of Work
I have completed **Phase 2.5 (Coordinate Sync)** and **Phase 2.6 (Global Renderer Audit)**. The primary goal was to resolve visual desyncs between the physics engine and the renderer by enforcing a strict "Golden Rule": **"If it exists in the World, it must pass through the Viewport."**

### Completed Features
1.  **Unified Coordinate System (`Viewport.js`)**:
    -   Implemented `worldToScreen(worldX, worldY)` as the single source of truth for coordinate transformations.
    -   All rendering now respects `viewport.zoom` and `viewport.x/y` (camera position).

2.  **Global Renderer Audit (`Renderer.js`)**:
    -   **Refactored**: `drawBall`, `drawAimLine`, `drawTrail`, `drawWindParticles`, `drawWind`, `drawMover`, `drawBoost`, `drawSwitch`, `drawGate`, and `drawSlopes`.
    -   **New Methods**:
        -   `drawHole(level)`: Draws the hole based on physics coordinates (`level.hole`) transformed to screen space.
        -   `drawHazards(level)`: Draws sand traps using `getScreenRect`.
        -   `getScreenRect(entity)`: Helper to transform entity bounds to screen space.
    -   **Bedrock Rendering**: `clear()` now fills the background with `#0f380f` (darkest green), creating a visual "void" outside the playable map.

3.  **Physics Debug Overlay**:
    -   Added `drawPhysicsDebug(ball, tileMap)` (Toggle with **'D'**).
    -   Visualizes the ball's physics body (Blue Circle) and the 3x3 wall neighborhood (Red Rects) exactly as the physics engine sees them.
    -   **Fix**: Debug drawing is forced to be the **last** operation in the render loop to ensure visibility.

4.  **Physics Robustness (`Physics.js`)**:
    -   Fixed "Tunneling" issue by updating `handleWallCollisions` to check the full range of tiles covered by the ball's radius (`minCol` to `maxCol`), not just the center tile.

### Current State
-   **Visuals**: The game is now visually consistent. The "Invisible Hole" bug is fixed. Entities, particles, and the aim line align perfectly with the grid and walls.
-   **Debug**: The 'D' key toggle is functional and reliable (case-insensitive).
-   **Architecture**: `Renderer.js` is strictly decoupled from raw world coordinates.

## Known Issues & Redundancies (Context Rich)

### 1. Redundant Rendering Logic
We now have two ways to draw Holes and Sand, which is a potential source of bugs or double-drawing:
-   **Tile-Based**: `Renderer.drawTile` has cases for `'HOLE'` and `'SAND'`. This iterates the `tileMap`.
-   **Entity-Based**: `Renderer.drawHole` uses `level.hole`, and `Renderer.drawHazards` uses `level.hazards`.
-   **Risk**: If the `tileMap` contains 'HOLE' or 'SAND' tiles *AND* the `level` object has `hole`/`hazards` defined, we are drawing them twice.
-   **Recommendation**: Decide on a single source of truth. If Holes and Hazards are "Entities" (which they seem to be for physics attributes like radius or friction), remove the rendering logic from `drawTile` or ensure the `tileMap` doesn't contain them.

### 2. Physics Logic Duplication
-   **Issue**: `Physics.simulateTrajectory` manually replicates the logic of `Physics.update` (including the new wall collision logic).
-   **Risk**: If `update` is modified (e.g., friction changes, new forces), `simulateTrajectory` will drift out of sync, causing the aim line to lie to the player.
-   **Recommendation**: Refactor the core physics step into a shared `step(ball, dt)` method that both `update` and `simulateTrajectory` can call.

### 3. Infinite Level Rendering
-   **Observation**: `Renderer.drawLevel` currently calculates visible bounds (`minCol` to `maxCol`) to optimize rendering. This is good. However, `drawHazards` and `drawEntities` iterate *all* entities in the level.
-   **Future Optimization**: For truly infinite levels, we will need a spatial partition (e.g., QuadTree or Grid-based lookup) for entities to avoid iterating thousands of off-screen objects every frame.

## Next Steps
1.  **Cleanup**: Address the redundant rendering logic (Tile vs. Entity).
2.  **UI**: Implement the UI for Inventory and Prediction Mode (as mentioned in previous handoff).
3.  **Infinite Generation**: Proceed with Phase 3 to implement the procedural level generation.
