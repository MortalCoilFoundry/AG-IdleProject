import { TEST_CHAMBER_LEVEL } from '../levels/TestChamber.js';

export class GameManager {
    constructor(game) {
        this.game = game;
    }

    startTestSession() {
        console.log("GameManager: Starting Test Chamber");
        this.game.levelManager.loadOneOff(TEST_CHAMBER_LEVEL);
        this.game.loadLevel();
    }

    startCampaignLevel(index) {
        console.log(`GameManager: Starting Campaign Level ${index + 1}`);
        this.game.levelManager.enterCampaign();
        this.game.levelManager.currentLevelIndex = index;
        this.game.loadLevel();
    }
}
