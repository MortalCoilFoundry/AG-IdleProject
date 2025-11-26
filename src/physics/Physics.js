import { eventBus } from '../core/EventBus.js';

export class Physics {
    constructor() {
        this.frictionGrass = 0.97;
        this.frictionSand = 0.85;
        this.restitution = 0.75;
        this.stopThreshold = 0.05;
    }

    update(ball, level) {
        if (!ball.isMoving) return;

        // Apply Friction
        let friction = this.frictionGrass;
        if (this.isInSand(ball, level)) {
            friction = this.frictionSand;
            eventBus.emit('SAND_ENTER', { x: ball.x, y: ball.y });
        }

        ball.vx *= friction;
        ball.vy *= friction;

        // Update Position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall Collisions
        this.handleWallCollisions(ball, level);

        // Hole Gravity
        this.handleHole(ball, level);

        // Stop Threshold
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < this.stopThreshold) {
            ball.vx = 0;
            ball.vy = 0;
            ball.isMoving = false;
            eventBus.emit('BALL_STOPPED');
        }
    }

    isInSand(ball, level) {
        if (!level.hazards) return false;
        for (const hazard of level.hazards) {
            if (ball.x >= hazard.x && ball.x <= hazard.x + hazard.width &&
                ball.y >= hazard.y && ball.y <= hazard.y + hazard.height) {
                return true;
            }
        }
        return false;
    }

    handleWallCollisions(ball, level) {
        const r = ball.radius;
        let hit = false;

        // Canvas bounds
        if (ball.x - r < 0) { ball.x = r; ball.vx *= -this.restitution; hit = true; }
        if (ball.x + r > 600) { ball.x = 600 - r; ball.vx *= -this.restitution; hit = true; }
        if (ball.y - r < 0) { ball.y = r; ball.vy *= -this.restitution; hit = true; }
        if (ball.y + r > 600) { ball.y = 600 - r; ball.vy *= -this.restitution; hit = true; }

        // Level walls
        if (level.walls) {
            for (const wall of level.walls) {
                const closestX = Math.max(wall.x, Math.min(ball.x, wall.x + wall.width));
                const closestY = Math.max(wall.y, Math.min(ball.y, wall.y + wall.height));

                const dx = ball.x - closestX;
                const dy = ball.y - closestY;
                const distSq = dx * dx + dy * dy;

                if (distSq < r * r && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = r - dist;

                    // Normalize
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Push out
                    ball.x += nx * overlap;
                    ball.y += ny * overlap;

                    // Reflect velocity
                    // v' = v - 2 * (v . n) * n
                    const dot = ball.vx * nx + ball.vy * ny;
                    ball.vx = (ball.vx - 2 * dot * nx) * this.restitution;
                    ball.vy = (ball.vy - 2 * dot * ny) * this.restitution;

                    hit = true;
                }
            }
        }

        if (hit) {
            eventBus.emit('WALL_HIT', { x: ball.x, y: ball.y });
        }
    }

    handleHole(ball, level) {
        if (!level.hole) return;
        const hole = level.hole;
        const dx = hole.x - ball.x;
        const dy = hole.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hole.radius + ball.radius) { // Simple overlap check
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

            // Gravity well effect
            if (speed < 15) { // Only suck if moving reasonably slow
                ball.vx += dx * 0.05;
                ball.vy += dy * 0.05;
            }

            if (dist < 5 && speed < 5) { // Close enough and slow enough
                ball.vx = 0;
                ball.vy = 0;
                ball.isMoving = false;
                eventBus.emit('HOLE_REACHED');
            }
        }
    }
}
