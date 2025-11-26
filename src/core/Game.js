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

        this.strokes = 0;
        this.updateUI();
    }

    nextLevel() {
        this.totalStrokes += this.strokes;
        this.totalPar += this.levelManager.getCurrentLevel().par;

        const next = this.levelManager.nextLevel();
        if (next) {
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
            this.physics.update(this.ball, level);
            this.particles.update();
        }
    }

    draw() {
        this.renderer.clear();

        const level = this.levelManager.getCurrentLevel();
        if (level) {
            this.renderer.drawLevel(level);
            this.particles.draw(this.ctx); // Draw particles below ball
            this.renderer.drawBall(this.ball);

            if (!this.ball.isMoving && this.input.isDragging) {
                const drag = this.input.getDragVector();
                this.renderer.drawAimLine(this.ball, drag);
            }
        }
    }
}
