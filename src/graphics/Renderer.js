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

    drawAimLine(ball, dragVector) {
        if (!dragVector) return;

        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(ball.x, ball.y);
        // Draw line opposite to drag
        this.ctx.lineTo(ball.x - dragVector.x, ball.y - dragVector.y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
        this.ctx.restore(); // Restore from clear() translate
    }
}
