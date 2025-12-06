import { TOOLS } from './EditorTools.js';

export class PointerInput {
    constructor(editorSystem) {
        this.editor = editorSystem;
        this.game = editorSystem.game;
        this.canvas = this.game.canvas;

        // State
        this.activePointers = new Map(); // pointerId -> {x, y}
        this.lastCenter = null; // {x, y} for panning
        this.lastDistance = null; // float for zooming
        this.lastGridPos = null; // {col, row} for painting optimization

        // Bindings
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);

        this.handleWheel = this.handleWheel.bind(this);
        // this.attach(); // REMOVED: Lazy attach controlled by EditorSystem
    }

    attach() {
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointercancel', this.handlePointerUp);
        this.canvas.addEventListener('pointerout', this.handlePointerUp);
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    detach() {
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
        this.canvas.removeEventListener('pointerout', this.handlePointerUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
    }

    handlePointerDown(e) {
        if (!this.game.editorMode) return;
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Reset state on new touch
        this.lastCenter = this.getCenter();
        this.lastDistance = this.getDistance();
        this.lastGridPos = null;

        // Immediate Paint on Touch Start (if 1 finger and not HAND)
        if (this.activePointers.size === 1) {
            this.handleSinglePointerAction(e.clientX, e.clientY);
        }
    }

    handlePointerMove(e) {
        e.preventDefault();
        if (!this.activePointers.has(e.pointerId)) return;

        // Update pointer position
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const pointerCount = this.activePointers.size;

        if (pointerCount === 1) {
            // --- Single Pointer: Pan OR Paint ---
            const current = { x: e.clientX, y: e.clientY };

            if (this.editor.currentTool === TOOLS.HAND) {
                // Pan Logic
                if (this.lastCenter) {
                    const dx = this.lastCenter.x - current.x;
                    const dy = this.lastCenter.y - current.y;

                    // Apply to Viewport (divide by zoom to keep pan speed consistent)
                    const vp = this.game.viewport;
                    vp.pan(dx / vp.zoom, dy / vp.zoom);
                }
                this.lastCenter = current;
            } else {
                // Paint Logic
                this.handleSinglePointerAction(current.x, current.y);
            }

        } else if (pointerCount === 2) {
            // --- Two Pointers: Pan AND Zoom ---
            const newCenter = this.getCenter();
            const newDistance = this.getDistance();

            if (this.lastCenter && newCenter) {
                // Pan
                const dx = this.lastCenter.x - newCenter.x;
                const dy = this.lastCenter.y - newCenter.y;
                const vp = this.game.viewport;
                vp.pan(dx / vp.zoom, dy / vp.zoom);
            }

            if (this.lastDistance && newDistance) {
                // Zoom
                const zoomFactor = newDistance / this.lastDistance;
                const vp = this.game.viewport;
                vp.setZoom(vp.zoom * zoomFactor);
            }

            this.lastCenter = newCenter;
            this.lastDistance = newDistance;
        }
    }

    handlePointerUp(e) {
        e.preventDefault();
        this.canvas.releasePointerCapture(e.pointerId);
        this.activePointers.delete(e.pointerId);

        // Reset state when pointers change
        if (this.activePointers.size > 0) {
            this.lastCenter = this.getCenter();
            this.lastDistance = this.getDistance();
        } else {
            this.lastCenter = null;
            this.lastDistance = null;
            this.lastGridPos = null;
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const vp = this.game.viewport;
        const newZoom = vp.zoom - (e.deltaY * zoomSpeed * vp.zoom);
        vp.setZoom(newZoom);
    }

    // --- Helpers ---

    getCenter() {
        if (this.activePointers.size === 0) return null;
        let x = 0, y = 0;
        for (let p of this.activePointers.values()) {
            x += p.x;
            y += p.y;
        }
        return {
            x: x / this.activePointers.size,
            y: y / this.activePointers.size
        };
    }

    getDistance() {
        if (this.activePointers.size < 2) return null;
        const points = Array.from(this.activePointers.values());
        const p1 = points[0];
        const p2 = points[1];
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }

    handleSinglePointerAction(screenX, screenY) {
        // If tool is HAND, we do nothing here (handled in move for panning)
        if (this.editor.currentTool === TOOLS.HAND) return;

        // Convert Screen -> Grid
        const vp = this.game.viewport;
        // We need to account for the canvas bounding rect since clientX/Y are global
        const rect = this.canvas.getBoundingClientRect();

        // Scale mouse coordinates to match canvas logical resolution
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const canvasX = (screenX - rect.left) * scaleX;
        const canvasY = (screenY - rect.top) * scaleY;

        // Apply Renderer Viewport Offset (30, 60)
        // The Viewport class expects coordinates relative to the visible viewport (0-540),
        // not the entire canvas (0-600).
        const viewX = canvasX - this.game.renderer.VIEWPORT_X;
        const viewY = canvasY - this.game.renderer.VIEWPORT_Y;

        const gridPos = vp.screenToGrid(viewX, viewY);
        const col = Math.floor(gridPos.col);
        const row = Math.floor(gridPos.row);

        // Debug Logging
        console.log("--- Click Debug ---");
        console.log("Raw Mouse:", screenX, screenY);
        console.log("Rect:", rect.left, rect.top, rect.width, rect.height);
        console.log("Canvas Logical:", this.canvas.width, this.canvas.height);
        console.log("Scale:", scaleX, scaleY);
        console.log("Canvas Pos:", canvasX, canvasY);
        console.log("Viewport:", vp.x, vp.y, vp.zoom);
        console.log("Grid Pos:", gridPos.col, gridPos.row);
        console.log("Final Tile:", col, row);

        // Optimization: Don't repaint the same tile in the same stroke
        if (this.lastGridPos && this.lastGridPos.col === col && this.lastGridPos.row === row) {
            return;
        }

        this.paintTile(col, row);
        this.lastGridPos = { col, row };
    }

    paintTile(col, row) {
        const tool = this.editor.currentTool;
        const tileMap = this.game.tileMap;

        if (tool === TOOLS.WALL) {
            tileMap.setTile(col, row, 'WALL');
        } else if (tool === TOOLS.SAND) {
            tileMap.setTile(col, row, 'SAND');
        } else if (tool === TOOLS.ERASER) {
            tileMap.setTile(col, row, null);
            // Also remove slopes/holes if they exist there
            // TODO: Clean up level.slopes if erasing a slope
        } else if (tool === TOOLS.START) {
            this.editor.handleStartTool(col, row);
        } else if (tool === TOOLS.HOLE) {
            this.editor.handleHoleTool(col, row);
        } else if (tool === TOOLS.SLOPE) {
            this.editor.handleSlopeTool(col, row);
        }
    }

    reset() {
        this.activePointers.clear();
        this.lastCenter = null;
        this.lastDistance = null;
        this.lastGridPos = null;
    }
}
