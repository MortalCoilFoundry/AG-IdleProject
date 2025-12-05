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
        // Calculate Top-Left of the Viewport in World Coordinates
        // this.x/y is the Center of the camera
        const viewLeft = this.x - (this.width / 2) / this.zoom;
        const viewTop = this.y - (this.height / 2) / this.zoom;

        // Add Screen Offset (scaled by zoom)
        const worldX = viewLeft + (screenX / this.zoom);
        const worldY = viewTop + (screenY / this.zoom);

        // Debug Log (Throttle this in production!)
        // console.log(`screenToGrid: Screen(${screenX}, ${screenY}) -> World(${worldX}, ${worldY}) | ViewLeft(${viewLeft}) Width(${this.width}) Zoom(${this.zoom})`);

        return { col: worldX / 60, row: worldY / 60 };
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
