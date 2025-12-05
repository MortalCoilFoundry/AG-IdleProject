export class Viewport {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.x = 0; // World Center X
        this.y = 0; // World Center Y
        this.zoom = 1.0;

        // Default center to 0,0 (or wherever the game starts)
        // For now, let's assume 0,0 is the center of the world
    }

    gridToScreen(col, row) {
        const tileSize = 60 * this.zoom;

        // Calculate world position of the tile (top-left)
        const worldX = col * 60;
        const worldY = row * 60;

        // Apply camera offset (centering the camera)
        // Screen Center = (width/2, height/2)
        // World Point relative to Camera = (worldX - this.x) * zoom

        const screenX = (this.width / 2) + (worldX - this.x) * this.zoom;
        const screenY = (this.height / 2) + (worldY - this.y) * this.zoom;

        return { x: screenX, y: screenY, size: tileSize };
    }

    screenToGrid(screenX, screenY) {
        // Inverse of gridToScreen

        // 1. Remove screen center offset
        const centeredX = screenX - (this.width / 2);
        const centeredY = screenY - (this.height / 2);

        // 2. Remove zoom
        const unzoomedX = centeredX / this.zoom;
        const unzoomedY = centeredY / this.zoom;

        // 3. Add camera position to get world position
        const worldX = unzoomedX + this.x;
        const worldY = unzoomedY + this.y;

        // 4. Convert to grid coordinates (Float)
        const col = worldX / 60;
        const row = worldY / 60;

        return { col, row };
    }

    pan(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    setZoom(scale) {
        this.zoom = Math.max(0.5, Math.min(2.0, scale));
    }

    // Helper to center on a specific grid coordinate
    centerOn(col, row) {
        this.x = col * 60 + 30; // Center of the tile
        this.y = row * 60 + 30;
    }

    worldToScreen(worldX, worldY) {
        return this.gridToScreen(worldX / 60, worldY / 60);
    }
}
