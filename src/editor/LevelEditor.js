import { LevelSerializer } from './LevelSerializer.js';

export class LevelEditor {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.currentLevel = null;

        // Bind methods
        this.handleInput = this.handleInput.bind(this);
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        console.log("Level Editor Enabled");

        // Add input listeners
        window.addEventListener('keydown', this.handleInput);

        // Load current level into editor context if needed
        // For now, we just use the game's current level data for export
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        console.log("Level Editor Disabled");

        // Remove input listeners
        window.removeEventListener('keydown', this.handleInput);
    }

    handleInput(e) {
        if (!this.enabled) return;

        // Ctrl + S: Export
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.exportLevel();
        }

        // Ctrl + L: Import
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            this.importLevel();
        }
    }

    exportLevel() {
        // Use the current level from the game
        // Note: In a real editor, we'd have a separate 'editorLevel' object
        // For now, we grab the active level data
        const levelData = this.game.levelManager.getCurrentLevelData();

        if (!levelData) {
            console.error("No level data to export!");
            return;
        }

        const code = LevelSerializer.serialize(levelData);

        navigator.clipboard.writeText(code).then(() => {
            alert("Level Code Copied to Clipboard!");
            console.log("Exported Code:", code);
        }).catch(err => {
            console.error("Failed to copy code:", err);
            alert("Failed to copy code. Check console.");
        });
    }

    importLevel() {
        const code = prompt("Paste Level Code (RP1:...):");
        if (!code) return;

        const levelData = LevelSerializer.deserialize(code);

        if (levelData) {
            console.log("Level Loaded:", levelData);
            // Load the level into the game
            this.game.levelManager.loadLevelFromData(levelData);
            alert("Level Loaded Successfully!");
        } else {
            alert("Invalid Level Code!");
        }
    }
}
