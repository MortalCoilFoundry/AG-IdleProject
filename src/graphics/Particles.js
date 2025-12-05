import { eventBus } from '../core/EventBus.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];

        eventBus.on('BALL_STOPPED', (data) => {
            if (data && data.x !== undefined && data.y !== undefined) {
                // Emit "Puff" - 4-5 small dark green particles at the ball's base
                this.emit(data.x, data.y, '#306230', 5, 1.5);
            }
        });
    }

    emit(x, y, color, count = 5, speed = 2) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                life: 1.0,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, viewport) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;

            // Transform World -> Screen
            // Default to raw coordinates if viewport is missing (fallback)
            let x = p.x;
            let y = p.y;
            let size = p.size;

            if (viewport) {
                const screenPos = viewport.worldToScreen(p.x, p.y);
                x = screenPos.x;
                y = screenPos.y;
                size = p.size * viewport.zoom;
            }

            ctx.fillRect(x, y, size, size);
            ctx.globalAlpha = 1.0;
        }
    }
}
