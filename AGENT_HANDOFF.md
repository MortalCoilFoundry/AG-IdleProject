# Agent Handoff

## Summary of Work
I have overhauled the **Physics Engine** to implement a "Grass Feel" using **Linear Drag** and **Static Friction**, and added visual polish with a **Puff Particle Effect**.

### Completed Features
1.  **Physics Overhaul**:
    -   **Linear Drag**: Replaced exponential decay with linear subtraction (`speed - friction`).
        -   Grass: 0.03/frame.
        -   Sand: 0.15/frame.
    -   **Static Friction**: Implemented a "sticky" threshold. Ball stops if speed < 0.1 and forces < 0.08.
    -   **Global Stop Check**: Added a failsafe to ensure the ball stops if speed < 0.01, preventing soft-locks near the hole.
2.  **Visual Polish**:
    -   **Puff Effect**: Emits 5 small dark green particles (`#306230`) when the ball stops, simulating settling into grass.
3.  **Bug Fixes**:
    -   **Unselectable Ball**: Fixed a critical issue where the ball would get stuck in a "moving" state near the hole because the Static Friction check was skipped. Added a global velocity check to resolve this.

### Current State
-   **Physics**: The ball now has weight and stops decisively. It feels more like golf and less like air hockey.
-   **Codebase**: `Physics.js` and `Particles.js` are updated.
-   **Documentation**: `GDD.md` reflects the new physics model.

## Next Steps
-   **Level Design**: Test the new physics on complex slopes. The "stickiness" might make some gentle slopes playable that were previously impossible.
-   **Tuning**: The friction values (0.03 / 0.15) might need fine-tuning based on player feedback.

## Known Issues / Challenges
-   **Challenge**: The "Unselectable Ball" bug was a subtle interaction between the Gravity Well logic and the Stop Threshold. The fix (Global Stop Check) seems robust but should be kept in mind if similar soft-locks occur.
