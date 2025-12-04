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

    draw(ctx) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.globalAlpha = 1.0;
        }
    }
}
