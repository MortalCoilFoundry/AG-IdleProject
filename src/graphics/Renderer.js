export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.colors = {
            darkest: '#0f380f',
            dark: '#306230',
            light: '#8bac0f',
            lightest: '#9bbc0f'
        };
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDuration = 0;
    }

    shake(intensity) {
        this.shakeDuration = intensity;
    }

    updateShake() {
        if (this.shakeDuration > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeDuration;
            this.shakeY = (Math.random() - 0.5) * this.shakeDuration;
            this.shakeDuration *= 0.9;
            if (this.shakeDuration < 0.5) {
                this.shakeDuration = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }
    }

    clear() {
        this.updateShake();
        this.ctx.save();
        this.ctx.translate(this.shakeX, this.shakeY);

        this.ctx.fillStyle = this.colors.light;
        this.ctx.fillRect(-10, -10, 620, 620); // Oversize to cover shake
    }

    drawLevel(level) {
        // Draw Hazards (Sand)
        this.ctx.fillStyle = this.colors.dark;
        if (level.hazards) {
            for (const hazard of level.hazards) {
                this.ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
            }
        }

        // Draw Entities (Wind, Boosts, Switches, etc.)
        this.drawEntities(level);

        // Draw Walls
        this.ctx.fillStyle = this.colors.darkest;
        if (level.walls) {
            for (const wall of level.walls) {
                this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            }
        }

        // Draw Hole
        if (level.hole) {
            this.ctx.fillStyle = this.colors.darkest;
            this.ctx.beginPath();
            this.ctx.arc(level.hole.x, level.hole.y, level.hole.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawEntities(level) {
        if (!level.entities) return;
        for (const entity of level.entities) {
            switch (entity.type) {
                case 'wind': this.drawWind(entity); break;
                case 'mover': this.drawMover(entity); break;
                case 'boost': this.drawBoost(entity); break;
                case 'switch': this.drawSwitch(entity); break;
                case 'gate': this.drawGate(entity); break;
            }
        }
    }

    drawWind(entity) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(139, 172, 15, 0.3)'; // Light transparent
        this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);

        // Draw simple arrows
        this.ctx.strokeStyle = this.colors.lightest;
        this.ctx.lineWidth = 2;
        const centerX = entity.x + entity.width / 2;
        const centerY = entity.y + entity.height / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX + entity.vx * 10, centerY + entity.vy * 10);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawMover(entity) {
        this.ctx.fillStyle = this.colors.darkest;
        this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
    }

    drawBoost(entity) {
        this.ctx.fillStyle = entity.cooldown ? this.colors.dark : this.colors.lightest;
        this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);

        // Chevron
        if (!entity.cooldown) {
            this.ctx.strokeStyle = this.colors.darkest;
            this.ctx.beginPath();
            this.ctx.moveTo(entity.x + 5, entity.y + entity.height / 2);
            this.ctx.lineTo(entity.x + entity.width / 2, entity.y + 5);
            this.ctx.lineTo(entity.x + entity.width - 5, entity.y + entity.height / 2);
            this.ctx.stroke();
        }
    }

    drawSwitch(entity) {
        this.ctx.fillStyle = entity.active ? this.colors.lightest : this.colors.dark;
        this.ctx.beginPath();
        this.ctx.arc(entity.x, entity.y, entity.radius || 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.stroke();
    }

    drawGate(entity) {
        if (entity.open) {
            this.ctx.strokeStyle = this.colors.dark;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);
            this.ctx.setLineDash([]);
        } else {
            this.ctx.fillStyle = this.colors.darkest;
            this.ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
            // Lock icon or X
            this.ctx.strokeStyle = this.colors.light;
            this.ctx.beginPath();
            this.ctx.moveTo(entity.x, entity.y);
            this.ctx.lineTo(entity.x + entity.width, entity.y + entity.height);
            this.ctx.moveTo(entity.x + entity.width, entity.y);
            this.ctx.lineTo(entity.x, entity.y + entity.height);
            this.ctx.stroke();
        }
    }

    drawBall(ball) {
        this.ctx.fillStyle = this.colors.lightest;
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Outline
        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawAimLine(ball, trajectory) {
        if (!trajectory || trajectory.length < 2) return;

        this.ctx.strokeStyle = this.colors.lightest;
        this.ctx.setLineDash([3, 3]);
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(trajectory[0].x, trajectory[0].y);
        for (let i = 1; i < trajectory.length; i++) {
            this.ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        this.ctx.stroke();

        this.ctx.setLineDash([]);
    }

    initWindEmitters(zones) {
        this.windZones = zones.map(z => ({
            ...z,
            emitTimer: 0,
            maxParticles: z.strength * 5
        }));
        this.activeWindParticles = {};
        zones.forEach(z => this.activeWindParticles[z.id] = 0);
        this.windParticles = [];
    }

    resetWindEmitters() {
        this.windZones = [];
        this.activeWindParticles = {};
        this.windParticles = [];
    }

    updateWindEmitters(dt) {
        if (!this.windZones) return;

        // Spawn new particles
        for (const z of this.windZones) {
            z.emitTimer += dt;
            // Limit active particles per zone to avoid overcrowding
            if (this.activeWindParticles[z.id] < z.maxParticles && z.emitTimer > 0.1 / z.strength) {
                z.emitTimer = 0;
                this.activeWindParticles[z.id]++;

                // Random position within zone
                const x = z.zone.x + Math.random() * z.zone.width;
                const y = z.zone.y + Math.random() * z.zone.height;

                this.windParticles.push({
                    x: x,
                    y: y,
                    vx: z.vector[0] * 50, // Base speed
                    vy: z.vector[1] * 50,
                    life: 0,
                    maxLife: 1.0 + Math.random() * 0.5,
                    zoneId: z.id,
                    swirlPhase: Math.random() * Math.PI * 2,
                    trail: [] // For trail drawing
                });
            }
        }

        // Update existing particles
        const time = performance.now() * 0.003;
        for (let i = this.windParticles.length - 1; i >= 0; i--) {
            const p = this.windParticles[i];
            p.life += dt;

            // Swirl effect
            const swirlX = Math.sin(time + p.swirlPhase) * 10;
            const swirlY = Math.cos(time + p.swirlPhase) * 10;

            p.x += (p.vx + swirlX) * dt;
            p.y += (p.vy + swirlY) * dt;

            // Update trail
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 5) p.trail.shift();

            if (p.life >= p.maxLife) {
                if (this.activeWindParticles[p.zoneId]) this.activeWindParticles[p.zoneId]--;
                this.windParticles.splice(i, 1);
            }
        }
    }

    drawWindParticles() {
        if (!this.windParticles) return;

        this.ctx.save();
        for (const p of this.windParticles) {
            const alpha = 1 - (p.life / p.maxLife);
            this.ctx.globalAlpha = alpha;

            // Draw Trail
            if (p.trail.length > 1) {
                this.ctx.strokeStyle = this.colors.lightest;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                this.ctx.stroke();
            }

            // Draw Head
            this.ctx.fillStyle = this.colors.lightest;
            this.ctx.fillRect(p.x, p.y, 2, 2);
        }
        this.ctx.restore();
    }

    drawDebugArrows(zones) {
        this.ctx.save();
        for (const z of zones) {
            const centerX = z.zone.x + z.zone.width / 2;
            const centerY = z.zone.y + z.zone.height / 2;
            const angle = Math.atan2(z.vector[1], z.vector[0]);

            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(angle);

            // Chevron
            this.ctx.fillStyle = this.colors.dark;
            this.ctx.fillRect(-3, -2, 6, 4); // Background

            this.ctx.strokeStyle = this.colors.lightest;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(-2, -2);
            this.ctx.lineTo(2, 0);
            this.ctx.lineTo(-2, 2);
            this.ctx.stroke();

            this.ctx.rotate(-angle);
            this.ctx.translate(-centerX, -centerY);
        }
        this.ctx.restore();
    }

    drawDebugZones(zones) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        for (const z of zones) {
            this.ctx.strokeRect(z.zone.x, z.zone.y, z.zone.width, z.zone.height);
        }
        this.ctx.restore();
    }

    endFrame() {
        this.ctx.restore();
    }
}
