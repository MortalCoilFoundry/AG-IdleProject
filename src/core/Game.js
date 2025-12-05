import { eventBus } from './EventBus.js';
import { Physics } from '../physics/Physics.js';
import { Renderer } from '../graphics/Renderer.js';
import { Input } from '../input/Input.js';
import { LevelManager } from '../levels/LevelManager.js';
import { AudioController } from '../audio/Audio.js';
import { ParticleSystem } from '../graphics/Particles.js';
import { PlayerState } from './PlayerState.js';
import { Viewport } from './Viewport.js';
import { TileMap } from './TileMap.js';
import { EditorSystem } from '../editor/EditorSystem.js';

export class Game {
    constructor() {
        console.log("Game Constructor Started");
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Force canvas drawing buffer to stay 600×600 (already done in Renderer)
        // Ensure CSS size doesn't fight the logical resolution
        this.canvas.style.width = '';
        this.canvas.style.height = '';
        // Let CSS fully control display size → input coordinates now match perfectly
        this.canvas.style.imageRendering = 'pixelated';
        this.lastTime = 0;
        this.isRunning = false;

        this.physics = new Physics();

        // Initialize Core Systems
        this.viewport = new Viewport(540, 540);
        this.tileMap = new TileMap();

        // Hardcode Dummy Data (Hello World)
        this.tileMap.setTile(0, 0, 'WALL');
        this.tileMap.setTile(5, 5, 'HOLE');
        this.tileMap.setTile(2, 2, 'SAND');
        this.tileMap.setTile(1, 1, 'WALL');
        this.tileMap.setTile(8, 8, 'WALL'); // Test bounds

        this.renderer = new Renderer(this.ctx, this.viewport);
        this.levelManager = new LevelManager();
        this.audio = new AudioController();
        this.particles = new ParticleSystem();
        this.playerState = new PlayerState();

        this.isUsingPrediction = false;
        this.debugMode = false;
        this.showWindArrows = false;

        // Editor Integration
        this.editorMode = false;
        this.editorSystem = null;

        this.mode = 'LOADING'; // 'PLAY' or 'EDIT'

        this.ball = {
            x: 0, y: 0,
            vx: 0, vy: 0,
            radius: 7,
            isMoving: false
        };

        this.strokes = 0;
        this.totalStrokes = 0;
        this.totalPar = 0;
        this.totalStars = 0;

        this.uiPar = document.getElementById('par-value');
        this.uiStrokes = document.getElementById('strokes-value');

        this.init();
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;

        if (mode === 'EDIT') {
            console.log("State Machine: Switching to", mode);
            this.input.disable();
            if (this.editorSystem) {
                this.editorSystem.enable();
            }
            this.editorMode = true; // Keep flag for renderer checks
        } else {
            console.log("State Machine: Switching to", mode);
            if (this.editorSystem) {
                this.editorSystem.disable();
            }
            this.input.enable();
            this.editorMode = false;
        }
    }

    toggleEditor() {
        if (this.mode === 'PLAY') {
            this.setMode('EDIT');
        } else {
            this.setMode('PLAY');
        }
    }

