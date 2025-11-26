import { eventBus } from '../core/EventBus.js';

export class Input {
    constructor(canvas, ball) {
        this.canvas = canvas;
        this.ball = ball;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.maxPower = 150; // Max drag distance
        this.powerScale = 0.15; // Multiplier for velocity

        this.setupListeners();
    }

    setupListeners() {
        this.canvas.addEventListener('mousedown', this.onStart.bind(this));
        this.canvas.addEventListener('mousemove', this.onMove.bind(this));
        window.addEventListener('mouseup', this.onEnd.bind(this));

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            this.onStart(e.touches[0]);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onMove(e.touches[0]);
        }, { passive: false });
        window.addEventListener('touchend', this.onEnd.bind(this));
    }

    onStart(e) {
        if (this.ball.isMoving) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicking near ball (allow some tolerance)
        const dx = x - this.ball.x;
        const dy = y - this.ball.y;
        if (dx * dx + dy * dy < 2500) { // 50px radius tolerance
            this.isDragging = true;
            this.dragStart = { x: this.ball.x, y: this.ball.y };
            this.dragCurrent = { x: this.ball.x, y: this.ball.y };
        }
    }

    onMove(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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
}
