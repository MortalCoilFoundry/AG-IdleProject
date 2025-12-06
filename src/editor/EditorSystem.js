import { LevelSerializer } from './LevelSerializer.js';
import { EditorUI } from './EditorUI.js';
import { TOOLS } from './EditorTools.js';
import { PointerInput } from './PointerInput.js';

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
        this.pointerInput = new PointerInput(this);

        this.currentTool = TOOLS.HAND;
        this.tools = TOOLS;

        // Tool Settings
        this.slopeIntensityIndex = 0;
        this.SLOPE_INTENSITIES = [0.05, 0.10, 0.15];

        // Bindings
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    cycleSlopeIntensity() {
        this.slopeIntensityIndex = (this.slopeIntensityIndex + 1) % this.SLOPE_INTENSITIES.length;
        console.log(`Slope Placement Intensity: ${this.SLOPE_INTENSITIES[this.slopeIntensityIndex]}`);
        return this.slopeIntensityIndex + 1; // Return 1-based index for UI
    }

    // ... (existing methods) ...

    handleSlopeTool(col, row) {
        const level = this.game.levelManager.getCurrentLevel();
        if (!level) return;

        // Initialize slopes array if missing
        if (!level.slopes) level.slopes = [];

        // Check if slope exists at this tile
        const existingIndex = level.slopes.findIndex(s =>
            Math.floor(s.x / 60) === col && Math.floor(s.y / 60) === row
        );

        const DIRECTIONS = [
            { vx: 0, vy: -1, type: 'SLOPE_NORTH' },
            { vx: 1, vy: -1, type: 'SLOPE_NE' },
            { vx: 1, vy: 0, type: 'SLOPE_EAST' },
            { vx: 1, vy: 1, type: 'SLOPE_SE' },
            { vx: 0, vy: 1, type: 'SLOPE_SOUTH' },
            { vx: -1, vy: 1, type: 'SLOPE_SW' },
            { vx: -1, vy: 0, type: 'SLOPE_WEST' },
            { vx: -1, vy: -1, type: 'SLOPE_NW' }
        ];

        // Intensity Levels (Use Class Property)
        const INTENSITIES = this.SLOPE_INTENSITIES;

        if (existingIndex !== -1) {
            const currentSlope = level.slopes[existingIndex];

            // Calculate current normalized direction and magnitude
            const mag = Math.sqrt(currentSlope.vx * currentSlope.vx + currentSlope.vy * currentSlope.vy);
            const normVx = Math.round(currentSlope.vx / mag) || 0;
            const normVy = Math.round(currentSlope.vy / mag) || 0;

            if (this.keys.Shift) {
                // --- SHIFT CLICK: Cycle Intensity (Edit Existing) ---
                let currentIntIndex = INTENSITIES.findIndex(i => Math.abs(i - mag) < 0.01);
                if (currentIntIndex === -1) currentIntIndex = 0;

                const nextInt = INTENSITIES[(currentIntIndex + 1) % INTENSITIES.length];

                currentSlope.vx = normVx * nextInt;
                currentSlope.vy = normVy * nextInt;
            } else {
                // --- NORMAL CLICK: Cycle Direction ---
                let currentDirIndex = DIRECTIONS.findIndex(d => d.vx === normVx && d.vy === normVy);
                if (currentDirIndex === -1) currentDirIndex = 0;

                const nextDir = DIRECTIONS[(currentDirIndex + 1) % DIRECTIONS.length];

                // Keep current intensity (or should we reset to tool default? Let's keep current to be nice)
                currentSlope.vx = nextDir.vx * mag;
                currentSlope.vy = nextDir.vy * mag;
                currentSlope.type = nextDir.type;

                this.game.tileMap.setTile(col, row, nextDir.type);
            }
        } else {
            // --- NEW SLOPE ---
            // Default: North, Selected Intensity
            const dir = DIRECTIONS[0]; // North
            const intensity = INTENSITIES[this.slopeIntensityIndex];

            level.slopes.push({
                x: col * 60,
                y: row * 60,
                width: 60,
                height: 60,
                vx: dir.vx * intensity,
                vy: dir.vy * intensity,
                type: 'slope'
            });

            this.game.tileMap.setTile(col, row, dir.type);
        }
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

        // Attach Input
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.pointerInput.attach();

        console.log("Editor Enabled");
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        // game.editorMode is now handled by Game.setMode, but we can keep this for safety or remove it if we strictly follow the arbiter pattern. 
        // The user request says "Game.js (The Arbiter)... On Switch to PLAY: this.editorSystem.disable()".
        // It doesn't explicitly say we MUST remove this line, but it's cleaner if Game manages the flag.
        // However, existing code sets it here. Let's leave it to ensure consistency if called directly.
        this.game.editorMode = false;

        // Hide UI
        this.ui.hide();

        // Remove Input
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        // Reset Keys
        for (let key in this.keys) this.keys[key] = false;

        // Cleanup
        this.currentTool = this.tools.HAND;
        // Cleanup
        this.currentTool = this.tools.HAND;
        this.pointerInput.detach();
        this.pointerInput.reset();

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

        // Draw Ghost Tile (if not Hand tool)
        if (this.currentTool !== TOOLS.HAND) {
            this.drawGhost(ctx);
        }
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
    setTool(tool) {
        this.currentTool = tool;
        console.log('Tool set to:', tool);
    }

    drawGhost(ctx) {
        const pointers = this.pointerInput.activePointers;
        if (pointers.size === 1) {
            const p = pointers.values().next().value;
            const vp = this.game.viewport;
            const rect = this.game.canvas.getBoundingClientRect();

            // Scale mouse coordinates to match canvas logical resolution
            const scaleX = this.game.canvas.width / rect.width;
            const scaleY = this.game.canvas.height / rect.height;

            const canvasX = (p.x - rect.left) * scaleX;
            const canvasY = (p.y - rect.top) * scaleY;

            // Apply Renderer Viewport Offset
            const viewX = canvasX - this.game.renderer.VIEWPORT_X;
            const viewY = canvasY - this.game.renderer.VIEWPORT_Y;

            const gridPos = vp.screenToGrid(viewX, viewY);
            const col = Math.floor(gridPos.col);
            const row = Math.floor(gridPos.row);

            const screenPos = vp.gridToScreen(col, row);
            const size = 60 * vp.zoom;

            ctx.save();
            ctx.fillStyle = '#9bbc0f';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(screenPos.x, screenPos.y, size, size);
            ctx.restore();
        }
    }

    // --- Actions ---

    // --- Actions ---

    handleStartTool(col, row) {
        const level = this.game.levelManager.getCurrentLevel();
        if (!level) return;

        // Update Level Data
        level.start = { x: col * 60 + 30, y: row * 60 + 30 };

        // Update Live Ball Position (Visual Feedback)
        this.game.ball.x = level.start.x;
        this.game.ball.y = level.start.y;
        this.game.ball.vx = 0;
        this.game.ball.vy = 0;
        this.game.ball.isMoving = false;
    }

    handleHoleTool(col, row) {
        const level = this.game.levelManager.getCurrentLevel();
        if (!level) return;

        // 1. Remove old hole from TileMap
        if (level.hole) {
            const oldCol = Math.floor(level.hole.x / 60);
            const oldRow = Math.floor(level.hole.y / 60);
            if (this.game.tileMap.getTile(oldCol, oldRow) === 'HOLE') {
                this.game.tileMap.setTile(oldCol, oldRow, null);
            }
        }

        // 2. Set new hole
        level.hole = { x: col * 60 + 30, y: row * 60 + 30, radius: 15 };
        this.game.tileMap.setTile(col, row, 'HOLE');
    }

    handleSlopeTool(col, row) {
        const level = this.game.levelManager.getCurrentLevel();
        if (!level) return;

        // Initialize slopes array if missing
        if (!level.slopes) level.slopes = [];

        // Check if slope exists at this tile
        const existingIndex = level.slopes.findIndex(s =>
            Math.floor(s.x / 60) === col && Math.floor(s.y / 60) === row
        );

        const DIRECTIONS = [
            { vx: 0, vy: -1, type: 'SLOPE_NORTH' },
            { vx: 1, vy: -1, type: 'SLOPE_NE' },
            { vx: 1, vy: 0, type: 'SLOPE_EAST' },
            { vx: 1, vy: 1, type: 'SLOPE_SE' },
            { vx: 0, vy: 1, type: 'SLOPE_SOUTH' },
            { vx: -1, vy: 1, type: 'SLOPE_SW' },
            { vx: -1, vy: 0, type: 'SLOPE_WEST' },
            { vx: -1, vy: -1, type: 'SLOPE_NW' }
        ];

        // Intensity Levels (Use Class Property)
        const INTENSITIES = this.SLOPE_INTENSITIES;

        if (existingIndex !== -1) {
            const currentSlope = level.slopes[existingIndex];

            // Calculate current normalized direction and magnitude
            const mag = Math.sqrt(currentSlope.vx * currentSlope.vx + currentSlope.vy * currentSlope.vy);
            const normVx = Math.round(currentSlope.vx / mag) || 0; // Handle 0 safely
            const normVy = Math.round(currentSlope.vy / mag) || 0;

            if (this.keys.Shift) {
                // --- SHIFT CLICK: Cycle Intensity ---
                // Find current intensity index
                let currentIntIndex = INTENSITIES.findIndex(i => Math.abs(i - mag) < 0.01);
                if (currentIntIndex === -1) currentIntIndex = 0; // Default to lowest

                // Cycle to next intensity
                const nextInt = INTENSITIES[(currentIntIndex + 1) % INTENSITIES.length];

                // Update existing slope in place
                currentSlope.vx = normVx * nextInt;
                currentSlope.vy = normVy * nextInt;

                console.log(`Slope Intensity Updated: ${nextInt}`);
            } else {
                // --- NORMAL CLICK: Cycle Direction ---
                // Find current direction index
                let currentDirIndex = DIRECTIONS.findIndex(d => d.vx === normVx && d.vy === normVy);
                if (currentDirIndex === -1) currentDirIndex = 0;

                // Cycle to next direction
                const nextDir = DIRECTIONS[(currentDirIndex + 1) % DIRECTIONS.length];

                // Keep current intensity
                currentSlope.vx = nextDir.vx * mag;
                currentSlope.vy = nextDir.vy * mag;
                currentSlope.type = nextDir.type; // Update type string for TileMap

                // Update TileMap
                this.game.tileMap.setTile(col, row, nextDir.type);
                console.log(`Slope Direction Updated: ${nextDir.type}`);
            }
        } else {
            // --- NEW SLOPE ---
            // Default: North, Selected Intensity
            const dir = DIRECTIONS[0]; // North
            const intensity = INTENSITIES[this.slopeIntensityIndex];

            level.slopes.push({
                x: col * 60,
                y: row * 60,
                width: 60,
                height: 60,
                vx: dir.vx * intensity,
                vy: dir.vy * intensity,
                type: 'slope' // Generic entity type
            });

            // Update TileMap (Physics)
            this.game.tileMap.setTile(col, row, dir.type);
            console.log("New Slope Created");
        }
    }

    exportLevel() {
        // Gather Data
        const currentLevel = this.game.levelManager.getCurrentLevel(); // FIX: Get reference
        if (!currentLevel) return null;

        const tileMap = this.game.tileMap;

        // Combine all non-grid entities
        let entities = [];
        if (currentLevel.entities) entities = entities.concat(currentLevel.entities);
        if (currentLevel.slopes) entities = entities.concat(currentLevel.slopes);

        // Add Start Position as a pseudo-entity for serialization
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
