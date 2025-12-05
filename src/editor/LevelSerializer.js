export class LevelSerializer {

    // Convert Editor Level -> Compressed JSON -> Base64 String
    static serialize(levelData) {
        // 1. Minify Data Structure
        const minified = {
            w: [], // Walls: array of [x, y]
            h: [], // Hazards (Sand): array of [x, y]
            s: [], // Slopes: array of [x, y, vx, vy]
            e: [], // Entities: array of {t: type, x, y, ...params}
            g: null, // Goal/Hole: [x, y]
            st: null // Start: [x, y]
        };

        // Helper to grid-snap
        const toGrid = (val) => Math.round(val / 60);

        // Walls
        if (levelData.walls) {
            levelData.walls.forEach(w => {
                minified.w.push([toGrid(w.x), toGrid(w.y)]);
            });
        }

        // Hazards
        if (levelData.hazards) {
            levelData.hazards.forEach(h => {
                minified.h.push([toGrid(h.x), toGrid(h.y)]);
            });
        }

        // Slopes
        if (levelData.slopes) {
            levelData.slopes.forEach(s => {
                // Keep vx/vy as raw floats
                minified.s.push([toGrid(s.x), toGrid(s.y), s.vx, s.vy]);
            });
        }

        // Entities
        if (levelData.entities) {
            levelData.entities.forEach(e => {
                const ent = { t: e.type, x: toGrid(e.x), y: toGrid(e.y) };
                // Add other params if needed, for now just basic props
                if (e.vx !== undefined) ent.vx = e.vx;
                if (e.vy !== undefined) ent.vy = e.vy;
                minified.e.push(ent);
            });
        }

        // Goal (Hole)
        if (levelData.hole) {
            minified.g = [toGrid(levelData.hole.x), toGrid(levelData.hole.y)];
        }

        // Start
        if (levelData.start) {
            minified.st = [toGrid(levelData.start.x), toGrid(levelData.start.y)];
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
                par: 3 // Default par
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
                    vy: p[3]
                }));
            }

            if (minified.e) {
                level.entities = minified.e.map(e => {
                    const ent = { type: e.t, x: toWorld(e.x), y: toWorld(e.y), width: 60, height: 60 };
                    if (e.vx !== undefined) ent.vx = e.vx;
                    if (e.vy !== undefined) ent.vy = e.vy;
                    return ent;
                });
            }

            if (minified.g) {
                level.hole = { x: toWorld(minified.g[0]), y: toWorld(minified.g[1]), radius: 15 };
            }

            if (minified.st) {
                level.start = { x: toWorld(minified.st[0]), y: toWorld(minified.st[1]) };
            }

            return level;
        } catch (e) {
            console.error("Invalid Level Code", e);
            return null;
        }
    }
}
