export class LevelSerializer {

    // Convert Editor Level -> Compressed JSON -> Base64 String
    // Now accepts: tileMap (Grid), entities (Array), metadata (Object: wind, par, etc)
    static serialize(tileMap, entities, metadata = {}) {
        // 1. Minify Data Structure
        const minified = {
            w: [], // Walls: array of [col, row]
            h: [], // Hazards (Sand): array of [col, row]
            s: [], // Slopes: array of [x, y, vx, vy]
            e: [], // Entities: array of {t: type, x, y, ...params}
            g: null, // Goal/Hole: [x, y]
            st: null, // Start: [x, y]
            wi: null, // Wind: {a: angle, s: speed}
            p: 3 // Par
        };

        // Helper to grid-snap
        const toGrid = (val) => Math.round(val / 60);

        // --- A. Serialize TileMap (Static Geometry) ---
        // Iterate the sparse map
        for (const [key, type] of tileMap.tiles) {
            const [colStr, rowStr] = key.split('_');
            const col = parseInt(colStr);
            const row = parseInt(rowStr);

            if (type === 'WALL') {
                minified.w.push([col, row]);
            } else if (type === 'SAND') {
                minified.h.push([col, row]);
            } else if (type === 'HOLE') {
                // For the hole, we store the center point in World Space (or Grid Space if preferred)
                // The RP1 format expects the Hole to be a single point.
                // We'll calculate the center based on the grid tile.
                const centerX = col * 60 + 30;
                const centerY = row * 60 + 30;
                minified.g = [toGrid(centerX), toGrid(centerY)];
            }
        }

        // --- B. Serialize Entities (Dynamic Objects) ---
        if (entities) {
            entities.forEach(e => {
                // Slopes are currently stored as entities in the level object, 
                // but might be moved to TileMap later. For now, assume they are in the entities list 
                // OR passed separately. The previous serializer handled 'slopes' array.
                // Let's assume 'entities' contains everything NOT in the TileMap.

                // However, the Game.js rasterizer separates them. 
                // We need to handle 'slopes' if they are passed in 'entities' or a separate list.
                // For this implementation, we'll assume 'entities' is a flat list of non-grid objects.

                if (e.type === 'slope') {
                    minified.s.push([toGrid(e.x), toGrid(e.y), e.vx, e.vy]);
                } else if (e.type === 'start') {
                    minified.st = [toGrid(e.x), toGrid(e.y)];
                } else {
                    // Generic Entity
                    const ent = { t: e.type, x: toGrid(e.x), y: toGrid(e.y) };
                    if (e.vx !== undefined) ent.vx = e.vx;
                    if (e.vy !== undefined) ent.vy = e.vy;
                    // Add other specific props
                    if (e.id) ent.id = e.id;
                    if (e.targetId) ent.tid = e.targetId;

                    minified.e.push(ent);
                }
            });
        }

        // --- C. Metadata ---
        if (metadata.wind) {
            minified.wi = { a: metadata.wind.angle, s: metadata.wind.speed };
        }
        if (metadata.par) {
            minified.p = metadata.par;
        }

        // 2. Stringify & Encode
        const jsonString = JSON.stringify(minified);
        const base64 = btoa(jsonString); // Browser built-in Base64
        return `RP1:${base64}`; // Add Version Prefix
    }

    // Convert Base64 String -> Level Object (Ready for Game)
    static deserialize(code) {
        try {
            if (!code.startsWith('RP1:')) {
                throw new Error("Invalid version prefix");
            }

            // 1. Strip Prefix
            const base64 = code.replace('RP1:', '');

            // 2. Decode & Parse
            const jsonString = atob(base64);
            const minified = JSON.parse(jsonString);

            // Helper to world-scale
            const toWorld = (val) => val * 60;

            // 3. Rehydrate to Game Format (Pixels)
            const level = {
                walls: [],
                hazards: [],
                slopes: [],
                entities: [],
                hole: null,
                start: null,
                par: minified.p || 3,
                wind: null
            };

            if (minified.w) {
                level.walls = minified.w.map(p => ({ x: toWorld(p[0]), y: toWorld(p[1]), width: 60, height: 60 }));
            }

            if (minified.h) {
                level.hazards = minified.h.map(p => ({ x: toWorld(p[0]), y: toWorld(p[1]), width: 60, height: 60 }));
            }

            if (minified.s) {
                level.slopes = minified.s.map(p => ({
                    x: toWorld(p[0]),
                    y: toWorld(p[1]),
                    width: 60,
                    height: 60,
                    vx: p[2],
                    vy: p[3],
                    type: 'slope'
                }));
            }

            if (minified.e) {
                level.entities = minified.e.map(e => {
                    const ent = { type: e.t, x: toWorld(e.x), y: toWorld(e.y), width: 60, height: 60 };
                    if (e.vx !== undefined) ent.vx = e.vx;
                    if (e.vy !== undefined) ent.vy = e.vy;
                    if (e.id) ent.id = e.id;
                    if (e.tid) ent.targetId = e.tid;
                    return ent;
                });
            }

            if (minified.g) {
                level.hole = { x: toWorld(minified.g[0]), y: toWorld(minified.g[1]), radius: 15 };
            }

            if (minified.st) {
                level.start = { x: toWorld(minified.st[0]), y: toWorld(minified.st[1]) };
            }

            if (minified.wi) {
                level.wind = { angle: minified.wi.a, speed: minified.wi.s };
            }

            return level;
        } catch (e) {
            console.error("Invalid Level Code", e);
            return null;
        }
    }
}
