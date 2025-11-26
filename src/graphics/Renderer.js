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
