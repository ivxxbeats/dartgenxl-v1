// ============================================================
// DART HLGEN - UNIFIED ENGINE v1.6
// NO FLASH: Canonical first, pressure ramps in with fade
// ============================================================

(function() {
    "use strict";
    
    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        MODE: null,
        RENDER_WIDTH: 640,
        RENDER_HEIGHT: 640,
        SEED_SALT: "dart_hlgen_v1"
    };
    
    // ============================================================
    // CONSTANTS
    // ============================================================
    const RARITY_CLASSES = {
        COMMON: "Common",
        UNCOMMON: "Uncommon", 
        RARE: "Rare",
        MYTHIC: "Mythic",
        GRAIL: "Grail"
    };
    
    const ARCHETYPES = ["Signal", "Drift", "Rift", "Core", "Prism", "Void"];
    const ANCHOR_FORMS = ["Aether", "PrismHeart", "Faultline", "Gate", "Nexus", "Bloom"];
    const ENGINE_TYPES = ["Canonical", "Echo", "Rupture"];
    const PRIMARY_DRIVERS = ["Fractal", "Pattern", "Color", "Composition"];
    const STRUCTURE_TYPES = ["Nova", "Lattice", "Field", "Wave", "Grid", "Drift"];
    const SPATIAL_BEHAVIORS = ["Radial", "Spiral", "FlowField", "Kaleido", "Vortex", "Asymmetrical"];
    const ANOMALY_CLASSES = ["Interference", "Collapse", "EchoLoop", "SpectralSplit"];
    const FAILURE_MODES = ["Recovering", "Residual", "VoidBloom", "Fracture"];
    const COLOR_MOODS = ["Ethereal", "Volcanic", "StellarDrift", "Nebula", "SolarFlare", "DeepVoid", "PrismCore", "AuroraBorealis"];
    
    const LOG2 = Math.log(2);
    
    // Echo spatial memory buffer
    let echoMemoryBufferSmooth = 0;
    
    // ============================================================
    // DETERMINISTIC SEEDING
    // ============================================================
    
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ ch, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ ch, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ ch, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ ch, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
    }
    
    function splitmix64(seed) {
        let s = seed >>> 0;
        return function() {
            s = s + 0x9e3779b9 | 0;
            let t = s ^ s >>> 16;
            t = Math.imul(t, 0x21f0aaad);
            t = t ^ t >>> 15;
            t = Math.imul(t, 0x735a2d97);
            return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
        };
    }
    
    function splitSeed(seed, streamId) {
        const combined = seed + '_' + CONFIG.SEED_SALT + '_' + streamId;
        const hash = cyrb128(combined);
        return (hash[0] ^ hash[1] ^ hash[2] ^ hash[3]) >>> 0;
    }
    
    function getSeed(tokenId, txHash) {
        const combined = `${txHash}_${tokenId}`;
        const hash = cyrb128(combined);
        return (hash[0] ^ hash[1] ^ hash[2] ^ hash[3]) >>> 0;
    }
    
    function makeSeededRand(seed) {
        return splitmix64(seed);
    }
    
    function weightedPick(items, weights, rng) {
        const total = weights.reduce((a, b) => a + b, 0);
        let roll = rng() * total;
        for (let i = 0; i < items.length; i++) {
            if (roll < weights[i]) return items[i];
            roll -= weights[i];
        }
        return items[items.length - 1];
    }
    
    // ============================================================
    // TRAIT GENERATION
    // ============================================================
    
    function rollRarityClass(rng) {
        const r = rng();
        if (r < 0.60) return RARITY_CLASSES.COMMON;
        if (r < 0.85) return RARITY_CLASSES.UNCOMMON;
        if (r < 0.95) return RARITY_CLASSES.RARE;
        if (r < 0.99) return RARITY_CLASSES.MYTHIC;
        return RARITY_CLASSES.GRAIL;
    }
    
    function rollArchetype(rarityClass, rng) {
        const weights = {
            [RARITY_CLASSES.COMMON]: [0.20, 0.18, 0.15, 0.17, 0.18, 0.12],
            [RARITY_CLASSES.UNCOMMON]: [0.17, 0.17, 0.17, 0.17, 0.18, 0.14],
            [RARITY_CLASSES.RARE]: [0.14, 0.16, 0.20, 0.16, 0.18, 0.16],
            [RARITY_CLASSES.MYTHIC]: [0.10, 0.14, 0.22, 0.14, 0.20, 0.20],
            [RARITY_CLASSES.GRAIL]: [0.12, 0.14, 0.18, 0.12, 0.28, 0.16]
        };
        return weightedPick(ARCHETYPES, weights[rarityClass] || weights[RARITY_CLASSES.COMMON], rng);
    }
    
    function rollAnchorForm(archetype, rng) {
        const weights = {
            "Signal": [0.10, 0.28, 0.08, 0.30, 0.18, 0.06],
            "Drift": [0.18, 0.22, 0.06, 0.08, 0.32, 0.14],
            "Rift": [0.06, 0.08, 0.46, 0.12, 0.10, 0.18],
            "Core": [0.32, 0.26, 0.06, 0.16, 0.10, 0.10],
            "Prism": [0.12, 0.30, 0.10, 0.20, 0.16, 0.12],
            "Void": [0.28, 0.16, 0.18, 0.14, 0.08, 0.16]
        };
        return weightedPick(ANCHOR_FORMS, weights[archetype] || weights.Signal, rng);
    }
    
    function rollEngineType(rng, rarityClass) {
        if (rarityClass === RARITY_CLASSES.GRAIL) {
            return weightedPick(ENGINE_TYPES, [0.10, 0.20, 0.70], rng);
        }
        return weightedPick(ENGINE_TYPES, [0.78, 0.19, 0.03], rng);
    }
    
    function rollPrimaryDriver(rng) {
        return weightedPick(PRIMARY_DRIVERS, [0.35, 0.25, 0.25, 0.15], rng);
    }
    
    function rollStructureType(rng) {
        return STRUCTURE_TYPES[Math.floor(rng() * STRUCTURE_TYPES.length)];
    }
    
    function rollColorMood(rng) {
        return COLOR_MOODS[Math.floor(rng() * COLOR_MOODS.length)];
    }
    
    function rollSpatialBehavior(engineType, rng) {
        const allowed = {
            "Canonical": ["Radial", "Spiral", "Kaleido"],
            "Echo": ["FlowField", "Vortex", "Asymmetrical"],
            "Rupture": ["Asymmetrical", "Vortex", "Radial"]
        };
        const options = allowed[engineType] || allowed.Canonical;
        return options[Math.floor(rng() * options.length)];
    }
    
    function rollFailureMode(rng, engineType, rarityClass) {
        if (rarityClass === RARITY_CLASSES.GRAIL) {
            if (engineType === "Rupture") return weightedPick(FAILURE_MODES, [0.05, 0.10, 0.15, 0.70], rng);
            if (engineType === "Echo") return weightedPick(FAILURE_MODES, [0.10, 0.45, 0.30, 0.15], rng);
            return weightedPick(FAILURE_MODES, [0.30, 0.35, 0.25, 0.10], rng);
        }
        if (engineType === "Canonical") return weightedPick(FAILURE_MODES, [0.70, 0.20, 0.08, 0.02], rng);
        if (engineType === "Echo") return weightedPick(FAILURE_MODES, [0.30, 0.45, 0.20, 0.05], rng);
        return weightedPick(FAILURE_MODES, [0.15, 0.20, 0.15, 0.50], rng);
    }
    
    function rollAnomalyClass(rng) {
        return weightedPick(ANOMALY_CLASSES, [0.25, 0.25, 0.25, 0.25], rng);
    }
    
    function generateTraits(seed, tokenId) {
        const streams = {};
        for (let i = 1; i <= 10; i++) streams[i] = makeSeededRand(splitSeed(seed, i));
        
        const tokenNum = parseInt(tokenId, 10) || 0;
        const steps = (tokenNum * 997) % 1000;
        for (let i = 0; i < steps; i++) {
            for (let s = 1; s <= 10; s++) if (streams[s]) streams[s]();
        }
        
        const rng = streams[1];
        const rarityClass = rollRarityClass(rng);
        const archetype = rollArchetype(rarityClass, rng);
        const anchorForm = rollAnchorForm(archetype, rng);
        const engineType = rollEngineType(rng, rarityClass);
        const primaryDriver = rollPrimaryDriver(rng);
        const colorMood = rollColorMood(rng);
        const structureType = rollStructureType(rng);
        const spatialBehavior = rollSpatialBehavior(engineType, rng);
        const failureMode = rollFailureMode(rng, engineType, rarityClass);
        
        const traits = { rarityClass, archetype, anchorForm, engineType, primaryDriver, colorMood, structureType, spatialBehavior, failureMode };
        if (rarityClass === RARITY_CLASSES.GRAIL) traits.anomalyClass = rollAnomalyClass(rng);
        
        return traits;
    }
    
    function generateBaseTraits(seed, tokenId) {
        const streams = {};
        for (let i = 1; i <= 7; i++) streams[i] = makeSeededRand(splitSeed(seed, i + 100));
        
        const tokenNum = parseInt(tokenId, 10) || 0;
        const steps = (tokenNum * 997) % 1000;
        for (let i = 0; i < steps; i++) {
            for (let s = 1; s <= 7; s++) if (streams[s]) streams[s]();
        }
        
        const rng = streams[1];
        const varietyRNG = streams[2];
        
        const zoomVariety = 0.5 + varietyRNG() * 1.3;
        const offsetVarietyX = (varietyRNG() - 0.5) * 2.0;
        const offsetVarietyY = (varietyRNG() - 0.5) * 2.0;
        const iterVariety = 40 + Math.floor(varietyRNG() * 200);
        
        const densityIndex = Math.floor(varietyRNG() * 4);
        let iterMult = 1.0, layers = 3;
        if (densityIndex === 0) { iterMult = 0.6; layers = 2; }
        else if (densityIndex === 2) { iterMult = 1.2; layers = 3; }
        else if (densityIndex === 3) { iterMult = 1.3; layers = 3; }
        
        return {
            zoom: (0.5 + rng() * 0.8) * zoomVariety,
            offsetX: (rng() - 0.5) * 1.0 + offsetVarietyX,
            offsetY: (rng() - 0.5) * 1.0 + offsetVarietyY,
            baseMaxIter: 60 + Math.floor(rng() * 140) + iterVariety,
            iterMult, layers
        };
    }
    
    // ============================================================
    // CANONICAL VALUES
    // ============================================================
    
    function getCanonicalIntensity(seed) {
        const rng = makeSeededRand(splitSeed(seed, 200));
        return 0.32 + rng() * 0.58;
    }
    
    function getCanonicalTime(tokenId, seed, intensity) {
        const tokenNum = parseInt(tokenId, 10) || 0;
        return ((tokenNum * 0.0123456789) + (seed * 0.0000001) + (intensity * 0.1)) % 1.0;
    }
    
    // ============================================================
    // ENGINE-SPECIFIC LIVE BEHAVIOR
    // ============================================================
    
    function applyEngineLiveBehavior(t, engineType, liveIntensity, liveTime, pressure, traits, rx, ry) {
        if (engineType === "Canonical") {
            const breath = Math.sin(liveTime * 0.8) * (0.03 + pressure * 0.05);
            const harmonic = Math.sin(t * Math.PI * 3 + liveTime) * 0.04 * pressure;
            const stability = 1.0 - liveIntensity * 0.08;
            return Math.max(0.03, Math.min(0.97, t * stability + breath + harmonic));
        } 
        else if (engineType === "Echo") {
            const directional = Math.sin(rx * 2 + liveTime) * 0.5 + Math.cos(ry * 2 - liveTime) * 0.5;
            const trail = Math.sin(t * Math.PI * 2 + liveTime * 1.5) * (0.08 + pressure * 0.1);
            const trail2 = Math.sin(t * Math.PI * 4 + liveTime * 2.5) * (0.04 + pressure * 0.08);
            const memoryBlend = 0.15 + pressure * 0.2;
            const memory = echoMemoryBufferSmooth * memoryBlend * directional;
            let result = t * (0.65 - pressure * 0.1) + trail * (0.12 + pressure * 0.12) + trail2 * 0.06 + memory * 0.15;
            echoMemoryBufferSmooth = echoMemoryBufferSmooth * 0.85 + result * 0.15;
            return Math.max(0.03, Math.min(0.97, result));
        } 
        else {
            const spike = Math.abs(Math.sin(liveTime * (8 + pressure * 4))) * (0.12 + pressure * 0.15);
            const spike2 = Math.abs(Math.sin(liveTime * 15 + t * 8)) * (0.08 + pressure * 0.1);
            let result = t + spike + spike2;
            const zone = Math.sin(rx * 3) * Math.cos(ry * 3);
            if (zone > 0.5) result *= 1.2 + pressure * 0.3;
            if (zone < -0.5) result = Math.abs(result - 0.5) * 1.2;
            const pseudoRand = Math.sin(t * 43758.5453 + liveTime * 12) * 0.5 + 0.5;
            if (pressure > 0.6 && pseudoRand < (pressure - 0.6) * 0.35) result = Math.abs(result - 0.5) * 1.4;
            return Math.max(0.02, Math.min(0.98, result));
        }
    }
    
    // ============================================================
    // GEOMETRY HELPERS (condensed for brevity)
    // ============================================================
    
    function applyArchetypeGeometry(archetype, x, y) {
        let rx = x, ry = y;
        switch(archetype) {
            case "Signal": rx *= 0.8; ry *= 0.8; break;
            case "Drift": rx += Math.sin(ry * 2) * 0.4; break;
            case "Rift": rx *= 1.6; break;
            case "Core": ry *= 0.5; break;
            case "Prism": rx = Math.abs(rx); ry = Math.abs(ry); break;
            case "Void": rx *= -1; ry *= -1; break;
        }
        return { x: rx, y: ry };
    }
    
    function reinforceArchetype(archetype, rx, ry, pressure) {
        let x = rx, y = ry;
        const amp = 0.08 + pressure * 0.1;
        x *= 1 + pressure * 0.15;
        y *= 1 - pressure * 0.1;
        switch(archetype) {
            case "Signal": x += Math.sin(y * 4.0) * amp; break;
            case "Drift": y += Math.sin(x * 2.5) * amp * 1.5; break;
            case "Rift": x *= 1.08; y *= 0.92; break;
            case "Core":
                const centerPull = Math.exp(-(x * x + y * y) * (1.8 - pressure * 0.5));
                x = x * (0.96 + centerPull * 0.04);
                y = y * (0.96 + centerPull * 0.04);
                break;
            case "Prism":
                const sharpness = 0.92 - pressure * 0.04;
                x = Math.sign(x) * Math.pow(Math.abs(x), sharpness);
                y = Math.sign(y) * Math.pow(Math.abs(y), sharpness);
                break;
            case "Void":
                const voidFalloff = 1.0 - Math.exp(-(x * x + y * y) * (1.2 + pressure * 0.5));
                x = x * (0.94 + voidFalloff * 0.06);
                y = y * (0.94 + voidFalloff * 0.06);
                break;
        }
        return { x, y };
    }
    
    function reinforceAnchor(t, anchorForm, rx, ry, pressure) {
        let result = t;
        const amp = 0.12 + pressure * 0.1;
        if (anchorForm === "Gate") {
            const gate = Math.exp(-Math.pow(rx * 0.9, 2) * 6.0) * amp;
            result = t * (0.88 - pressure * 0.03) + gate * (0.12 + pressure * 0.04);
        } else if (anchorForm === "Nexus") {
            const nexus = Math.exp(-(rx * rx + ry * ry) * 2.6) * amp * 1.2;
            result = t * (0.84 - pressure * 0.04) + nexus * (0.16 + pressure * 0.06);
        } else if (anchorForm === "Faultline") {
            const fault = Math.abs(Math.sin(rx * 10.0 - ry * 6.0)) * amp;
            result = t * (0.86 - pressure * 0.03) + fault * (0.14 + pressure * 0.05);
        } else if (anchorForm === "Bloom") {
            const r = Math.sqrt(rx * rx + ry * ry);
            const bloom = (Math.sin(r * 14.0) * 0.5 + 0.5) * amp;
            result = t * (0.88 - pressure * 0.03) + bloom * (0.12 + pressure * 0.04);
        } else if (anchorForm === "PrismHeart") {
            const prism = (Math.abs(rx) + Math.abs(ry)) * amp * 0.8;
            result = t * (0.90 - pressure * 0.02) + prism * (0.10 + pressure * 0.03);
        } else if (anchorForm === "Aether") {
            const aether = (Math.sin((rx + ry) * 5.0) * 0.5 + 0.5) * amp * 0.7;
            result = t * (0.92 - pressure * 0.02) + aether * (0.08 + pressure * 0.02);
        }
        return Math.max(0.03, Math.min(0.97, result));
    }
    
    function novaFractalCalc(x0, y0, maxIter) {
        let x = x0, y = y0;
        let iter = 0;
        for (iter = 0; iter < maxIter; iter++) {
            const x2 = x * x, y2 = y * y;
            if (x2 + y2 > 4.0) break;
            const xt = x2 - y2 + x0;
            y = 2.0 * x * y + y0;
            x = xt;
        }
        let smooth;
        if (iter < maxIter) {
            const mag2 = x * x + y * y;
            const logZn = Math.log(Math.max(mag2, 1e-10)) * 0.5;
            const nu = Math.log(logZn / LOG2) / LOG2;
            smooth = (iter + 1 - nu) / maxIter;
        } else smooth = 1.0;
        return Math.max(0.02, Math.min(0.98, smooth));
    }
    
    function getDepthFractalValue(x, y, maxIter, layers, iterMult) {
        let depth = 0;
        for (let i = 0; i < layers; i++) {
            const scale = 1 + i * 0.15;
            depth += novaFractalCalc(x * scale, y * scale, Math.floor(maxIter * iterMult * 0.7));
        }
        return depth / layers;
    }
    
    function getPatternValue(x, y, time, engineName, pressure, primaryDriver, rx, ry, liveTime) {
        const r = Math.sqrt(x * x + y * y);
        const a = Math.atan2(y, x);
        let val = 0;
        if (engineName === "Echo") {
            val = Math.sin(a * 3 - r * (12 + pressure * 4) + time) * 0.4;
            val += Math.sin(a * 6 + r * (6 + pressure * 3) - time * 0.3) * 0.2;
        } else if (engineName === "Rupture") {
            val = Math.sin(a * (8 + pressure * 4) - r * (25 + pressure * 10) + time * 2) * 0.3;
            val += Math.sin(a * (16 + pressure * 6) + r * (15 + pressure * 8) - time * 1.5) * 0.2;
            val += Math.sin(r * (30 + pressure * 15)) * 0.15;
        } else {
            val = Math.sin(a * 5 - r * 18 + time) * 0.35;
            val += Math.sin(a * 10 + r * 9 - time * 0.5) * 0.15;
        }
        if (primaryDriver === "Pattern") {
            val += Math.sin(rx * 10 + ry * 10 + liveTime) * 0.15 * pressure;
        } else if (primaryDriver === "Fractal") {
            val = Math.pow(val, 0.8 - pressure * 0.1);
        } else if (primaryDriver === "Composition") {
            val *= 1 + pressure * 0.2;
        }
        return Math.max(0.02, Math.min(0.98, (val + 0.5)));
    }
    
    function applyCompositionTransform(ux, uy, composition, zoom, offsetX, offsetY) {
        let x = ux / zoom + offsetX;
        let y = uy / zoom + offsetY;
        switch(composition) {
            case "Radial":
                const r = Math.sqrt(x*x + y*y);
                const a = Math.atan2(y, x);
                x = a; y = r;
                break;
            case "Spiral":
                const sr = Math.sqrt(x*x + y*y);
                const sa = Math.atan2(y, x);
                const spiralR = Math.pow(sr, 0.7) * 1.5;
                x = Math.cos(sa + spiralR * 4) * spiralR;
                y = Math.sin(sa + spiralR * 4) * spiralR;
                break;
            case "FlowField":
                const angle = Math.sin(x * 3) * Math.cos(y * 3);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const nx = x * cosA - y * sinA;
                const ny = x * sinA + y * cosA;
                x = nx; y = ny;
                break;
            case "Kaleido":
                let angleK = Math.atan2(y, x);
                let radiusK = Math.sqrt(x*x + y*y);
                let segments = 6;
                angleK = angleK % (Math.PI * 2 / segments);
                if (angleK > Math.PI / segments) angleK = (Math.PI * 2 / segments) - angleK;
                x = Math.cos(angleK) * radiusK;
                y = Math.sin(angleK) * radiusK;
                break;
            case "Vortex":
                let vr = Math.sqrt(x*x + y*y);
                let va = Math.atan2(y, x);
                va += vr * 2.0;
                x = Math.cos(va) * vr;
                y = Math.sin(va) * vr;
                break;
            case "Asymmetrical":
                x *= 1.3;
                y *= 0.6;
                break;
        }
        return { x, y };
    }
    
    function getRichColor(t, colorMood, time, primaryDriver, pressure) {
        let r, g, b;
        const colorBoost = 1 + pressure * 0.3;
        if (primaryDriver === "Color") {
            r = Math.sin(t * 40 + time) * 0.5 + 0.5;
            g = Math.sin(t * 40 + 2.094 + time) * 0.5 + 0.5;
            b = Math.sin(t * 40 + 4.188 + time) * 0.5 + 0.5;
            return { r: Math.min(0.85, Math.max(0.15, r * colorBoost * 1.2)), g: Math.min(0.85, Math.max(0.15, g * colorBoost * 1.2)), b: Math.min(0.85, Math.max(0.15, b * colorBoost * 1.2)) };
        }
        const chroma = 0.7 + pressure * 0.2;
        switch(colorMood) {
            case "Volcanic": r = 1.0; g = 0.1 + 0.7 * Math.sin(t * 12 + time) * chroma; b = 0.0; break;
            case "SolarFlare": r = 1.0; g = 0.5 + 0.5 * Math.sin(t * 14 + time) * chroma; b = 0.0; break;
            default: r = Math.sin(t * 25 + time) * (0.5 + pressure * 0.15) + 0.5; g = Math.sin(t * 25 + 2.094 + time * 1.3) * (0.5 + pressure * 0.15) + 0.5; b = Math.sin(t * 25 + 4.188 + time * 0.7) * (0.5 + pressure * 0.15) + 0.5; break;
        }
        return { r: Math.min(0.85, Math.max(0.15, r * colorBoost)), g: Math.min(0.85, Math.max(0.15, g * colorBoost)), b: Math.min(0.85, Math.max(0.15, b * colorBoost)) };
    }
    
    function signatureColor(t, time, pressure) {
        const base = t * (30 + pressure * 15) + time;
        return { r: Math.sin(base) * 0.5 + 0.5, g: Math.sin(base + 2.094) * 0.5 + 0.5, b: Math.sin(base + 4.188) * 0.5 + 0.5 };
    }
    
    function engineFrequencyShape(t, engineName, freqMultiplier, pressure) {
        let out;
        if (engineName === "Canonical") {
            out = Math.sin(t * Math.PI * freqMultiplier * (0.8 + pressure * 0.1));
            out = (out + 1) / 2;
        } else if (engineName === "Echo") {
            const a = Math.sin(t * Math.PI * freqMultiplier * (0.55 + pressure * 0.15));
            const b = Math.cos(t * Math.PI * (2.0 + pressure * 0.5));
            out = (a * (0.65 - pressure * 0.1) + b * (0.35 + pressure * 0.1) + 1) / 2;
        } else {
            out = Math.sin(t * Math.PI * freqMultiplier * (1.35 + pressure * 0.3));
            out = (out + 1) / 2;
        }
        return Math.max(0.03, Math.min(0.97, out));
    }
    
    function engineContrastShape(t, engineName, pressure) {
        const k = 6.0;
        let s = 1.0 / (1.0 + Math.exp(-k * (t - 0.5)));
        s = s * 0.9 + Math.abs(Math.sin(t * Math.PI)) * 0.1;
        let exponent;
        if (engineName === "Canonical") exponent = 0.92 - pressure * 0.08;
        else if (engineName === "Echo") exponent = 1.12 - pressure * 0.12;
        else exponent = 0.68 - pressure * 0.1;
        return Math.pow(s, Math.max(0.5, Math.min(1.5, exponent)));
    }
    
    function engineColorDiscipline(r, g, b, engineName, t, time, pressure) {
        if (engineName === "Canonical") {
            const intensity = 0.96 - pressure * 0.04;
            return { r: r * intensity, g: g * intensity, b: b * intensity };
        }
        if (engineName === "Echo") {
            const bleed = 0.04 + pressure * 0.06;
            return {
                r: r * (0.96 - pressure * 0.04) + (Math.sin(time + t * 4) * 0.5 + 0.5) * bleed,
                g: g * (0.96 - pressure * 0.04) + (Math.sin(time + 2.094 + t * 4) * 0.5 + 0.5) * bleed,
                b: b * (0.96 - pressure * 0.04) + (Math.sin(time + 4.188 + t * 4) * 0.5 + 0.5) * bleed
            };
        }
        return {
            r: Math.min(1, r * (1.06 + pressure * 0.08)),
            g: g * (0.88 - pressure * 0.06),
            b: Math.min(1, b * (1.03 + pressure * 0.05))
        };
    }
    
    // ============================================================
    // CORE PIXEL COMPUTATION - WITH FADE FACTOR FOR PRESSURE
    // ============================================================
    
    function computePixel(options) {
        const { x, y, width, height, traits, baseTraits, time, intensity, freqIndex, liveIntensity, liveTime, mode, fadeFactor = 1 } = options;
        
        const { engineType, rarityClass, anomalyClass, failureMode, spatialBehavior, archetype, anchorForm, colorMood, primaryDriver } = traits;
        const { zoom, offsetX, offsetY, baseMaxIter, layers, iterMult } = baseTraits;
        const isGrail = rarityClass === RARITY_CLASSES.GRAIL;
        const isRupture = engineType === "Rupture";
        const isEcho = engineType === "Echo";
        
        // PRESSURE IS MULTIPLIED BY FADE FACTOR - NO SUDDEN POP!
        let pressure = 0;
        if (mode === "live" && liveIntensity !== undefined) {
            pressure = Math.pow(liveIntensity, 1.2) * fadeFactor;
        }
        
        let ux = (x / width) * 4.0 - 2.5;
        let uy = (y / height) * 4.0 - 2.0;
        ux *= width / height;
        
        const goldenOffsetX = (width / 1.618 - width / 2) / width * 0.3;
        const goldenOffsetY = (height / 1.618 - height / 2) / height * 0.3;
        const adjustedOffsetX = offsetX + goldenOffsetX;
        const adjustedOffsetY = offsetY + goldenOffsetY;
        
        let transformed = applyCompositionTransform(ux, uy, spatialBehavior, zoom, adjustedOffsetX, adjustedOffsetY);
        let rx = transformed.x;
        let ry = transformed.y;
        
        let geo = applyArchetypeGeometry(archetype, rx, ry);
        rx = geo.x;
        ry = geo.y;
        
        const reinforced = reinforceArchetype(archetype, rx, ry, pressure);
        rx = reinforced.x;
        ry = reinforced.y;
        
        rx *= 1.2;
        ry *= 1.2;
        
        if (spatialBehavior === "Asymmetrical") { rx += 0.4; ry -= 0.2; }
        if (spatialBehavior === "FlowField") { rx += Math.sin(ry * 2.5) * 0.3; ry += Math.cos(rx * 2.5) * 0.3; }
        if (spatialBehavior === "Vortex") {
            let vr = Math.sqrt(rx * rx + ry * ry);
            let va = Math.atan2(ry, rx);
            va += vr * 3.0;
            rx = Math.cos(va) * vr * 0.8;
            ry = Math.sin(va) * vr * 0.8;
        }
        
        if (isRupture) {
            rx += Math.sin(ry * 6 + time * 4) * (0.15 + pressure * 0.1);
            ry += Math.cos(rx * 6 - time * 4) * (0.15 + pressure * 0.1);
        }
        
        let fractalVal = getDepthFractalValue(rx, ry, baseMaxIter, layers, iterMult);
        let patternVal = getPatternValue(rx, ry, time, engineType, pressure, primaryDriver, rx, ry, liveTime);
        
        let t;
        if (isRupture) {
            t = Math.abs(fractalVal - patternVal) + Math.sin(rx * ry * 2.5) * 0.2;
        } else if (isEcho) {
            t = fractalVal * 0.35 + patternVal * 0.65;
            t = t * 0.8 + Math.sin(t * Math.PI * 2) * 0.2;
            t = t * 0.8 + Math.sin(t * Math.PI * 2 + Math.sin(t * 6)) * 0.2;
        } else {
            t = fractalVal * 0.75 + patternVal * 0.25;
        }
        t = Math.max(0.03, Math.min(0.97, t));
        
        if (isGrail && anomalyClass) {
            if (anomalyClass === "Interference") {
                if (engineType === "Canonical") {
                    const t2 = Math.sin((fractalVal + patternVal) * Math.PI * 12 / 8);
                    t = (t + ((t2 + 1) / 2)) * 0.5;
                } else if (engineType === "Echo") {
                    const echoMix = Math.cos((fractalVal * 0.6 + patternVal * 1.4) * Math.PI * 2.5);
                    t = t * 0.65 + ((echoMix + 1) / 2) * 0.35;
                } else {
                    const t2 = Math.sin((fractalVal - patternVal) * Math.PI * 20);
                    t = Math.abs(t - ((t2 + 1) / 2));
                }
            } else if (anomalyClass === "Collapse") {
                const rc = Math.sqrt((rx - 0.5) * (rx - 0.5) + (ry - 0.5) * (ry - 0.5));
                const collapse = Math.max(0, 1 - rc * 2);
                if (engineType === "Canonical") t = t * (1 - collapse * 0.55);
                else if (engineType === "Echo") t = t * (1 - collapse * 0.35) + collapse * 0.15;
                else t = t * (1 - collapse * 0.85);
            } else if (anomalyClass === "EchoLoop") {
                const rr = Math.sqrt(rx * rx + ry * ry);
                const ring = Math.sin(rr * 15) * 0.3;
                if (engineType === "Canonical") t = t * 0.78 + ring * 0.22;
                else if (engineType === "Echo") {
                    const loop = Math.sin(rr * 9 + t * Math.PI * 4) * 0.5 + 0.5;
                    t = t * 0.5 + loop * 0.5;
                } else t = t * 0.6 + Math.abs(ring) * 0.4;
            } else if (anomalyClass === "SpectralSplit") {
                t = Math.pow(t, engineType === "Rupture" ? 0.45 : 0.6);
            }
            t = Math.max(0.03, Math.min(0.97, t));
            t = Math.pow(t, engineType === "Rupture" ? 0.18 : 0.25);
        }
        
        const freqMultiplier = [3, 6, 10, 16][freqIndex % 4];
        t = engineFrequencyShape(t, engineType, freqMultiplier, pressure);
        t = Math.pow(t, 0.6 - pressure * 0.1);
        
        const variation = Math.abs(fractalVal - patternVal);
        if (variation < 0.02) {
            t += (Math.sin(rx * 12.3 + ry * 7.1) * 0.5 + 0.5) * 0.12;
        }
        if (variation < 0.01) {
            const fallback = Math.sin(rx * 8 + ry * 8) * 0.5 + 0.5;
            if (failureMode === "Recovering") {
                if (engineType === "Canonical") t = t * 0.65 + fallback * 0.35;
                else if (engineType === "Echo") t = t * 0.75 + fallback * 0.25;
                else t = t * 0.90 + fallback * 0.10;
            } else if (failureMode === "Residual") t = t * 0.88 + fallback * 0.12;
            else if (failureMode === "VoidBloom") {
                const bloom = Math.exp(-(rx * rx + ry * ry) * 1.8);
                t = t * 0.7 + bloom * 0.3;
            } else if (failureMode === "Fracture") {
                const crack = Math.abs(Math.sin(rx * 18 - ry * 11));
                t = t * 0.6 + crack * 0.4;
            }
        }
        t = Math.max(0.03, Math.min(0.97, t));
        
        t = engineContrastShape(t, engineType, pressure);
        t = reinforceAnchor(t, anchorForm, rx, ry, pressure);
        
        let finalT = t;
        
        if (mode === "live" && liveIntensity !== undefined) {
            finalT = applyEngineLiveBehavior(finalT, engineType, liveIntensity, liveTime, pressure, traits, rx, ry);
            if (liveTime !== undefined) {
                let warp;
                const warpStrength = 0.12 + pressure * 0.18;
                if (engineType === "Canonical") {
                    warp = Math.sin(finalT * Math.PI * 2 + liveTime * 2) * (0.1 + pressure * 0.1);
                    finalT = finalT * (0.88 - pressure * 0.06) + warp * warpStrength;
                } else if (engineType === "Echo") {
                    const warp1 = Math.sin(finalT * Math.PI * 4 + liveTime * 3) * 0.08;
                    const warp2 = Math.sin(finalT * Math.PI * 8 + liveTime * 1.2) * 0.05;
                    warp = (warp1 + warp2) * (0.8 + pressure * 0.4);
                    finalT = finalT * (0.82 - pressure * 0.08) + warp * warpStrength;
                } else {
                    const warp1 = Math.abs(Math.sin(liveTime * 10 + finalT * 6)) * (0.2 + pressure * 0.2);
                    const warp2 = Math.sin(finalT * Math.PI * 12 + liveTime * 8) * 0.1;
                    warp = (warp1 + warp2) * 0.8;
                    finalT = finalT * (0.75 - pressure * 0.12) + warp * warpStrength;
                }
                finalT = Math.max(0.03, Math.min(0.97, finalT));
            }
        }
        
        finalT = Math.max(0.03, Math.min(0.97, finalT));
        
        if (mode === "live" && pressure !== undefined) {
            if (pressure > 0.35) finalT = Math.pow(finalT, 0.92 - pressure * 0.08);
            if (pressure > 0.60) finalT = Math.pow(finalT, 0.75 - pressure * 0.1);
            if (pressure > 0.82) {
                if (engineType === "Canonical") finalT = Math.abs(Math.sin(finalT * Math.PI * 6));
                else if (engineType === "Echo") finalT = (finalT + echoMemoryBufferSmooth) * 0.5;
                else finalT = Math.abs(finalT - 0.5) * 2;
                finalT = Math.max(0.02, Math.min(0.98, finalT));
            }
        }
        
        let { r, g, b } = getRichColor(finalT, colorMood, time, primaryDriver, pressure);
        let colorDisciplined = engineColorDiscipline(r, g, b, engineType, finalT, time, pressure);
        const sigColor = signatureColor(finalT, time, pressure);
        r = colorDisciplined.r * (0.65 - pressure * 0.05) + sigColor.r * (0.35 + pressure * 0.05);
        g = colorDisciplined.g * (0.65 - pressure * 0.05) + sigColor.g * (0.35 + pressure * 0.05);
        b = colorDisciplined.b * (0.65 - pressure * 0.05) + sigColor.b * (0.35 + pressure * 0.05);
        
        if (isGrail && anomalyClass === "SpectralSplit") {
            if (engineType === "Canonical") {
                r = Math.min(1, r * (1.18 + pressure * 0.1));
                g = g * (0.78 - pressure * 0.08);
                b = Math.min(1, b * (1.08 + pressure * 0.08));
            } else if (engineType === "Echo") {
                r = r * (0.82 - pressure * 0.04) + (Math.sin(time + finalT * 10) * 0.5 + 0.5) * (0.28 + pressure * 0.1);
                g = g * (0.7 - pressure * 0.05);
                b = b * (0.82 - pressure * 0.04) + (Math.cos(time + finalT * 10) * 0.5 + 0.5) * (0.28 + pressure * 0.1);
            } else {
                r = Math.min(1, r * (1.35 + pressure * 0.15));
                g = g * (0.58 - pressure * 0.08);
                b = Math.min(1, b * (1.18 + pressure * 0.1));
            }
        }
        
        return {
            r: Math.floor(Math.min(255, Math.max(0, r * 255))),
            g: Math.floor(Math.min(255, Math.max(0, g * 255))),
            b: Math.floor(Math.min(255, Math.max(0, b * 255)))
        };
    }
    
    // ============================================================
    // CANONICAL RENDER
    // ============================================================
    
    function renderCanonical(tokenId, txHash, width = CONFIG.RENDER_WIDTH, height = CONFIG.RENDER_HEIGHT) {
        const validTxHash = (txHash && txHash !== "0x0" && txHash !== "") ? txHash : `canonical_fallback_${tokenId}`;
        const seed = getSeed(tokenId, validTxHash);
        const traits = generateTraits(seed, tokenId);
        const baseTraits = generateBaseTraits(seed, tokenId);
        const canonicalIntensity = getCanonicalIntensity(seed);
        const canonicalTime = getCanonicalTime(tokenId, seed, canonicalIntensity);
        const freqRNG = makeSeededRand(splitSeed(seed, 300));
        const freqIndex = Math.floor(freqRNG() * 4);
        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = computePixel({ x, y, width, height, traits, baseTraits, time: canonicalTime, intensity: canonicalIntensity, freqIndex, mode: "canonical" });
                const idx = (y * width + x) * 4;
                pixels[idx] = pixel.r;
                pixels[idx + 1] = pixel.g;
                pixels[idx + 2] = pixel.b;
                pixels[idx + 3] = 255;
            }
        }
        const eventScore = (traits.rarityClass === RARITY_CLASSES.RARE ? 1 : 0) + (traits.rarityClass === RARITY_CLASSES.MYTHIC ? 2 : 0) + (traits.rarityClass === RARITY_CLASSES.GRAIL ? 4 : 0) + (traits.failureMode === "Fracture" ? 2 : 0) + (traits.failureMode === "VoidBloom" ? 1 : 0) + (traits.engineType === "Rupture" ? 1 : 0) + (traits.anomalyClass ? 2 : 0);
        const metadata = { name: `Dart HLGEN #${tokenId}`, description: `Deterministic generative artwork. Engine: ${traits.engineType}. Rarity: ${traits.rarityClass}.`, canonicalIntensity, canonicalTime, attributes: [
            { trait_type: "Rarity Class", value: traits.rarityClass }, { trait_type: "Engine Type", value: traits.engineType }, { trait_type: "Archetype", value: traits.archetype }, { trait_type: "Anchor Form", value: traits.anchorForm }, { trait_type: "Primary Driver", value: traits.primaryDriver }, { trait_type: "Structure Type", value: traits.structureType }, { trait_type: "Color Mood", value: traits.colorMood }, { trait_type: "Spatial Behavior", value: traits.spatialBehavior }, { trait_type: "Failure Mode", value: traits.failureMode }, { trait_type: "Anomaly Class", value: traits.anomalyClass || "None" }, { trait_type: "Canonical Intensity", value: canonicalIntensity.toFixed(3) }, { trait_type: "Event Score", value: eventScore.toString() }
        ] };
        return { seed, traits, baseTraits, canonicalIntensity, canonicalTime, pixels, metadata, width, height, freqIndex, eventScore };
    }
    
    // ============================================================
    // DRAW UTILITY
    // ============================================================
    
    function drawToCanvas(canvas, renderResult) {
        if (!canvas || !renderResult || !renderResult.pixels) return false;
        const { pixels, width, height } = renderResult;
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        return true;
    }
    
    // ============================================================
    // LIVE SESSION WITH SMOOTH FADE
    // ============================================================
    
    function createLiveSession(tokenId, txHash) {
        const canonical = renderCanonical(tokenId, txHash);
        let animationId = null;
        let canvasElement = null;
        let startTime = null;
        let fadeStartTime = null;
        const fadeDuration = 800;
        
        // Start with canonical values
        let currentLiveIntensity = canonical.canonicalIntensity;
        let targetLiveIntensity = canonical.canonicalIntensity;
        let currentLiveTime = canonical.canonicalTime;
        
        function renderFrame(fadeFactor = 1) {
            if (!canvasElement) return;
            const { width, height, traits, baseTraits, canonicalTime, canonicalIntensity, freqIndex } = canonical;
            const pixels = new Uint8ClampedArray(width * height * 4);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pixel = computePixel({ x, y, width, height, traits, baseTraits, time: canonicalTime, intensity: canonicalIntensity, freqIndex, mode: "live", liveIntensity: currentLiveIntensity, liveTime: currentLiveTime, fadeFactor });
                    const idx = (y * width + x) * 4;
                    pixels[idx] = pixel.r;
                    pixels[idx + 1] = pixel.g;
                    pixels[idx + 2] = pixel.b;
                    pixels[idx + 3] = 255;
                }
            }
            const ctx = canvasElement.getContext('2d');
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
            
            // Minimal overlay - just intensity meter
            const pressure = Math.pow(Math.max(0.05, Math.min(0.95, currentLiveIntensity)), 1.35) * fadeFactor;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(10, height - 30, 100, 5);
            let badgeText = "";
            if (pressure > 0.82) badgeText = "🔥 ASCENDED";
            else if (pressure > 0.60) badgeText = "✨ AWAKENED";
            else if (pressure > 0.35) badgeText = "⚡ STIRRING";
            if (badgeText) {
                ctx.fillStyle = `hsl(${pressure * 120}, 100%, 55%)`;
                ctx.fillRect(10, height - 30, currentLiveIntensity * 100, 5);
                ctx.font = "bold 10px monospace";
                ctx.fillStyle = `hsl(${pressure * 120}, 100%, 60%)`;
                ctx.fillText(badgeText, width - 80, height - 20);
            } else {
                ctx.fillStyle = `hsl(${currentLiveIntensity * 120}, 100%, 55%)`;
                ctx.fillRect(10, height - 30, currentLiveIntensity * 100, 5);
            }
        }
        
        function fetchIntensity() {
            fetch('https://raw.githubusercontent.com/ivxxbeats/farcaster-intensity/main/intensity.json?t=' + Date.now())
                .then(r => r.json())
                .then(data => { if (data && typeof data.intensity === 'number') targetLiveIntensity = Math.max(0.05, Math.min(0.95, data.intensity)); })
                .catch(() => console.warn("Intensity fetch failed"));
        }
        
        function startAnimation(canvas) {
            canvasElement = canvas;
            startTime = null;
            fadeStartTime = performance.now();
            
            // FIRST FRAME: Draw canonical (NO BLACK SCREEN!)
            drawToCanvas(canvas, canonical);
            
            function animate(timestamp) {
                if (!startTime) startTime = timestamp;
                const elapsed = (timestamp - startTime) / 1000;
                const fadeElapsed = timestamp - fadeStartTime;
                const rawFadeFactor = Math.min(1, fadeElapsed / fadeDuration);
                const fadeFactor = rawFadeFactor * rawFadeFactor * (3 - 2 * rawFadeFactor);
                const liveWarpTime = elapsed % (Math.PI * 2);
                currentLiveTime = canonical.canonicalTime * (1 - fadeFactor) + liveWarpTime * fadeFactor;
                const desiredIntensity = canonical.canonicalIntensity * (1 - fadeFactor) + targetLiveIntensity * fadeFactor;
                currentLiveIntensity += (desiredIntensity - currentLiveIntensity) * 0.15;
                renderFrame(fadeFactor);
                animationId = requestAnimationFrame(animate);
            }
            
            fetchIntensity();
            setInterval(fetchIntensity, 15000);
            animationId = requestAnimationFrame(animate);
        }
        
        function stop() { if (animationId) { cancelAnimationFrame(animationId); animationId = null; } }
        
        function updateInfoPanel() {
            const infoDiv = document.getElementById('info');
            if (infoDiv) infoDiv.innerHTML = `${canonical.traits.engineType} · ${canonical.traits.rarityClass} · ${canonical.traits.archetype} · ${canonical.traits.anchorForm} · ${canonical.traits.primaryDriver} · ${canonical.traits.failureMode} · ${canonical.traits.anomalyClass || 'None'} · ES: ${canonical.eventScore || 0}`;
        }
        
        return { startAnimation, stop, getCanonical: () => canonical, getLiveIntensity: () => currentLiveIntensity, setLiveIntensity: (val) => { targetLiveIntensity = Math.max(0.05, Math.min(0.95, val)); }, updateInfoPanel };
    }
    
    // ============================================================
    // AUTO INIT
    // ============================================================
    
    function autoInit() {
        const canvas = document.getElementById('artCanvas');
        if (!canvas) return;
        const params = new URLSearchParams(window.location.search);
        const tokenId = params.get('tokenId') || params.get('tid') || '1';
        const txHash = params.get('txHash') || params.get('h');
        const freeze = params.get('freeze') === 'true';
        const mode = params.get('mode') || (freeze ? 'canonical' : 'live');
        if (mode === 'canonical' || freeze) {
            const validTxHash = (txHash && txHash !== '0x0') ? txHash : `fallback_${tokenId}`;
            const result = renderCanonical(tokenId, validTxHash);
            drawToCanvas(canvas, result);
            const infoDiv = document.getElementById('info');
            if (infoDiv) infoDiv.innerHTML = `${result.traits.engineType} · ${result.traits.rarityClass} · ${result.traits.archetype} · ${result.traits.anchorForm} · ${result.traits.primaryDriver} · ${result.traits.failureMode} · ${result.traits.anomalyClass || 'None'} · ES:${result.eventScore || 0}`;
        } else {
            const validTxHash = (txHash && txHash !== '0x0') ? txHash : `fallback_${tokenId}`;
            const session = createLiveSession(tokenId, validTxHash);
            session.startAnimation(canvas);
            session.updateInfoPanel();
        }
    }
    
    window.DartHLGEN = { version: "1.6", renderCanonical, createLiveSession, drawToCanvas, getSeed, CONFIG };
    
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
    
    console.log("Dart HLGEN v1.6 - NO FLASH: Canonical first, pressure ramps with fade");
})();
