import { eventBus } from '../core/EventBus.js';

export class LevelManager {
    constructor() {
        this.currentLevelIndex = 0;
        this.levels = [
            // Level 1: The Green
            {
                par: 2,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [],
                entities: []
            },
            // Level 2: The Bank
            {
                par: 3,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [
                    { x: 200, y: 250, width: 200, height: 50 } // Central block
                ],
                hazards: [],
                entities: []
            },
            // Level 3: The Trap
            {
                par: 3,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [
                    { x: 100, y: 200, width: 400, height: 200 } // Large sand trap
                ],
                entities: []
            },
            // Level 4: Windy Meadows
            {
                par: 3,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'wind', x: 100, y: 200, width: 400, height: 200, vx: 0.1, vy: 0 } // Push Right
                ]
            },
            // Level 5: Crosswind
            {
                par: 3,
                start: { x: 100, y: 500 },
                hole: { x: 500, y: 100, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'wind', x: 200, y: 0, width: 200, height: 600, vx: 0, vy: 0.15 } // Push Down
                ]
            },
            // Level 6: Stormy Pass
            {
                par: 4,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [
                    { x: 250, y: 250, width: 100, height: 100 }
                ],
                hazards: [
                    { x: 0, y: 200, width: 200, height: 200 },
                    { x: 400, y: 200, width: 200, height: 200 }
                ],
                entities: [
                    { type: 'wind', x: 0, y: 200, width: 600, height: 200, vx: -0.1, vy: 0 } // Push Left
                ]
            },
            // Level 7: Pendulum Path
            {
                par: 4,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'mover', x: 250, y: 300, width: 100, height: 20, axis: 'x', range: 100, speed: 2 }
                ]
            },
            // Level 8: The Squeeze
            {
                par: 4,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'mover', x: 100, y: 300, width: 100, height: 50, axis: 'x', range: 50, speed: 1.5 },
                    { type: 'mover', x: 400, y: 300, width: 100, height: 50, axis: 'x', range: 50, speed: -1.5 }
                ]
            },
            // Level 9: Traffic
            {
                par: 5,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'mover', x: 100, y: 400, width: 50, height: 50, axis: 'x', range: 200, speed: 1 },
                    { type: 'mover', x: 450, y: 300, width: 50, height: 50, axis: 'x', range: 200, speed: 1.5 },
                    { type: 'mover', x: 100, y: 200, width: 50, height: 50, axis: 'x', range: 200, speed: 2 }
                ]
            },
            // Level 10: Speedway
            {
                par: 4,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [
                    { x: 200, y: 0, width: 20, height: 600 },
                    { x: 380, y: 0, width: 20, height: 600 }
                ],
                hazards: [],
                entities: [
                    { type: 'boost', x: 250, y: 450, width: 100, height: 20, multiplier: 1.5 },
                    { type: 'boost', x: 250, y: 250, width: 100, height: 20, multiplier: 1.5 }
                ]
            },
            // Level 11: Boost Jump
            {
                par: 3,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [
                    { x: 100, y: 200, width: 400, height: 200 } // Big sand trap
                ],
                entities: [
                    { type: 'boost', x: 250, y: 450, width: 100, height: 50, multiplier: 2.0 } // Strong boost to clear sand
                ]
            },
            // Level 12: Pinball
            {
                par: 4,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [
                    { x: 100, y: 200, width: 50, height: 50 },
                    { x: 450, y: 200, width: 50, height: 50 },
                    { x: 200, y: 350, width: 200, height: 20 }
                ],
                hazards: [],
                entities: [
                    { type: 'boost', x: 50, y: 300, width: 20, height: 100, multiplier: 1.5 },
                    { type: 'boost', x: 530, y: 300, width: 20, height: 100, multiplier: 1.5 }
                ]
            },
            // Level 13: Locked Fairway
            {
                par: 5,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [
                    { x: 100, y: 300, width: 100, height: 100 } // Sand with switch
                ],
                entities: [
                    { type: 'gate', id: 'gate1', x: 200, y: 150, width: 200, height: 20, open: false },
                    { type: 'switch', targetId: 'gate1', x: 150, y: 350, radius: 15, active: false }
                ]
            },
            // Level 14: Double Trouble
            {
                par: 5,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [
                    { x: 290, y: 200, width: 20, height: 200 } // Divider
                ],
                hazards: [],
                entities: [
                    { type: 'gate', id: 'g1', x: 100, y: 150, width: 100, height: 20, open: false },
                    { type: 'gate', id: 'g2', x: 400, y: 150, width: 100, height: 20, open: false },
                    { type: 'switch', targetId: 'g1', x: 500, y: 400, radius: 15, active: false },
                    { type: 'switch', targetId: 'g2', x: 100, y: 400, radius: 15, active: false }
                ]
            },
            // Level 15: Timed Run
            {
                par: 4,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'gate', id: 'timedGate', x: 200, y: 200, width: 200, height: 20, open: false },
                    { type: 'switch', targetId: 'timedGate', x: 300, y: 400, radius: 15, active: false, timeout: 5000 } // 5 seconds
                ]
            },
            // Level 16: Chaos Course
            {
                par: 6,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [],
                entities: [
                    { type: 'wind', x: 0, y: 200, width: 600, height: 100, vx: 0.1, vy: 0 },
                    { type: 'mover', x: 200, y: 350, width: 200, height: 20, axis: 'x', range: 100, speed: 2 },
                    { type: 'boost', x: 100, y: 500, width: 50, height: 50, multiplier: 1.5 },
                    { type: 'gate', id: 'chaosGate', x: 250, y: 150, width: 100, height: 20, open: false },
                    { type: 'switch', targetId: 'chaosGate', x: 500, y: 500, radius: 15, active: false }
                ]
            },
            // Level 17: The Gauntlet
            {
                par: 5,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [
                    { x: 200, y: 0, width: 20, height: 600 },
                    { x: 380, y: 0, width: 20, height: 600 }
                ],
                hazards: [],
                entities: [
                    { type: 'mover', x: 220, y: 400, width: 160, height: 20, axis: 'y', range: 50, speed: 1 },
                    { type: 'mover', x: 220, y: 200, width: 160, height: 20, axis: 'y', range: 50, speed: 1.5 }
                ]
            },
            // Level 18: Grand Finale
            {
                par: 7,
                start: { x: 300, y: 550 },
                hole: { x: 300, y: 50, radius: 15 },
                walls: [],
                hazards: [
                    { x: 100, y: 200, width: 400, height: 200 }
                ],
                entities: [
                    { type: 'wind', x: 0, y: 200, width: 600, height: 200, vx: -0.05, vy: 0 },
                    { type: 'gate', id: 'finalGate', x: 250, y: 100, width: 100, height: 20, open: false },
                    { type: 'switch', targetId: 'finalGate', x: 50, y: 300, radius: 15, active: false },
                    { type: 'boost', x: 500, y: 500, width: 50, height: 50, multiplier: 2.0 }
                ]
            }
        ];
    }

    getStarRating(strokes, par) {
        if (strokes <= par) return 3;
        if (strokes <= par + 2) return 2;
        return 1;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }

    nextLevel() {
        this.currentLevelIndex++;
        if (this.currentLevelIndex >= this.levels.length) {
            return null; // Game Over
        }
        return this.getCurrentLevel();
    }

    reset() {
        this.currentLevelIndex = 0;
        return this.getCurrentLevel();
    }
}
