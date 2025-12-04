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

        // 1. Accumulate External Forces (Slope + Wind)
        let forceX = 0;
        let forceY = 0;

        // Apply Wind (Add to force, don't modify velocity directly yet)
        const WIND_SCALAR = 0.03; // Only apply 3% of the force per frame

        if (level.entities) {
            for (const entity of level.entities) {
                if (entity.type === 'wind') {
                    if (ball.x >= entity.x && ball.x <= entity.x + entity.width &&
                        ball.y >= entity.y && ball.y <= entity.y + entity.height) {
                        forceX += entity.vx * WIND_SCALAR;
                        forceY += entity.vy * WIND_SCALAR;
                    }
                }
            }
        }

        // Apply Slopes (Add to force)
        if (level.slopes) {
            for (const slope of level.slopes) {
                if (ball.x >= slope.x && ball.x <= slope.x + slope.width &&
                    ball.y >= slope.y && ball.y <= slope.y + slope.height) {
                    forceX += slope.vx;
                    forceY += slope.vy;
                }
            }
        }

        // 2. Apply Acceleration
        ball.vx += forceX;
        ball.vy += forceY;

        // 3. Apply Linear Friction (The "Brake")
        let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        let friction = 0.03; // Base Grass Friction

        // Check Hazard State
        if (this.isInSand(ball, level)) {
            friction = 0.15;
            eventBus.emit('SAND_ENTER', { x: ball.x, y: ball.y });
        }

        if (speed > 0) {
            // Linear Subtraction: Reduce speed by a fixed amount per frame
            let newSpeed = Math.max(0, speed - friction);

            // Re-scale the vector
            let scale = newSpeed / speed;
            ball.vx *= scale;
            ball.vy *= scale;

            // Update speed for next check
            speed = newSpeed;
        }

        // 4. Static Friction Check (The "Stick")
        // If we are barely moving and the external force is weak, stop completely.
        let totalForce = Math.sqrt(forceX * forceX + forceY * forceY);

        // Check if we are in a gravity well (Hole) - Don't stick if falling in!
        let inGravityWell = false;
        if (level.hole) {
            const dx = level.hole.x - ball.x;
            const dy = level.hole.y - ball.y;
            if (Math.sqrt(dx * dx + dy * dy) < level.hole.radius + ball.radius + 10) {
                inGravityWell = true;
            }
        }

        if (speed < 0.1 && totalForce < 0.08 && !inGravityWell) {
            ball.vx = 0;
            ball.vy = 0;

            if (ball.isMoving) {
                ball.isMoving = false;
                eventBus.emit('BALL_STOPPED', { x: ball.x, y: ball.y });
            }
        }

        // Update Position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall Collisions
        this.handleWallCollisions(ball, level);

        // Moving Obstacles
        this.resolveMovingCollisions(ball, level);

        // Boost Pads
        this.checkBoosts(ball, level);

        // Switches
        this.checkSwitches(ball, level);

        // Hole Gravity
        this.handleHole(ball, level);

        // 5. Global Stop Check (The Fix)
        // Ensure ball stops if it's moving incredibly slowly, regardless of where it is.
        // This prevents soft-locks near the hole where "Static Friction" is skipped.
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (ball.isMoving && currentSpeed < 0.01) {
            ball.vx = 0;
            ball.vy = 0;
            ball.isMoving = false;
            eventBus.emit('BALL_STOPPED', { x: ball.x, y: ball.y });
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





    checkBoosts(ball, level) {
        if (!level.entities) return;
        for (const entity of level.entities) {
            if (entity.type === 'boost' && !entity.cooldown) {
                const dx = ball.x - (entity.x + entity.width / 2);
                const dy = ball.y - (entity.y + entity.height / 2);
                // Simple AABB or Circle check. Let's use AABB for pads.
                if (ball.x >= entity.x && ball.x <= entity.x + entity.width &&
                    ball.y >= entity.y && ball.y <= entity.y + entity.height) {

                    ball.vx *= entity.multiplier || 1.5;
                    ball.vy *= entity.multiplier || 1.5;
                    entity.cooldown = 60; // Frames
                    eventBus.emit('BOOST_ACTIVATED', entity);
                }
            }
        }
    }

    resolveMovingCollisions(ball, level) {
        if (!level.entities) return;
        const r = ball.radius;

        for (const entity of level.entities) {
            if (entity.type === 'mover') {
                // Treat as a moving wall
                const closestX = Math.max(entity.x, Math.min(ball.x, entity.x + entity.width));
                const closestY = Math.max(entity.y, Math.min(ball.y, entity.y + entity.height));

                const dx = ball.x - closestX;
                const dy = ball.y - closestY;
                const distSq = dx * dx + dy * dy;

                if (distSq < r * r && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = r - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    ball.x += nx * overlap;
                    ball.y += ny * overlap;

                    // Reflect
                    const dot = ball.vx * nx + ball.vy * ny;
                    ball.vx = (ball.vx - 2 * dot * nx) * this.restitution;
                    ball.vy = (ball.vy - 2 * dot * ny) * this.restitution;

                    // Transfer some momentum from mover? (Advanced, skip for now)
                    eventBus.emit('WALL_HIT', { x: ball.x, y: ball.y });
                }
            }
        }
    }

    checkSwitches(ball, level) {
        if (!level.entities) return;
        for (const entity of level.entities) {
            if (entity.type === 'switch' && !entity.active) {
                // Circle check for switch
                const dx = ball.x - entity.x;
                const dy = ball.y - entity.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (entity.radius || 10) + ball.radius) {
                    entity.active = true;
                    eventBus.emit('SWITCH_TRIGGERED', entity);
                }
            }
        }
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

        // Gates (treated as walls if closed)
        if (level.entities) {
            for (const entity of level.entities) {
                if (entity.type === 'gate' && !entity.open) {
                    const closestX = Math.max(entity.x, Math.min(ball.x, entity.x + entity.width));
                    const closestY = Math.max(entity.y, Math.min(ball.y, entity.y + entity.height));

                    const dx = ball.x - closestX;
                    const dy = ball.y - closestY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < r * r && distSq > 0) {
                        const dist = Math.sqrt(distSq);
                        const overlap = r - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;

                        ball.x += nx * overlap;
                        ball.y += ny * overlap;

                        const dot = ball.vx * nx + ball.vy * ny;
                        ball.vx = (ball.vx - 2 * dot * nx) * this.restitution;
                        ball.vy = (ball.vy - 2 * dot * ny) * this.restitution;
                        hit = true;
                    }
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

        const HOLE_RADIUS = hole.radius || 12;
        const RIM_THRESHOLD = 15; // Slightly larger than visual hole
        const CAPTURE_SPEED = 3.0;
        const GRAVITY_STRENGTH = 0.5;

        // 1. Ignore Zone
        if (dist >= RIM_THRESHOLD + ball.radius) return;

        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

        // 2. Capture Zone (Success)
        // Must be close and slow enough
        if (dist < 5 && speed < CAPTURE_SPEED) {
            ball.vx = 0;
            ball.vy = 0;
            ball.isMoving = false;
            eventBus.emit('HOLE_REACHED');
            return;
        }

        // 3. Rim Zone (Deflection / Lip-Out)
        // If we are here, we are close (dist < RIM_THRESHOLD) but NOT captured yet.

        // If moving too fast to be captured, deflect!
        if (speed > CAPTURE_SPEED) {
            // Apply Deflection Force (Pull towards center)
            // Normalize vector
            const nx = dx / dist;
            const ny = dy / dist;

            ball.vx += nx * GRAVITY_STRENGTH;
            ball.vy += ny * GRAVITY_STRENGTH;

            // Dampen velocity (Energy loss on rim hit)
            ball.vx *= 0.9;
            ball.vy *= 0.9;

            // Audio/Visual Trigger (Throttled)
            const now = Date.now();
            if (!this.lastRimHitTime || now - this.lastRimHitTime > 200) {
                eventBus.emit('HOLE_LIP', { x: ball.x, y: ball.y, dx: -nx, dy: -ny }); // Pass normal for particles
                this.lastRimHitTime = now;
            }
        } else {
            // If slow enough but not yet in center (dist >= 5), gently pull in
            // This helps the "Capture Zone" check succeed on next frame
            ball.vx += dx * 0.1;
            ball.vy += dy * 0.1;
        }
    }

    simulateTrajectory(startBall, velocity, level) {
        // Clone ball state
        const ball = {
            x: startBall.x,
            y: startBall.y,
            vx: velocity.vx,
            vy: velocity.vy,
            radius: startBall.radius,
            isMoving: true
        };

        const trajectory = [];
        const maxFrames = 180; // 3 seconds at 60fps
        const WIND_SCALAR = 0.03;

        for (let i = 0; i < maxFrames; i++) {
            // 1. Accumulate External Forces (Slope + Wind)
            let forceX = 0;
            let forceY = 0;

            // Apply Wind
            if (level.entities) {
                for (const entity of level.entities) {
                    if (entity.type === 'wind') {
                        if (ball.x >= entity.x && ball.x <= entity.x + entity.width &&
                            ball.y >= entity.y && ball.y <= entity.y + entity.height) {
                            forceX += entity.vx * WIND_SCALAR;
                            forceY += entity.vy * WIND_SCALAR;
                        }
                    }
                }
            }

            // Apply Slopes
            if (level.slopes) {
                for (const slope of level.slopes) {
                    if (ball.x >= slope.x && ball.x <= slope.x + slope.width &&
                        ball.y >= slope.y && ball.y <= slope.y + slope.height) {
                        forceX += slope.vx;
                        forceY += slope.vy;
                    }
                }
            }

            // 2. Apply Acceleration
            ball.vx += forceX;
            ball.vy += forceY;

            // 3. Apply Linear Friction
            let speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            let friction = 0.03; // Base Grass Friction

            // Check Hazard State
            if (this.isInSand(ball, level)) {
                friction = 0.15;
            }

            if (speed > 0) {
                let newSpeed = Math.max(0, speed - friction);
                let scale = newSpeed / speed;
                ball.vx *= scale;
                ball.vy *= scale;
                speed = newSpeed;
            }

            // 4. Static Friction / Stop Check
            let totalForce = Math.sqrt(forceX * forceX + forceY * forceY);
            let inGravityWell = false;
            if (level.hole) {
                const dx = level.hole.x - ball.x;
                const dy = level.hole.y - ball.y;
                if (Math.sqrt(dx * dx + dy * dy) < level.hole.radius + ball.radius + 10) {
                    inGravityWell = true;
                }
            }

            // Stop conditions
            if ((speed < 0.1 && totalForce < 0.08 && !inGravityWell) || speed < 0.01) {
                ball.vx = 0;
                ball.vy = 0;
                ball.isMoving = false;
            }

            // Update Position
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Wall Collisions (Math only)
            const r = ball.radius;
            // Canvas bounds
            if (ball.x - r < 0) { ball.x = r; ball.vx *= -this.restitution; }
            if (ball.x + r > 600) { ball.x = 600 - r; ball.vx *= -this.restitution; }
            if (ball.y - r < 0) { ball.y = r; ball.vy *= -this.restitution; }
            if (ball.y + r > 600) { ball.y = 600 - r; ball.vy *= -this.restitution; }

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
                        const nx = dx / dist;
                        const ny = dy / dist;

                        ball.x += nx * overlap;
                        ball.y += ny * overlap;

                        const dot = ball.vx * nx + ball.vy * ny;
                        ball.vx = (ball.vx - 2 * dot * nx) * this.restitution;
                        ball.vy = (ball.vy - 2 * dot * ny) * this.restitution;
                    }
                }
            }

            // Gates (treated as walls if closed)
            if (level.entities) {
                for (const entity of level.entities) {
                    if (entity.type === 'gate' && !entity.open) {
                        const closestX = Math.max(entity.x, Math.min(ball.x, entity.x + entity.width));
                        const closestY = Math.max(entity.y, Math.min(ball.y, entity.y + entity.height));
                        const dx = ball.x - closestX;
                        const dy = ball.y - closestY;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < r * r && distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const overlap = r - dist;
                            const nx = dx / dist;
                            const ny = dy / dist;

                            ball.x += nx * overlap;
                            ball.y += ny * overlap;

                            const dot = ball.vx * nx + ball.vy * ny;
                            ball.vx = (ball.vx - 2 * dot * nx) * this.restitution;
                            ball.vy = (ball.vy - 2 * dot * ny) * this.restitution;
                        }
                    }
                }
            }

            // Hole Gravity (Simplified)
            if (level.hole) {
                const hole = level.hole;
                const dx = hole.x - ball.x;
                const dy = hole.y - ball.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const RIM_THRESHOLD = 15;
                const CAPTURE_SPEED = 3.0;
                const GRAVITY_STRENGTH = 0.5;

                if (dist < RIM_THRESHOLD + ball.radius) {
                    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    if (dist < 5 && currentSpeed < CAPTURE_SPEED) {
                        // Captured
                        ball.vx = 0;
                        ball.vy = 0;
                        ball.isMoving = false;
                        trajectory.push({ x: ball.x, y: ball.y }); // Ensure final point is added
                        break; // Stop simulation
                    } else if (currentSpeed > CAPTURE_SPEED) {
                        // Deflect
                        const nx = dx / dist;
                        const ny = dy / dist;
                        ball.vx += nx * GRAVITY_STRENGTH;
                        ball.vy += ny * GRAVITY_STRENGTH;
                        ball.vx *= 0.9;
                        ball.vy *= 0.9;
                    } else {
                        // Pull in
                        ball.vx += dx * 0.1;
                        ball.vy += dy * 0.1;
                    }
                }
            }

            // Sample position every 4th frame
            if (i % 4 === 0) {
                trajectory.push({ x: ball.x, y: ball.y });
            }

            if (!ball.isMoving) {
                trajectory.push({ x: ball.x, y: ball.y }); // Ensure final point is added
                break;
            }
        }

        return trajectory;
    }
}
