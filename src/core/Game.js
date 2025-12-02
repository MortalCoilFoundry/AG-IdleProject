import { eventBus } from './EventBus.js';
import { Physics } from '../physics/Physics.js';
import { Renderer } from '../graphics/Renderer.js';
import { Input } from '../input/Input.js';
import { LevelManager } from '../levels/LevelManager.js';
import { AudioController } from '../audio/Audio.js';
import { ParticleSystem } from '../graphics/Particles.js';

export class Game {
    constructor() {
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
        this.renderer = new Renderer(this.ctx);
        this.levelManager = new LevelManager();
        this.audio = new AudioController();
        this.particles = new ParticleSystem();

        this.ball = {
            x: 0, y: 0,
            vx: 0, vy: 0,
            radius: 5,
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

    init() {
        this.loadLevel();

        this.input = new Input(this.canvas, this.ball);

        eventBus.on('STROKE_TAKEN', () => {
            this.strokes++;
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
            if (e.key === 'd') this.debugMode = !this.debugMode;
            if (e.key === 'w') this.showWindArrows = !this.showWindArrows;
        });

        // Debug Level Select
        const levelSelect = document.getElementById('level-select');
        console.log("Debug: levelSelect found?", levelSelect);
        console.log("Debug: Levels available:", this.levelManager.levels.length);

        if (levelSelect) {
            this.levelManager.levels.forEach((level, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.text = `Level ${index + 1}`;
                levelSelect.appendChild(option);
            });

            levelSelect.addEventListener('change', (e) => {
                this.levelManager.currentLevelIndex = parseInt(e.target.value);
                this.renderer.resetWindEmitters();
                this.audio.setWind([]);
                this.loadLevel();
                // Remove focus so keyboard controls still work
                e.target.blur();
            });
        }

        // Resume Audio Context on first interaction
        const resumeAudio = () => {
            this.audio.resume();
            window.removeEventListener('mousedown', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('mousedown', resumeAudio);
        window.addEventListener('keydown', resumeAudio);

        this.start();
    }

    loadLevel() {
        const level = this.levelManager.getCurrentLevel();
        if (!level) {
            this.showEndScreen();
            return;
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
            this.uiPar.textContent = level.par;
            this.uiStrokes.textContent = this.strokes;
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


        eventBus.on('HOLE_REACHED', () => {
            this.audio.playHole();
            this.particles.emit(this.ball.x, this.ball.y, '#306230', 20, 3); // Dark burst on hole
            setTimeout(() => {
                this.nextLevel();
            }, 2000);
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
            if (e.key === 'd') this.debugMode = !this.debugMode;
            if (e.key === 'w') this.showWindArrows = !this.showWindArrows;
        });

        // Debug Level Select
        const levelSelect = document.getElementById('level-select');
        console.log("Debug: levelSelect found?", levelSelect);
        console.log("Debug: Levels available:", this.levelManager.levels.length);

        if (levelSelect) {
            this.levelManager.levels.forEach((level, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.text = `Level ${index + 1}`;
                levelSelect.appendChild(option);
            });

            levelSelect.addEventListener('change', (e) => {
                this.levelManager.currentLevelIndex = parseInt(e.target.value);
                this.renderer.resetWindEmitters();
                this.audio.setWind([]);
                this.loadLevel();
                // Remove focus so keyboard controls still work
                e.target.blur();
            });
        }

        // Resume Audio Context on first interaction
        const resumeAudio = () => {
            this.audio.resume();
            window.removeEventListener('mousedown', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
        };
        window.addEventListener('mousedown', resumeAudio);
        window.addEventListener('keydown', resumeAudio);

        this.start();
    }

    loadLevel() {
        const level = this.levelManager.getCurrentLevel();
        if (!level) {
            this.showEndScreen();
            return;
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
            this.uiPar.textContent = level.par;
            this.uiStrokes.textContent = this.strokes;
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

            this.physics.update(this.ball, level);
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
        }
    }

    draw() {
        this.renderer.clear();
        this.renderer.startScene(); // <--- Start Viewport Clip

        const level = this.levelManager.getCurrentLevel();
        if (level) {
            this.renderer.drawLevel(level);
            this.renderer.drawWindParticles();

            if (this.showWindArrows) {
                const windZones = this.levelManager.getWindZones();
                this.renderer.drawDebugArrows(windZones);
            }
            if (this.debugMode) {
                const windZones = this.levelManager.getWindZones();
                this.renderer.drawDebugZones(windZones);
            }

            this.renderer.drawTrail(); // Draw trail FIRST
            this.particles.draw(this.ctx); // Draw particles
            this.renderer.drawBall(this.ball); // Draw ball ON TOP

            if (!this.ball.isMoving && this.input.isDragging) {
                const trajectory = this.input.getAimPreview(level);
                this.renderer.drawAimLine(this.ball, trajectory);
            }
        }

        this.renderer.endScene(); // <--- End Viewport Clip

    }
}
