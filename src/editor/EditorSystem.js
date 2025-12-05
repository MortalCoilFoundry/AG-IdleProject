import { LevelSerializer } from './LevelSerializer.js';
import { EditorUI } from './EditorUI.js';

export class EditorSystem {
    constructor(game) {
        this.game = game;
        this.enabled = false;

        // Editor State
        this.panSpeed = 500; // Pixels per second
        this.keys = {
            w: false, a: false, s: false, d: false,
            ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
            Shift: false
        };

        // UI Component
        this.ui = new EditorUI(this);

        // Bindings
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    handleKeyDown(e) {
        if (!this.enabled) return;
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = true;
        }
        if (e.key === 'Shift') this.keys.Shift = true;
    }

    handleKeyUp(e) {
        if (!this.enabled) return;
        if (this.keys.hasOwnProperty(e.key)) {
            this.keys[e.key] = false;
        }
        if (e.key === 'Shift') this.keys.Shift = false;
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.game.editorMode = true;
        this.game.ball.isMoving = false; // Stop physics immediately

        // Show UI
        this.ui.show();

        // Attach Input
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        console.log("Editor Enabled");
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.game.editorMode = false;

        // Hide UI
        this.ui.hide();

        // Remove Input
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        // Reset Keys
        for (let key in this.keys) this.keys[key] = false;

        console.log("Editor Disabled");
    }

    update(dt) {
        if (!this.enabled) return;

        // --- Camera Panning ---
        let dx = 0;
        let dy = 0;
        const speed = this.keys.Shift ? this.panSpeed * 2 : this.panSpeed;

        if (this.keys.w || this.keys.ArrowUp) dy -= speed * dt;
        if (this.keys.s || this.keys.ArrowDown) dy += speed * dt;
        if (this.keys.a || this.keys.ArrowLeft) dx -= speed * dt;
        if (this.keys.d || this.keys.ArrowRight) dx += speed * dt;

        if (dx !== 0 || dy !== 0) {
            this.game.viewport.x += dx;
            this.game.viewport.y += dy;

            // In Editor Mode, we DO NOT clamp the camera. 
            // We want to be able to pan into the void to build new things.
        }
    }

    draw(ctx) {
        if (!this.enabled) return;

        // Draw Grid Overlay
        this.drawGrid(ctx);
    }

    drawGrid(ctx) {
        const vp = this.game.viewport;
        const gridSize = 60;

        // 1. Calculate Visible Grid Range (Culling)
        // Viewport X/Y is the CENTER of the camera in World Space
        const halfWidth = (vp.width / 2) / vp.zoom;
        const halfHeight = (vp.height / 2) / vp.zoom;

        const startCol = Math.floor((vp.x - halfWidth) / gridSize);
        const endCol = Math.ceil((vp.x + halfWidth) / gridSize);

        const startRow = Math.floor((vp.y - halfHeight) / gridSize);
        const endRow = Math.ceil((vp.y + halfHeight) / gridSize);

        ctx.save();
        ctx.strokeStyle = '#9bbc0f'; // Lightest Green
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1; // 1px logical width

        // Draw Vertical Lines
        for (let c = startCol; c <= endCol; c++) {
            // We can use gridToScreen to get the screen X for this column
            // gridToScreen(c, 0) returns the top-left of the tile at col c, row 0
            // The X coordinate is the left edge of that column
            const screenPos = vp.gridToScreen(c, 0);
            const screenX = Math.floor(screenPos.x);

            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, vp.height); // Full screen height
            ctx.stroke();
        }

        // Draw Horizontal Lines
        for (let r = startRow; r <= endRow; r++) {
            const screenPos = vp.gridToScreen(0, r);
            const screenY = Math.floor(screenPos.y);

            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(vp.width, screenY); // Full screen width
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- Actions ---

    exportLevel() {
        // Gather Data
        const tileMap = this.game.tileMap;

        // We need to reconstruct the 'entities' list from the game state
        // Currently, Game.js loads entities into 'level.entities'
        // But we also need to include Slopes and Start Position if they aren't in entities

        const currentLevel = this.game.levelManager.getCurrentLevel();

        // Combine all non-grid entities
        let entities = [];
        if (currentLevel.entities) entities = entities.concat(currentLevel.entities);
        if (currentLevel.slopes) entities = entities.concat(currentLevel.slopes);

        // Add Start Position as a pseudo-entity for serialization if needed, 
        // or handle it in the serializer. The serializer expects 'st' separately usually,
        // but let's check our updated serializer.
        // Updated serializer looks for 'st' in the 'levelData' passed to it? 
        // Wait, I updated the serializer to take (tileMap, entities, metadata).
        // And inside it checks 'entities' for type 'start'.

        // Let's make sure we pass the start position correctly.
        if (currentLevel.start) {
            entities.push({ type: 'start', x: currentLevel.start.x, y: currentLevel.start.y });
        }

        const metadata = {
            wind: currentLevel.wind,
            par: currentLevel.par
        };

        const code = LevelSerializer.serialize(tileMap, entities, metadata);
        return code;
    }

    importLevel(code) {
        const levelData = LevelSerializer.deserialize(code);
        if (levelData) {
            this.game.levelManager.loadLevelFromData(levelData);
            // Re-load to refresh TileMap
            this.game.loadLevel();
            return true;
        }
        return false;
    }
}
