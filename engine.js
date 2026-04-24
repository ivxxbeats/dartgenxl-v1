// ============================================================
// DART GENXL ENGINE v1.8.3
// FIXED: Intensity drift on refresh - resets target per session
// ============================================================

(function() {
    "use strict";
    
    const CONFIG = {
        RENDER_WIDTH: 640,
        RENDER_HEIGHT: 640,
        SEED_SALT: "dart_genxl_v1"
    };
    
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
    const ANOMALY_CLASSES = ["Interference", "Collapse", "EchoLoop", "SpectralSplit"];
    const FAILURE_MODES = ["Recovering", "Residual", "VoidBloom", "Fracture"];
    const COLOR_MOODS = ["Ethereal", "Volcanic", "StellarDrift", "Nebula", "SolarFlare", "DeepVoid", "PrismCore", "AuroraBorealis"];
    
    const SPATIAL_BEHAVIORS = [
        "Radial", "Spiral", "FlowField", "Kaleido", "Vortex", "Asymmetrical",
        "Orbit", "Tunnel", "FaultGrid", "MirrorSplit", "PressureWell"
    ];
    
    const CANONICAL_VARIANTS = ["Breathing", "Pulsing", "Steady", "Harmonic"];
    const ECHO_VARIANTS = ["Ghost", "Resonant", "Trailing", "Reverberant"];
    const RUPTURE_VARIANTS = ["Tear", "Shatter", "Pressure", "Collapse"];
    const MICRO_EVENTS = ["None", "SignalScar", "PhaseGlitch", "MemoryFlicker", "Crackle"];
    
    const LOG2 = Math.log(2);
    
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
    
    function makeSeededRand(seed) { return splitmix64(seed); }
    
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
    // DERIVED TRAITS
    // ============================================================
    function getStabilityClass(failureMode, engineType, rarityClass) {
        if (rarityClass === RARITY_CLASSES.GRAIL) return "Chaos-Bound";
        if (failureMode === "Fracture") return "Unstable";
        if (failureMode === "VoidBloom") return "Decaying";
        if (failureMode === "Residual") return "Fading";
        if (engineType === "Rupture") return "Volatile";
        if (engineType === "Echo") return "Resonant";
        return "Stable";
    }
    
    function getIntensityBias(canonicalIntensity, engineType) {
        if (canonicalIntensity > 0.75) return "High-Frequency";
        if (canonicalIntensity > 0.5) return "Pulsed";
        if (canonicalIntensity > 0.25) return "Low-Hum";
        if (engineType === "Rupture") return "Spiking";
        return "Dormant";
    }
    
    function getActivationType(primaryDriver, archetype) {
        if (primaryDriver === "Fractal" && archetype === "Rift") return "Deep Fracture";
        if (primaryDriver === "Pattern") return "Rhythmic";
        if (primaryDriver === "Color") return "Chromatic";
        if (primaryDriver === "Composition") return "Structural";
        if (archetype === "Void") return "Null-State";
        return "Linear";
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
            [RARITY_CLASSES.COMMON]: [0.20,0.18,0.15,0.17,0.18,0.12], 
            [RARITY_CLASSES.UNCOMMON]: [0.17,0.17,0.17,0.17,0.18,0.14], 
            [RARITY_CLASSES.RARE]: [0.14,0.16,0.20,0.16,0.18,0.16], 
            [RARITY_CLASSES.MYTHIC]: [0.10,0.14,0.22,0.14,0.20,0.20], 
            [RARITY_CLASSES.GRAIL]: [0.12,0.14,0.18,0.12,0.28,0.16] 
        }; 
        return weightedPick(ARCHETYPES, weights[rarityClass] || weights[RARITY_CLASSES.COMMON], rng); 
    }
    
    function rollAnchorForm(archetype, rng) { 
        const weights = { 
            "Signal": [0.10,0.28,0.08,0.30,0.18,0.06], 
            "Drift": [0.18,0.22,0.06,0.08,0.32,0.14], 
            "Rift": [0.06,0.08,0.46,0.12,0.10,0.18], 
            "Core": [0.32,0.26,0.06,0.16,0.10,0.10], 
            "Prism": [0.12,0.30,0.10,0.20,0.16,0.12], 
            "Void": [0.28,0.16,0.18,0.14,0.08,0.16] 
        }; 
        return weightedPick(ANCHOR_FORMS, weights[archetype] || weights.Signal, rng); 
    }
    
    function rollEngineType(rng, rarityClass) { 
        if (rarityClass === RARITY_CLASSES.GRAIL) return weightedPick(ENGINE_TYPES, [0.10,0.20,0.70], rng); 
        return weightedPick(ENGINE_TYPES, [0.78,0.19,0.03], rng); 
    }
    
    function rollPrimaryDriver(rng) { 
        return weightedPick(PRIMARY_DRIVERS, [0.35,0.25,0.25,0.15], rng); 
    }
    
    function rollStructureType(rng) { 
        return STRUCTURE_TYPES[Math.floor(rng() * STRUCTURE_TYPES.length)]; 
    }
    
    function rollColorMood(rng) { 
        return COLOR_MOODS[Math.floor(rng() * COLOR_MOODS.length)]; 
    }
    
    function rollSpatialBehavior(engineType, rng) { 
        const options = {
            "Canonical": ["Radial", "Spiral", "Kaleido", "Orbit", "Tunnel"],
            "Echo": ["FlowField", "Vortex", "Asymmetrical", "PressureWell", "MirrorSplit"],
            "Rupture": ["Asymmetrical", "Vortex", "Radial", "FaultGrid", "Tunnel"]
        };
        const pool = options[engineType] || options.Canonical;
        return pool[Math.floor(rng() * pool.length)];
    }
    
    function rollFailureMode(rng, engineType, rarityClass) { 
        if (rarityClass === RARITY_CLASSES.GRAIL) { 
            if (engineType === "Rupture") return weightedPick(FAILURE_MODES, [0.05,0.10,0.15,0.70], rng); 
            if (engineType === "Echo") return weightedPick(FAILURE_MODES, [0.10,0.45,0.30,0.15], rng); 
            return weightedPick(FAILURE_MODES, [0.30,0.35,0.25,0.10], rng); 
        } 
        if (engineType === "Canonical") return weightedPick(FAILURE_MODES, [0.70,0.20,0.08,0.02], rng); 
        if (engineType === "Echo") return weightedPick(FAILURE_MODES, [0.30,0.45,0.20,0.05], rng); 
        return weightedPick(FAILURE_MODES, [0.15,0.20,0.15,0.50], rng); 
    }
    
    function rollAnomalyClass(rng) { 
        return weightedPick(ANOMALY_CLASSES, [0.25,0.25,0.25,0.25], rng); 
    }
    
    function rollEngineVariant(engineType, rng) {
        if (engineType === "Canonical") return CANONICAL_VARIANTS[Math.floor(rng() * CANONICAL_VARIANTS.length)];
        if (engineType === "Echo") return ECHO_VARIANTS[Math.floor(rng() * ECHO_VARIANTS.length)];
        return RUPTURE_VARIANTS[Math.floor(rng() * RUPTURE_VARIANTS.length)];
    }
    
    function generateTraits(seed, tokenId) {
        const streams = {}; 
        for (let i = 1; i <= 12; i++) streams[i] = makeSeededRand(splitSeed(seed, i));
        
        const tokenNum = parseInt(tokenId, 10) || 0;
        const steps = (tokenNum * 997) % 1000;
        for (let i = 0; i < steps; i++) {
            for (let s = 1; s <= 12; s++) {
                if (streams[s]) streams[s]();
            }
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
        
        const traits = { 
            rarityClass, archetype, anchorForm, engineType, primaryDriver, 
            colorMood, structureType, spatialBehavior, failureMode 
        };
        
        if (rarityClass === RARITY_CLASSES.GRAIL) traits.anomalyClass = rollAnomalyClass(rng);
        
        traits.motionVariant = Math.floor(streams[8]() * 6);
        traits.textureVariant = Math.floor(streams[9]() * 8);
        traits.paletteVariant = Math.floor(streams[10]() * 5);
        traits.engineVariant = rollEngineVariant(engineType, streams[11]);
        traits.microEvent = streams[7]() < 0.08 ? MICRO_EVENTS[Math.floor(streams[7]() * MICRO_EVENTS.length)] : "None";
        
        return traits;
    }
    
    function generateBaseTraits(seed, tokenId) {
        const streams = {}; 
        for (let i = 1; i <= 12; i++) streams[i] = makeSeededRand(splitSeed(seed, i + 100));
        
        const tokenNum = parseInt(tokenId, 10) || 0;
        const steps = (tokenNum * 997) % 1000;
        for (let i = 0; i < steps; i++) {
            for (let s = 1; s <= 12; s++) {
                if (streams[s]) streams[s]();
            }
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
            iterMult, layers,
            microWarp: 0.5 + varietyRNG() * 1.5,
            grainScale: 0.8 + varietyRNG() * 2.2,
            phaseBias: varietyRNG() * Math.PI * 2,
            symmetryBreak: (varietyRNG() - 0.5) * 0.35
        };
    }
    
    function getCanonicalIntensity(seed) { 
        const rng = makeSeededRand(splitSeed(seed, 200)); 
        return 0.32 + rng() * 0.58; 
    }
    
    function getCanonicalTime(tokenId, seed, intensity) { 
        const tokenNum = parseInt(tokenId, 10) || 0; 
        return ((tokenNum * 0.0123456789) + (seed * 0.0000001) + (intensity * 0.1)) % 1.0; 
    }
    
    // ============================================================
    // GEOMETRY HELPERS (condensed for brevity - full implementations assumed)
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
        }
        else if (anchorForm === "Nexus") { 
            const nexus = Math.exp(-(rx * rx + ry * ry) * 2.6) * amp * 1.2; 
            result = t * (0.84 - pressure * 0.04) + nexus * (0.16 + pressure * 0.06); 
        }
        else if (anchorForm === "Faultline") { 
            const fault = Math.abs(Math.sin(rx * 10.0 - ry * 6.0)) * amp; 
            result = t * (0.86 - pressure * 0.03) + fault * (0.14 + pressure * 0.05); 
        }
        else if (anchorForm === "Bloom") { 
            const r = Math.sqrt(rx * rx + ry * ry); 
            const bloom = (Math.sin(r * 14.0) * 0.5 + 0.5) * amp; 
            result = t * (0.88 - pressure * 0.03) + bloom * (0.12 + pressure * 0.04); 
        }
        else if (anchorForm === "PrismHeart") { 
            const prism = (Math.abs(rx) + Math.abs(ry)) * amp * 0.8; 
            result = t * (0.90 - pressure * 0.02) + prism * (0.10 + pressure * 0.03); 
        }
        else if (anchorForm === "Aether") { 
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
    
    function getPatternValue(x, y, time, engineName, pressure, primaryDriver, rx, ry, liveTime, microWarp, phaseBias, motionVariant) {
        const r = Math.sqrt(x * x + y * y); 
        const a = Math.atan2(y, x);
        let val = 0;
        const warpedR = r * (1 + microWarp * 0.1);
        const warpedA = a + phaseBias * 0.2;
        
        if (engineName === "Echo") { 
            val = Math.sin(warpedA * 3 - warpedR * (12 + pressure * 4) + time) * 0.4; 
            val += Math.sin(warpedA * 6 + warpedR * (6 + pressure * 3) - time * 0.3) * 0.2; 
        }
        else if (engineName === "Rupture") { 
            val = Math.sin(warpedA * (8 + pressure * 4) - warpedR * (25 + pressure * 10) + time * 2) * 0.3; 
            val += Math.sin(warpedA * (16 + pressure * 6) + warpedR * (15 + pressure * 8) - time * 1.5) * 0.2; 
            val += Math.sin(warpedR * (30 + pressure * 15)) * 0.15; 
        }
        else { 
            val = Math.sin(warpedA * 5 - warpedR * 18 + time) * 0.35; 
            val += Math.sin(warpedA * 10 + warpedR * 9 - time * 0.5) * 0.15; 
        }
        
        const motionFactor = 1 + (motionVariant - 2.5) * 0.05;
        
        if (primaryDriver === "Pattern") val += Math.sin(rx * 10 + ry * 10 + liveTime) * 0.15 * pressure * motionFactor;
        else if (primaryDriver === "Fractal") val = Math.pow(val, 0.8 - pressure * 0.1);
        else if (primaryDriver === "Composition") val *= 1 + pressure * 0.2;
        return Math.max(0.02, Math.min(0.98, (val + 0.5)));
    }
    
    function applyCompositionTransform(ux, uy, composition, zoom, offsetX, offsetY, symmetryBreak) {
        let x = ux / zoom + offsetX; 
        let y = uy / zoom + offsetY;
        
        x += symmetryBreak * 0.2;
        y -= symmetryBreak * 0.15;
        
        switch(composition) {
            case "Radial": const r = Math.sqrt(x*x + y*y); const a = Math.atan2(y, x); x = a; y = r; break;
            case "Spiral": const sr = Math.sqrt(x*x + y*y); const sa = Math.atan2(y, x); const spiralR = Math.pow(sr, 0.7) * 1.5; x = Math.cos(sa + spiralR * 4) * spiralR; y = Math.sin(sa + spiralR * 4) * spiralR; break;
            case "FlowField": const angle = Math.sin(x * 3) * Math.cos(y * 3); const cosA = Math.cos(angle); const sinA = Math.sin(angle); const nx = x * cosA - y * sinA; const ny = x * sinA + y * cosA; x = nx; y = ny; break;
            case "Kaleido": let angleK = Math.atan2(y, x); let radiusK = Math.sqrt(x*x + y*y); let segments = 6; angleK = angleK % (Math.PI * 2 / segments); if (angleK > Math.PI / segments) angleK = (Math.PI * 2 / segments) - angleK; x = Math.cos(angleK) * radiusK; y = Math.sin(angleK) * radiusK; break;
            case "Vortex": let vr = Math.sqrt(x*x + y*y); let va = Math.atan2(y, x); va += vr * 2.0; x = Math.cos(va) * vr; y = Math.sin(va) * vr; break;
            case "Asymmetrical": x *= 1.3; y *= 0.6; break;
            case "Orbit": const orbitR = Math.sqrt(x*x + y*y); const orbitA = Math.atan2(y, x); const orbitOffset = orbitR * 0.8; x = Math.cos(orbitA + orbitOffset) * orbitR; y = Math.sin(orbitA + orbitOffset) * orbitR; break;
            case "Tunnel": const tunnelZ = Math.sqrt(x*x + y*y); const tunnelTheta = Math.atan2(y, x); x = Math.sin(tunnelTheta * 3 + tunnelZ * 2) * (1 - tunnelZ * 0.3); y = Math.cos(tunnelTheta * 2 + tunnelZ * 3) * (1 - tunnelZ * 0.3); break;
            case "FaultGrid": const gridX = Math.sin(x * 4) * 0.3; const gridY = Math.cos(y * 4) * 0.3; x = x + gridX; y = y + gridY; break;
            case "MirrorSplit": if (x < 0) x = -x; if (y < 0) y = -y; x = x * 1.2; y = y * 1.2; break;
            case "PressureWell": const wellDist = Math.sqrt(x*x + y*y); const wellStrength = Math.exp(-wellDist * 2); x = x * (1 - wellStrength * 0.5); y = y * (1 - wellStrength * 0.5); break;
        }
        return { x, y };
    }
    
    function getRichColor(t, colorMood, time, primaryDriver, pressure, paletteVariant) {
        let r, g, b;
        const colorBoost = 1 + pressure * 0.3;
        const hueShift = (paletteVariant - 2) * 0.05;
        
        if (primaryDriver === "Color") {
            r = Math.sin(t * 40 + time + hueShift) * 0.5 + 0.5;
            g = Math.sin(t * 40 + 2.094 + time + hueShift) * 0.5 + 0.5;
            b = Math.sin(t * 40 + 4.188 + time + hueShift) * 0.5 + 0.5;
            return { r: Math.min(0.85, Math.max(0.15, r * colorBoost * 1.2)), g: Math.min(0.85, Math.max(0.15, g * colorBoost * 1.2)), b: Math.min(0.85, Math.max(0.15, b * colorBoost * 1.2)) };
        }
        
        const chroma = 0.7 + pressure * 0.2;
        switch(colorMood) {
            case "Volcanic": r = 1.0; g = 0.1 + 0.7 * Math.sin(t * 12 + time + hueShift) * chroma; b = 0.0; break;
            case "SolarFlare": r = 1.0; g = 0.5 + 0.5 * Math.sin(t * 14 + time + hueShift) * chroma; b = 0.0; break;
            default: r = Math.sin(t * 25 + time + hueShift) * (0.5 + pressure * 0.15) + 0.5; g = Math.sin(t * 25 + 2.094 + time * 1.3 + hueShift) * (0.5 + pressure * 0.15) + 0.5; b = Math.sin(t * 25 + 4.188 + time * 0.7 + hueShift) * (0.5 + pressure * 0.15) + 0.5; break;
        }
        return { r: Math.min(0.85, Math.max(0.15, r * colorBoost)), g: Math.min(0.85, Math.max(0.15, g * colorBoost)), b: Math.min(0.85, Math.max(0.15, b * colorBoost)) };
    }
    
    function signatureColor(t, time, pressure) { 
        const base = t * (30 + pressure * 15) + time; 
        return { r: Math.sin(base) * 0.5 + 0.5, g: Math.sin(base + 2.094) * 0.5 + 0.5, b: Math.sin(base + 4.188) * 0.5 + 0.5 }; 
    }
    
    function engineFrequencyShape(t, engineName, freqMultiplier, pressure, engineVariant) {
        let out;
        let variantFactor = 1.0;
        if (engineVariant === "Breathing") variantFactor = 0.9;
        else if (engineVariant === "Pulsing") variantFactor = 1.1;
        else if (engineVariant === "Harmonic") variantFactor = 1.2;
        else if (engineVariant === "Ghost") variantFactor = 0.85;
        else if (engineVariant === "Resonant") variantFactor = 1.15;
        else if (engineVariant === "Trailing") variantFactor = 0.95;
        else if (engineVariant === "Reverberant") variantFactor = 1.05;
        else if (engineVariant === "Tear") variantFactor = 1.2;
        else if (engineVariant === "Shatter") variantFactor = 1.3;
        else if (engineVariant === "Pressure") variantFactor = 0.9;
        
        if (engineName === "Canonical") { 
            out = Math.sin(t * Math.PI * freqMultiplier * (0.8 + pressure * 0.1) * variantFactor); 
            out = (out + 1) / 2; 
        }
        else if (engineName === "Echo") { 
            const a = Math.sin(t * Math.PI * freqMultiplier * (0.55 + pressure * 0.15)); 
            const b = Math.cos(t * Math.PI * (2.0 + pressure * 0.5)); 
            out = (a * (0.65 - pressure * 0.1) + b * (0.35 + pressure * 0.1) + 1) / 2; 
        }
        else { 
            out = Math.sin(t * Math.PI * freqMultiplier * (1.35 + pressure * 0.3)