    init() {
        console.log("Game Init Started");
        this.loadLevel();

        this.input = new Input(this.canvas, this.ball, this.audio);


        eventBus.on('STROKE_TAKEN', () => {
            this.strokes++;

            if (this.isUsingPrediction) {
                this.playerState.useItem('prediction');
                this.isUsingPrediction = false; // Reset for next shot
                console.log(`Prediction Used. Remaining: ${this.playerState.getItemCount('prediction')}`);
            }

            this.updateUI();
            this.audio.playHit();
            this.particles.emit(this.ball.x, this.ball.y, '#9bbc0f', 10, 5); // Burst on shoot
        });

        eventBus.on('HOLE_REACHED', () => {
            this.audio.playHole();
            this.particles.emit(this.ball.x, this.ball.y, '#306230', 20, 3); // Dark burst on hole
            setTimeout(() => {
                this.nextLevel();
            }, 2000);
        });

        eventBus.on('HOLE_LIP', (data) => {
            this.audio.playHoleLip();
            // Emit particles moving AWAY from hole (using the normal passed in data)
            // data.dx/dy is the vector pointing AWAY from hole center
            this.particles.emit(data.x, data.y, '#306230', 2, 2);
        });

        eventBus.on('BALL_STOPPED', () => {
            // Re-enable input (handled by Input class checking isMoving)
        });

        eventBus.on('WALL_HIT', (data) => {
            this.particles.emit(data.x, data.y, '#0f380f', 5, 3); // Darkest particles on wall hit
            this.audio.playWallHit();
            this.renderer.shake(10); // Shake screen
        });

        eventBus.on('SAND_ENTER', (data) => {
            if (Math.random() > 0.8) { // Don't spam particles
                this.particles.emit(data.x, data.y, '#306230', 2, 1); // Sand particles
            }
        });

        eventBus.on('BOOST_ACTIVATED', (entity) => {
            this.particles.emit(entity.x + entity.width / 2, entity.y + entity.height / 2, '#9bbc0f', 15, 8);
            // TODO: Add Boost SFX
        });

        eventBus.on('SWITCH_TRIGGERED', (switchEntity) => {
            this.renderer.shake(5);
            // Find target gate
            const level = this.levelManager.getCurrentLevel();
            if (level && level.entities) {
                const gate = level.entities.find(e => e.id === switchEntity.targetId);
                if (gate) {
                    gate.open = true;
                    // Optional: Close after delay
                    if (switchEntity.timeout) {
                        setTimeout(() => {
                            gate.open = false;
                            switchEntity.active = false;
                        }, switchEntity.timeout);
                    }
                }
            }
        });

        eventBus.on('WIND_ZONES_ACTIVE', (zones) => {
            this.renderer.initWindEmitters(zones);
            this.audio.setWind(zones);
        });

        // Debug toggles (optional, for dev)
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd') {
                this.debugMode = !this.debugMode;
                console.log(`Debug Mode: ${this.debugMode}`);
            }
            if (e.key.toLowerCase() === 'w') this.showWindArrows = !this.showWindArrows;

            // Zoom Controls
            if (e.key === '=' || e.key === '+') this.viewport.setZoom(this.viewport.zoom + 0.1);
            if (e.key === '-') this.viewport.setZoom(this.viewport.zoom - 0.1);
            if (e.key === '0') this.viewport.setZoom(1.0);

