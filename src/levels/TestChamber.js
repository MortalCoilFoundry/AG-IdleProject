// src/levels/TestChamber.js

export const TEST_CHAMBER_LEVEL = {
    par: 99,
    start: { x: 300, y: 500 },
    hole: { x: 300, y: 100, radius: 15 },
    walls: [
        { x: 100, y: 100, width: 20, height: 400 }
    ],
    hazards: [
        { x: 400, y: 300, width: 100, height: 100 }
    ],
    slopes: [],
    entities: [
        // FIX: Ensure vx and vy are defined!
        {
            type: 'wind',
            x: 200,
            y: 200,
            width: 200,
            height: 200,
            vx: 0.1, // <--- Add this
            vy: 0    // <--- Add this
        }
    ]
};