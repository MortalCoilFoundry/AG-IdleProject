export class Renderer {
    constructor(ctx, viewport) {
        this.ctx = ctx;
        this.viewport = viewport;

        // ────── CANVAS LAYOUT CONSTANTS (CRITICAL) ──────
        // ────── CANVAS LAYOUT CONSTANTS (CRITICAL) ──────
        this.LOGICAL_WIDTH = 600;   // Your game is designed for 600×600
        this.LOGICAL_HEIGHT = 600;
        this.VIEWPORT_W = 540;   // What the player actually sees
        this.VIEWPORT_H = 540;
        this.VIEWPORT_X = 30;    // (600 - 540) / 2
        this.VIEWPORT_Y = 60;    // Top ribbon height

        // Force canvas resolution to match logical size for 1:1 pixels
        this.ctx.canvas.width = this.LOGICAL_WIDTH;
        this.ctx.canvas.height = this.LOGICAL_HEIGHT;

        this.colors = {
            darkest: '#0f380f',
            dark: '#306230',
            light: '#8bac0f',
            lightest: '#9bbc0f'
        };
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDuration = 0;

        // Trail System
        this.trailParticles = [];
        this.maxTrailParticles = 80; // Increased to 80
        this.trailPoolIndex = 0;
        // Initialize pool
        for (let i = 0; i < this.maxTrailParticles; i++) {
            this.trailParticles.push({
                active: false,
                x: 0, y: 0,
                vx: 0, vy: 0,
                size: 1,
                life: 0,
                maxLife: 0,
                initialSpeed: 0,
                isFlash: false
            });
        }
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
        // Clear to transparent - let DOM ribbons/background show through
        this.ctx.clearRect(0, 0, this.LOGICAL_WIDTH, this.LOGICAL_HEIGHT);

        // Bedrock Fill (The Void)
        // Fill the entire logical canvas with the darkest color
        this.ctx.fillStyle = this.colors.darkest;
        this.ctx.fillRect(0, 0, this.LOGICAL_WIDTH, this.LOGICAL_HEIGHT);
    }

    setCamera(x, y) {
        // Delegate to viewport
        this.viewport.x = x;
        this.viewport.y = y;
    }

    startScene() {
        this.ctx.save();

        // 1. Define Viewport Clip
        this.ctx.beginPath();
        this.ctx.rect(this.VIEWPORT_X, this.VIEWPORT_Y, this.VIEWPORT_W, this.VIEWPORT_H);
        this.ctx.clip();

        // 2. Apply Viewport Offset & Shake
        // We ONLY translate to the viewport position on screen.
        // The Viewport class handles the World -> Screen transform for entities.
        this.ctx.translate(this.VIEWPORT_X + this.shakeX, this.VIEWPORT_Y + this.shakeY);

        // 3. Draw Game Background
        // Since we are now in "Viewport Screen Space" (0,0 is top-left of viewport),
        // we fill the viewport rect.
        this.ctx.fillStyle = this.colors.light;
        this.ctx.fillRect(0, 0, this.VIEWPORT_W, this.VIEWPORT_H);

        // Debug Grid Overlay (if zoom != 1)
        if (this.viewport.zoom !== 1.0) {
            this.drawDebugGrid();
        }
    }

    drawDebugGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 1;

        // Get visible range
        const start = this.viewport.screenToGrid(this.VIEWPORT_X, this.VIEWPORT_Y);
        const end = this.viewport.screenToGrid(this.VIEWPORT_X + this.VIEWPORT_W, this.VIEWPORT_Y + this.VIEWPORT_H);

        const minCol = Math.floor(start.col) - 1;
        const maxCol = Math.ceil(end.col) + 1;
        const minRow = Math.floor(start.row) - 1;
        const maxRow = Math.ceil(end.row) + 1;

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const { x, y, size } = this.viewport.gridToScreen(c, r);
                this.ctx.strokeRect(x, y, size, size);
            }
        }
        this.ctx.restore();
    }

    endScene() {
        this.ctx.restore();
    }

    getScreenRect(entity) {
        const pos = this.viewport.worldToScreen(entity.x, entity.y);
        return {
            x: pos.x,
            y: pos.y,
            w: entity.width * this.viewport.zoom,
            h: entity.height * this.viewport.zoom
        };
    }

    drawLevel(tileMap) {
        if (!tileMap) return;

        // 1. Determine Visible Range
        // We want to iterate only tiles that are potentially on screen.
        // For now, we can iterate all keys in tileMap if it's small, but for "Infinite" we need bounds.
        // Let's iterate the visible bounds + buffer.

        // Note: Viewport.screenToGrid expects screen coordinates relative to the canvas (0-600).
        // Our viewport is at VIEWPORT_X, VIEWPORT_Y.
        const topLeft = this.viewport.screenToGrid(this.VIEWPORT_X, this.VIEWPORT_Y);
        const bottomRight = this.viewport.screenToGrid(this.VIEWPORT_X + this.VIEWPORT_W, this.VIEWPORT_Y + this.VIEWPORT_H);

        const minCol = Math.floor(topLeft.col) - 1;
        const maxCol = Math.ceil(bottomRight.col) + 1;
        const minRow = Math.floor(topLeft.row) - 1;
        const maxRow = Math.ceil(bottomRight.row) + 1;

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const type = tileMap.getTile(c, r);
                if (type) {
                    this.drawTile(c, r, type);
                }
            }
        }
    }

    drawHole(level) {
        if (!level.hole) return;

        const hole = level.hole;
        // Transform World -> Screen (Hole x,y is center)
        const pos = this.viewport.worldToScreen(hole.x, hole.y);
        const radius = (hole.radius || 12) * this.viewport.zoom;

        this.ctx.fillStyle = this.colors.darkest;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawHazards(level) {
        if (!level.hazards) return;

        for (const hazard of level.hazards) {
            const rect = this.getScreenRect(hazard);
            this.ctx.fillStyle = this.colors.dark;
            this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

            // Noise
            this.ctx.save();
            this.ctx.fillStyle = '#0f380f';
            this.ctx.globalAlpha = 0.1;
            // Simple noise pattern based on screen coords to avoid flickering
            // Or just random if we don't mind flickering
            if (Math.random() > 0.5) {
                this.ctx.fillRect(rect.x + rect.w / 2, rect.y + rect.h / 2, 2, 2);
            }
            this.ctx.restore();
        }
    }

    drawTile(col, row, type) {
        const { x, y, size } = this.viewport.gridToScreen(col, row);

        // Round to integer for crisp rendering
        const rx = Math.floor(x);
        const ry = Math.floor(y);
        const rSize = Math.ceil(size); // Ceil to avoid gaps

        switch (type) {
            case 'WALL':
                this.ctx.fillStyle = this.colors.darkest;
                this.ctx.fillRect(rx, ry, rSize, rSize);
                break;
            case 'HOLE':
                // Draw grass bg first
                this.ctx.fillStyle = this.colors.light; // Grass
                this.ctx.fillRect(rx, ry, rSize, rSize);

                this.ctx.fillStyle = this.colors.darkest;
                this.ctx.beginPath();
                this.ctx.arc(rx + rSize / 2, ry + rSize / 2, rSize / 4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'SAND':
                this.ctx.fillStyle = this.colors.dark;
                this.ctx.fillRect(rx, ry, rSize, rSize);
                // Noise
                this.ctx.save();
                this.ctx.fillStyle = '#0f380f';
                this.ctx.globalAlpha = 0.1;
                if (Math.random() > 0.5) { // Static noise for now (flickering), ideally seeded
                    this.ctx.fillRect(rx + rSize / 2, ry + rSize / 2, 2, 2);
                }
                this.ctx.restore();
                break;
            default:
                // Unknown type, maybe just debug rect
                this.ctx.strokeStyle = 'red';
                this.ctx.strokeRect(rx, ry, rSize, rSize);
                break;
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

    drawSlopes(level) {
        if (!level.slopes) return;

        this.ctx.save();
        this.ctx.font = '12px "Press Start 2P"'; // Crisp font size
        this.ctx.fillStyle = this.colors.dark; // #306230
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const gridX = 60;
        const gridY = 30; // Tighter vertical density
        const time = Date.now() / 150; // Animation speed (Slower)

        this.ctx.globalAlpha = 0.6; // Semi-transparent arrows

        for (const slope of level.slopes) {
            // Calculate magnitude
            const magnitude = Math.sqrt(slope.vx * slope.vx + slope.vy * slope.vy);

            // Determine base char
            let baseChar = '';
            if (Math.abs(slope.vx) > Math.abs(slope.vy)) {
                baseChar = slope.vx > 0 ? '>' : '<';
            } else {
                baseChar = slope.vy > 0 ? 'v' : '^';
            }

            // Determine tier string
            let char = baseChar;
            if (magnitude >= 0.15) {
                char = baseChar.repeat(3);
            } else if (magnitude >= 0.08) {
                char = baseChar.repeat(2);
            }

            // Animation Offsets
            const offsetX = (time * slope.vx * 100) % gridX;
            const offsetY = (time * slope.vy * 100) % gridY;

            // Clip to zone (Screen Space)
            const rect = this.getScreenRect(slope);
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(rect.x, rect.y, rect.w, rect.h);
            this.ctx.clip();

            // Render Loop
            // We expand the loop range slightly to ensure coverage during scrolling
            for (let x = -gridX; x < slope.width + gridX; x += gridX) {
                for (let y = -gridY; y < slope.height + gridY; y += gridY) {

                    // Calculate raw position with offset (World Space)
                    let worldDrawX = slope.x + x + offsetX;
                    let worldDrawY = slope.y + y + offsetY;

                    // Transform to Screen Space
                    const screenPos = this.viewport.worldToScreen(worldDrawX, worldDrawY);

                    this.ctx.fillText(char, screenPos.x, screenPos.y);
                }
            }
            this.ctx.restore(); // Remove clip
        }
        this.ctx.globalAlpha = 1.0; // Reset alpha
        this.ctx.restore();
    }

    drawWind(entity) {
        const rect = this.getScreenRect(entity);
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(139, 172, 15, 0.3)'; // Light transparent
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Draw simple arrows
        this.ctx.strokeStyle = this.colors.lightest;
        this.ctx.lineWidth = 2;
        const centerX = rect.x + rect.w / 2;
        const centerY = rect.y + rect.h / 2;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX + entity.vx * 10 * this.viewport.zoom, centerY + entity.vy * 10 * this.viewport.zoom);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawMover(entity) {
        const rect = this.getScreenRect(entity);
        this.ctx.fillStyle = this.colors.darkest;
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    drawBoost(entity) {
        const rect = this.getScreenRect(entity);
        this.ctx.fillStyle = entity.cooldown ? this.colors.dark : this.colors.lightest;
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Chevron
        if (!entity.cooldown) {
            this.ctx.strokeStyle = this.colors.darkest;
            this.ctx.beginPath();
            this.ctx.moveTo(rect.x + 5 * this.viewport.zoom, rect.y + rect.h / 2);
            this.ctx.lineTo(rect.x + rect.w / 2, rect.y + 5 * this.viewport.zoom);
            this.ctx.lineTo(rect.x + rect.w - 5 * this.viewport.zoom, rect.y + rect.h / 2);
            this.ctx.stroke();
        }
    }

    drawSwitch(entity) {
        const pos = this.viewport.worldToScreen(entity.x, entity.y);
        const radius = (entity.radius || 10) * this.viewport.zoom;

        this.ctx.fillStyle = entity.active ? this.colors.lightest : this.colors.dark;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.stroke();
    }

    drawGate(entity) {
        const rect = this.getScreenRect(entity);
        if (entity.open) {
            this.ctx.strokeStyle = this.colors.dark;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            this.ctx.setLineDash([]);
        } else {
            this.ctx.fillStyle = this.colors.darkest;
            this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
            // Lock icon or X
            this.ctx.strokeStyle = this.colors.light;
            this.ctx.beginPath();
            this.ctx.moveTo(rect.x, rect.y);
            this.ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
            this.ctx.moveTo(rect.x + rect.w, rect.y);
            this.ctx.lineTo(rect.x, rect.y + rect.h);
            this.ctx.stroke();
        }
    }

    drawBall(ball) {
        // Transform World -> Screen
        const { x, y, size } = this.viewport.worldToScreen(ball.x, ball.y);
        // Scale radius
        const radius = ball.radius * this.viewport.zoom;

        this.ctx.fillStyle = this.colors.lightest;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Outline
        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawAimLine(ball, trajectory) {
        if (!trajectory || trajectory.length === 0) return;

        // --- Animation Setup ---
        const marchSpeed = 80; // Larger number = slower march
        // Floor the time to get integer steps for the pattern
        const timeOffset = Math.floor(Date.now() / marchSpeed);
        const patternSpacing = 4; // Distance between "active" dots

        // 1. Draw Breadcrumbs (The Path)
        trajectory.forEach((point, index) => {
            // Check if this specific dot is currently "active" in the wave pattern.
            // Subtracting index ensures the wave moves "forward" along the path.
            const isActive = (timeOffset - index) % patternSpacing === 0;

            // Transform point to screen space
            const screenPos = this.viewport.worldToScreen(point.x, point.y);

            if (isActive) {
                // --- ACTIVE STATE (The Flash) ---
                // Draw a solid 4x4 block of the lightest color.
                // This makes it "pop" against the background and the normal dots.
                this.ctx.fillStyle = this.colors.lightest; // #9bbc0f
                this.ctx.fillRect(screenPos.x - 2, screenPos.y - 2, 4, 4);

            } else {
                // --- NORMAL STATE (The Standard Breadcrumb) ---
                // Outline (Darkest)
                this.ctx.fillStyle = this.colors.darkest; // #0f380f
                this.ctx.fillRect(screenPos.x - 2, screenPos.y - 2, 4, 4);

                // Core (Lightest)
                this.ctx.fillStyle = this.colors.lightest; // #9bbc0f
                this.ctx.fillRect(screenPos.x - 1, screenPos.y - 1, 2, 2);
            }
        });

        // 2. Draw Ghost Ball (The Destination)
        const endPoint = trajectory[trajectory.length - 1];
        const screenEnd = this.viewport.worldToScreen(endPoint.x, endPoint.y);

        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = this.colors.lightest;
        this.ctx.beginPath();
        this.ctx.arc(screenEnd.x, screenEnd.y, 6, 0, Math.PI * 2); // Radius 6 (slightly smaller than real ball)
        this.ctx.fill();
        this.ctx.strokeStyle = this.colors.darkest;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawBasicAimLine(ball, velocity) {
        if (!velocity || (velocity.vx === 0 && velocity.vy === 0)) return;

        const scale = 7.0;
        const maxLen = 150;

        let dx = velocity.vx * scale;
        let dy = velocity.vy * scale;

        // Clamp length
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > maxLen) {
            const ratio = maxLen / len;
            dx *= ratio;
            dy *= ratio;
        }

        this.ctx.save();
        this.ctx.strokeStyle = this.colors.lightest;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        this.ctx.beginPath();
        const start = this.viewport.worldToScreen(ball.x, ball.y);
        const end = this.viewport.worldToScreen(ball.x + dx, ball.y + dy);

        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();

        this.ctx.restore();
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
                    vx: z.vector[0] * 100, // Increased speed (was 50)
                    vy: z.vector[1] * 100,
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
            const swirlX = Math.sin(time + p.swirlPhase) * 20; // Increased swirl (was 10)
            const swirlY = Math.cos(time + p.swirlPhase) * 20;

            p.x += (p.vx + swirlX) * dt;
            p.y += (p.vy + swirlY) * dt;

            // Update trail
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift(); // Longer trail (was 5)

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
                const start = this.viewport.worldToScreen(p.trail[0].x, p.trail[0].y);
                this.ctx.moveTo(start.x, start.y);
                for (let i = 1; i < p.trail.length; i++) {
                    const pt = this.viewport.worldToScreen(p.trail[i].x, p.trail[i].y);
                    this.ctx.lineTo(pt.x, pt.y);
                }
                this.ctx.stroke();
            }

            // Draw Head
            const head = this.viewport.worldToScreen(p.x, p.y);
            this.ctx.fillStyle = this.colors.lightest;
            this.ctx.fillRect(head.x, head.y, 3, 3); // Larger size (was 2x2)
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

    // endFrame removed, use endScene instead


    addTrailParticle(x, y, vx, vy, size, isFlash = false) {
        const p = this.trailParticles[this.trailPoolIndex];
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.isFlash = isFlash;

        if (isFlash) {
            p.life = 0.15; // Slightly longer flash
            p.maxLife = 0.15;
        } else {
            p.life = 0.75; // 45 frames @ 60fps
            p.maxLife = 0.75;
        }

        this.trailPoolIndex = (this.trailPoolIndex + 1) % this.maxTrailParticles;
    }

    updateTrailParticles(dt) {
        for (const p of this.trailParticles) {
            if (!p.active) continue;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.life <= 0) {
                p.active = false;
            }
        }
    }

    drawTrail() {
        this.ctx.save();

        // Helper to get alpha based on life curve
        // Full 1.0 for first 0.3s, then linear fade
        const getAlpha = (p) => {
            if (p.isFlash) return p.life / p.maxLife;

            // 0.75s total. 0.3s hold.
            // If life > (0.75 - 0.3) = 0.45, alpha is 1.
            // Else, alpha is life / 0.45
            if (p.life > 0.45) return 1.0;
            return p.life / 0.45;
        };

        // Pass 1: Bright Glow (Inner)
        // Size * 4.0, Alpha 0.5, Color #9bbc0f
        this.ctx.fillStyle = this.colors.lightest; // #9bbc0f
        for (const p of this.trailParticles) {
            if (!p.active) continue;
            const baseAlpha = getAlpha(p);
            this.ctx.globalAlpha = baseAlpha * 0.5;
            const size = p.isFlash ? p.size * 2.0 : p.size * 4.0;
            const screenPos = this.viewport.worldToScreen(p.x, p.y);
            this.ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);
        }

        // Pass 2: Soft Bloom (Outer)
        // Size * 6.0, Alpha 0.2, Color #9bbc0f
        for (const p of this.trailParticles) {
            if (!p.active) continue;
            const baseAlpha = getAlpha(p);
            this.ctx.globalAlpha = baseAlpha * 0.2;
            const size = p.isFlash ? p.size * 3.0 : p.size * 6.0;
            const screenPos = this.viewport.worldToScreen(p.x, p.y);
            this.ctx.fillRect(screenPos.x - size / 2, screenPos.y - size / 2, size, size);
        }

        // Pass 3: Core (The Soul)
        // Color #306230 (Dark Green) ALWAYS
        for (const p of this.trailParticles) {
            if (!p.active) continue;
            this.ctx.globalAlpha = getAlpha(p);

            if (p.isFlash) {
                // Flash core is also dark for that "spark" look
                this.ctx.fillStyle = this.colors.dark; // #306230
            } else {
                this.ctx.fillStyle = this.colors.dark; // #306230
            }

            const screenPos = this.viewport.worldToScreen(p.x, p.y);
            this.ctx.fillRect(screenPos.x - p.size / 2, screenPos.y - p.size / 2, p.size, p.size);
        }

        this.ctx.restore();
    }

    drawPhysicsDebug(ball, tileMap) {
        this.ctx.save();
        this.ctx.lineWidth = 1;

        // 1. Draw Ball Body (Blue Circle)
        const screenBall = this.viewport.worldToScreen(ball.x, ball.y);
        this.ctx.strokeStyle = 'blue';
        this.ctx.beginPath();
        this.ctx.arc(screenBall.x, screenBall.y, ball.radius * this.viewport.zoom, 0, Math.PI * 2);
        this.ctx.stroke();

        // 2. Draw Wall Colliders (Red Rects)
        if (tileMap) {
            const col = Math.floor(ball.x / 60);
            const row = Math.floor(ball.y / 60);

            this.ctx.strokeStyle = 'red';

            // Check 3x3 neighborhood
            for (let c = col - 1; c <= col + 1; c++) {
                for (let r = row - 1; r <= row + 1; r++) {
                    const tile = tileMap.getTile(c, r);
                    if (tile === 'WALL') {
                        // Wall is at c*60, r*60
                        // We need to transform the top-left corner
                        const screenWall = this.viewport.worldToScreen(c * 60, r * 60);
                        const size = 60 * this.viewport.zoom;
                        this.ctx.strokeRect(screenWall.x, screenWall.y, size, size);
                    }
                }
            }
        }
        this.ctx.restore();
    }
}
