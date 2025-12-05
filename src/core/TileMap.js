export class TileMap {
    constructor(width = 10, height = 10) {
        this.TILE_SIZE = 60;
        this.width = width;
        this.height = height;
        this.tiles = new Map(); // Key: "col_row", Value: EntityType (string)

        // Bounds tracking (optional, but good for rendering optimization later)
        this.minCol = 0;
        this.maxCol = 0;
        this.minRow = 0;
        this.maxRow = 0;
    }

    _getKey(col, row) {
        return `${col}_${row}`;
    }

    getTile(col, row) {
        return this.tiles.get(this._getKey(col, row)) || null;
    }

    setTile(col, row, type) {
        const key = this._getKey(col, row);
        if (type === null) {
            this.tiles.delete(key);
        } else {
            this.tiles.set(key, type);

            // Update bounds (basic implementation)
            this.minCol = Math.min(this.minCol, col);
            this.maxCol = Math.max(this.maxCol, col);
            this.minRow = Math.min(this.minRow, row);
            this.maxRow = Math.max(this.maxRow, row);
        }
    }

    isOutOfBounds(col, row) {
        // For an infinite map, technically nothing is out of bounds unless we enforce limits.
        // For now, we can just check if it's within the currently populated area + padding if needed.
        // Or simply return false as it's "Infinite Green".
        return false;
    }

    // Helper to clear the map
    clear() {
        this.tiles.clear();
        this.minCol = 0;
        this.maxCol = 0;
        this.minRow = 0;
        this.maxRow = 0;
    }
}