            if (e.key === 'p' || e.key === 'P') {
                if (this.isUsingPrediction) {
                    this.isUsingPrediction = false;
                    console.log("Prediction Mode OFF");
                } else {
                    if (this.playerState.hasItem('prediction')) {
                        this.isUsingPrediction = true;
                        console.log(`Prediction Mode ON (Charges: ${this.playerState.getItemCount('prediction')})`);
                    } else {
                        console.log("No Prediction Charges Left!");
                    }
                }
            }
        });

        // Resume Audio Context on first interaction
        const resumeAudio = () => {
            this.audio.resume();
            window.removeEventListener('mousedown', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('mousedown', resumeAudio);
        window.addEventListener('keydown', resumeAudio);

        this.start();
        this.editorSystem = new EditorSystem(this);
        this.setMode('PLAY');
    }

    loadLevel() {
        const level = this.levelManager.getCurrentLevel();
        if (!level) {
            this.showEndScreen();
            return;
        }

        // --- Rasterize Level to TileMap (Sync Visuals & Physics) ---
        this.tileMap.clear(); // Ensure we start fresh

        // 1. Rasterize Hole
        if (level.hole) {
            const col = Math.floor(level.hole.x / 60);
            const row = Math.floor(level.hole.y / 60);
            this.tileMap.setTile(col, row, 'HOLE');

            // SNAP PHYSICS TO GRID CENTER
            // This ensures the physics interaction matches the tile rendering perfectly.
            level.hole.x = col * 60 + 30;
            level.hole.y = row * 60 + 30;
        }

        // 2. Rasterize Walls
        if (level.walls) {
            for (const wall of level.walls) {
                // Convert rect to tiles
                const startCol = Math.floor(wall.x / 60);
                const endCol = Math.floor((wall.x + wall.width - 1) / 60);
                const startRow = Math.floor(wall.y / 60);
                const endRow = Math.floor((wall.y + wall.height - 1) / 60);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = startRow; r <= endRow; r++) {
                        this.tileMap.setTile(c, r, 'WALL');
                    }
                }
            }
        }

        // 3. Rasterize Hazards (Sand)
        if (level.hazards) {
            for (const hazard of level.hazards) {
                const startCol = Math.floor(hazard.x / 60);
                const endCol = Math.floor((hazard.x + hazard.width - 1) / 60);
                const startRow = Math.floor(hazard.y / 60);
                const endRow = Math.floor((hazard.y + hazard.height - 1) / 60);

                for (let c = startCol; c <= endCol; c++) {
                    for (let r = startRow; r <= endRow; r++) {
                        // Don't overwrite walls or hole
                        if (!this.tileMap.getTile(c, r)) {
                            this.tileMap.setTile(c, r, 'SAND');
                        }
                    }
                }
            }
        }

        this.ball.x = level.start.x;
        this.ball.y = level.start.y;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.isMoving = false;

        // Reset Entity State (Movers, Switches, Boosts)
        if (level.entities) {
            for (const entity of level.entities) {
                if (entity.type === 'mover') {
                    // Reset position if needed, though update loop handles it
                }
                if (entity.type === 'switch') entity.active = false;
                if (entity.type === 'gate') entity.open = false;
                if (entity.type === 'boost') entity.cooldown = 0;
            }
        }

        this.strokes = 0;
        this.updateUI();

        // Check for wind zones
        const windZones = this.levelManager.getWindZones();
        if (windZones.length > 0) {
            eventBus.emit('WIND_ZONES_ACTIVE', windZones);
        } else {
            this.renderer.resetWindEmitters();
            this.audio.setWind([]);
        }
    }

    nextLevel() {
        const level = this.levelManager.getCurrentLevel();
        this.totalStrokes += this.strokes;
        this.totalPar += level.par;
        this.totalStars += this.levelManager.getStarRating(this.strokes, level.par);

        const next = this.levelManager.nextLevel();
        if (next) {
            this.renderer.resetWindEmitters(); // Clear particles
            this.audio.setWind([]);
            this.loadLevel();
        } else {
            this.showEndScreen();
        }
    }

    updateUI() {
        const level = this.levelManager.getCurrentLevel();
        if (level) {
            if (this.uiPar) this.uiPar.textContent = level.par;
            if (this.uiStrokes) this.uiStrokes.textContent = this.strokes;
        }
    }

    showEndScreen() {
        this.isRunning = false;
        this.renderer.clear();
        this.ctx.fillStyle = '#0f380f';
        this.ctx.font = '30px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("COURSE COMPLETED", 300, 250);
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.fillText(`TOTAL STROKES: ${this.totalStrokes}`, 300, 300);
        this.ctx.fillText(`TOTAL PAR: ${this.totalPar}`, 300, 350);
        this.ctx.fillText(`STARS: ${this.totalStars} / ${this.levelManager.levels.length * 3}`, 300, 400);

        this.audio.playWin();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }



    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        // Editor Mode: Skip Physics, Update Editor Camera
        if (this.editorMode) {
            if (this.editorSystem) this.editorSystem.update(dt);
            return;
        }

        const level = this.levelManager.getCurrentLevel();
        if (level) {
            this.audio.update(dt); // Update audio engine (gusts)
            this.renderer.updateWindEmitters(dt); // Update wind before physics
            this.renderer.updateTrailParticles(dt); // Update trail

            // Detect Shot Start for Flash
            if (this.ball.isMoving && !this.wasMoving) {
                const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
                const size = Math.max(1.5, Math.min(speed * 0.85, 7.5));
                // Flash particle: size * 6, dark core
                this.renderer.addTrailParticle(this.ball.x, this.ball.y, this.ball.vx * 0.5, this.ball.vy * 0.5, size * 6, true);
            }
            this.wasMoving = this.ball.isMoving;

            // Emit Trail if moving
            if (this.ball.isMoving) {
                const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);

                if (speed > 1.5) { // Emit if speed > 1.5
                    const size = Math.max(1.5, Math.min(speed * 0.85, 7.5)); // clamp(speed * 0.85, 1.5, 7.5)

                    // Inherit velocity with noise
                    const vx = this.ball.vx * 0.8 + (Math.random() - 0.5) * 20;
                    const vy = this.ball.vy * 0.8 + (Math.random() - 0.5) * 20;

                    this.renderer.addTrailParticle(this.ball.x, this.ball.y, vx, vy, size, false);
                }
            }

            this.physics.update(this.ball, level, this.tileMap);
            this.particles.update();
            if (level.entities) {
                for (const entity of level.entities) {
                    if (entity.type === 'mover') {
                        if (entity.originalX === undefined) entity.originalX = entity.x;
                        if (entity.originalY === undefined) entity.originalY = entity.y;

                        const time = Date.now() / 1000;
                        const offset = Math.sin(time * (entity.speed || 2)) * (entity.range || 50);

                        if (entity.axis === 'x') {
                            entity.x = entity.originalX + offset;
                        } else {
                            entity.y = entity.originalY + offset;
                        }
                    }
                    // Cooldowns
                    if (entity.cooldown > 0) entity.cooldown--;
                }
            }

            // Update Camera
            // Center on ball, but clamp to world bounds
            // World: 600x600
            // Viewport: 540x540
            // Center of Viewport is 270, 270
            // Min Center X = 270, Max Center X = 600 - 270 = 330

            const halfView = 270;
            const maxScroll = 600 - halfView; // 330

            const targetX = Math.max(halfView, Math.min(this.ball.x, maxScroll));
            const targetY = Math.max(halfView, Math.min(this.ball.y, maxScroll));

            this.viewport.x = targetX;
            this.viewport.y = targetY;

            // Input expects top-left offset
            this.input.setCamera(targetX - halfView, targetY - halfView);
        }
    }

    draw() {
        this.renderer.clear();
        this.renderer.startScene(); // <--- Start Viewport Clip

        // Debug Viewport Sync
        // if (Math.random() > 0.99) console.log(`Draw: EditorMode=${this.editorMode} VP.y=${this.viewport.y}`);

        const level = this.levelManager.getCurrentLevel();
        if (level) {
            this.renderer.drawLevel(this.tileMap);
            this.renderer.drawHazards(level); // Draw Hazards (Sand)

            this.renderer.drawWindParticles();

            if (this.showWindArrows) {
                const windZones = this.levelManager.getWindZones();
                this.renderer.drawDebugArrows(windZones);
            }

            this.renderer.drawTrail(); // Draw trail FIRST
            this.renderer.drawTrail(); // Draw trail FIRST
            this.particles.draw(this.ctx, this.viewport); // Draw particles (Passed Viewport)
            this.renderer.drawBall(this.ball); // Draw ball ON TOP
            this.renderer.drawBall(this.ball); // Draw ball ON TOP

            if (!this.ball.isMoving && this.input.isDragging && !this.editorMode) {
                const velocity = this.input.getLaunchVelocity();
                if (velocity) {
                    if (this.isUsingPrediction) {
                        const trajectory = this.physics.simulateTrajectory(this.ball, velocity, level, this.tileMap);
                        this.renderer.drawAimLine(this.ball, trajectory);
                    } else {
                        this.renderer.drawBasicAimLine(this.ball, velocity);
                    }
                }
            }

            // Debug Overlay (Must be LAST to be visible)
            if (this.debugMode) {
                const windZones = this.levelManager.getWindZones();
                this.renderer.drawDebugZones(windZones);
                this.renderer.drawPhysicsDebug(this.ball, this.tileMap);
            }

            // Editor Overlay
            if (this.editorMode && this.editorSystem) {
                this.editorSystem.draw(this.ctx);
            }
        }

        this.renderer.endScene(); // <--- End Viewport Clip
    }
}
