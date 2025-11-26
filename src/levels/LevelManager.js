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
                hazards: []
            },
            // Level 2: The Bank
            {
                par: 3,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [
                    { x: 200, y: 250, width: 200, height: 50 } // Central block
                ],
                hazards: []
            },
            // Level 3: The Trap
            {
                par: 3,
                start: { x: 300, y: 500 },
                hole: { x: 300, y: 100, radius: 15 },
                walls: [],
                hazards: [
                    { x: 100, y: 200, width: 400, height: 200 } // Large sand trap
                ]
            }
        ];
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
