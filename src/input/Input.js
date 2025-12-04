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

    getLaunchVelocity() {
        if (!this.isDragging) return null;

        const drag = this.getDragVector();
        if (!drag) return null;

        return {
            vx: drag.x * this.powerScale,
            vy: drag.y * this.powerScale
        };
    }
}
