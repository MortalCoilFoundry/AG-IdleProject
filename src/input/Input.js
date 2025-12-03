import { eventBus } from '../core/EventBus.js';

export class Input {
    constructor(canvas, ball, audioController) {
        this.canvas = canvas;
        this.ball = ball;
        this.audioController = audioController;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.maxPower = 150; // Max drag distance
        this.powerScale = 0.15; // Multiplier for velocity

        this.cameraX = 0;
        this.cameraY = 0;

        this.setupListeners();
    }

    setCamera(x, y) {
        this.cameraX = x;
        this.cameraY = y;
    }

    setupListeners() {
        // Listen on window to catch clicks on ribbons/margins
        window.addEventListener('mousedown', this.onStart.bind(this));
        window.addEventListener('mousemove', this.onMove.bind(this));
        window.addEventListener('mouseup', this.onEnd.bind(this));

        window.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault(); // Prevent scrolling unless hitting a button
            }
            this.onStart(e.touches[0], e);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onMove(e.touches[0]);
        }, { passive: false });

        window.addEventListener('touchend', this.onEnd.bind(this));
    }

    onStart(e, originalEvent) {
        // Ignore clicks on buttons
        const target = originalEvent ? originalEvent.target : e.target;
        if (target && (target.tagName === 'BUTTON' || target.closest('button'))) return;

        if (this.audioController) {
            this.audioController.resume();
        }

        if (this.ball.isMoving) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        // SUBTRACT VIEWPORT OFFSET (Renderer draws at +30, +60)
        x -= 30;
        y -= 60;

        // ADD CAMERA OFFSET (World is shifted by -cameraX, -cameraY)
        x += this.cameraX;
        y += this.cameraY;

        // Clamp to logical world (0-600)
        x = Math.max(0, Math.min(x, 600));
        y = Math.max(0, Math.min(y, 600));

        // Check if clicking near ball (allow some tolerance)
        const dx = x - this.ball.x;
        const dy = y - this.ball.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 1000) { // ~31px radius
            this.isDragging = true;
            this.dragStart = { x: this.ball.x, y: this.ball.y };
            this.dragCurrent = { x: this.ball.x, y: this.ball.y };
        }
    }

    onMove(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        // SUBTRACT VIEWPORT OFFSET
        x -= 30;
        y -= 60;

        // ADD CAMERA OFFSET
        x += this.cameraX;
        y += this.cameraY;

        // Clamp to logical world 12/03/2025 REMOVED BY USER
        // x = Math.max(0, Math.min(x, 600));
        // y = Math.max(0, Math.min(y, 600));

        this.dragCurrent = { x, y };
    }

    onEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Calculate vector
        let dx = this.dragStart.x - this.dragCurrent.x;
        let dy = this.dragStart.y - this.dragCurrent.y;

        // Clamp magnitude
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.maxPower) {
            const ratio = this.maxPower / dist;
            dx *= ratio;
            dy *= ratio;
        }

        if (dist > 5) { // Minimum pull
            this.ball.vx = dx * this.powerScale;
            this.ball.vy = dy * this.powerScale;
            this.ball.isMoving = true;
            eventBus.emit('STROKE_TAKEN');
        }
    }

    getDragVector() {
        if (!this.isDragging) return null;

        let dx = this.dragStart.x - this.dragCurrent.x;
        let dy = this.dragStart.y - this.dragCurrent.y;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.maxPower) {
            const ratio = this.maxPower / dist;
            dx *= ratio;
            dy *= ratio;
        }

        return { x: dx, y: dy };
    }

    getAimPreview(level) {
        if (!this.isDragging) return [];

        const drag = this.getDragVector();
        if (!drag) return [];

        // Calculate initial velocity based on drag
        const vx = drag.x * this.powerScale;
        const vy = drag.y * this.powerScale;

        return this.simulateTrajectory(this.ball.x, this.ball.y, vx, vy, level);
    }

    simulateTrajectory(startX, startY, startVx, startVy, level) {
        const points = [{ x: startX, y: startY }];
        let x = startX;
        let y = startY;
        let currVx = startVx;
        let currVy = startVy;
        const dt = 0.016; // Simulation step (approx 60fps)
        const maxSteps = 60; // Simulate 1 second ahead
        let bounces = 0;
        const maxBounces = 2;

        for (let i = 0; i < maxSteps; i++) {
            // Apply Friction
            const speed = Math.sqrt(currVx * currVx + currVy * currVy);
            if (speed < 0.1) break;

            // Simplified friction (assuming grass for preview)
            currVx *= 0.97;
            currVy *= 0.97;

            // Apply Wind
            if (level.entities) {
                for (const entity of level.entities) {
                    if (entity.type === 'wind') {
                        if (x >= entity.x && x <= entity.x + entity.width &&
                            y >= entity.y && y <= entity.y + entity.height) {
                            // Match Physics.js exactly: ball.vx += entity.vx
                            // But since we simulate step-by-step, we apply it per step.
                            // Physics.js applies it once per frame.
                            // Our simulation step dt is 0.016 (1 frame).
                            // So we should apply full entity.vx/vy per step.
                            currVx += entity.vx;
                            currVy += entity.vy;
                        }
                    }
                }
            }

            let nextX = x + currVx;
            let nextY = y + currVy;

            // Wall Collisions (Basic AABB)
            let hit = false;
            // Canvas bounds
            if (nextX < 0 || nextX > 600) {
                currVx *= -0.75;
                nextX = Math.max(0, Math.min(600, nextX));
                hit = true;
            }
            if (nextY < 0 || nextY > 600) {
                currVy *= -0.75;
                nextY = Math.max(0, Math.min(600, nextY));
                hit = true;
            }

            // Level walls
            if (level.walls) {
                for (const wall of level.walls) {
                    if (nextX > wall.x && nextX < wall.x + wall.width &&
                        nextY > wall.y && nextY < wall.y + wall.height) {

                        // Determine side of collision (simplified)
                        const prevX = x;
                        const prevY = y;

                        // Check X overlap from previous position
                        const overlapX = prevX > wall.x && prevX < wall.x + wall.width;
                        const overlapY = prevY > wall.y && prevY < wall.y + wall.height;

                        if (overlapY) {
                            currVx *= -0.75;
                            nextX = x; // Revert X
                        } else if (overlapX) {
                            currVy *= -0.75;
                            nextY = y; // Revert Y
                        } else {
                            // Corner hit or fast movement, bounce both
                            currVx *= -0.75;
                            currVy *= -0.75;
                            nextX = x;
                            nextY = y;
                        }
                        hit = true;
                    }
                }
            }

            if (hit) {
                bounces++;
                if (bounces > maxBounces) break;
            }

            x = nextX;
            y = nextY;
            points.push({ x, y });
        }

        return points;
    }
}
