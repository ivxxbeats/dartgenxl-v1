// ============================================================
// PREVIEW SEED RENDER (tokenId only - NO txHash)
// This creates DIFFERENT results from canonical mint
// ============================================================

// Preview seed generator (same as in index.html)
function getPreviewSeed(tokenId) {
    const combined = `preview_snap_${tokenId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

// New function: renderPreview(tokenId) - uses only tokenId for seed
function renderPreview(tokenId, width = CONFIG.RENDER_WIDTH, height = CONFIG.RENDER_HEIGHT) {
    const seed = getPreviewSeed(tokenId);
    const validTxHash = `preview_${tokenId}`;
    
    // Use the same deterministic system but with preview seed
    const traits = generateTraits(seed, tokenId);
    const baseTraits = generateBaseTraits(seed, tokenId);
    
    // Preview intensity (different range from canonical)
    const previewIntensity = 0.3 + (seed % 100) / 100 * 0.4;
    
    const freqRNG = makeSeededRand(splitSeed(seed, 300));
    const freqIndex = Math.floor(freqRNG() * 4);
    
    const pixels = new Uint8ClampedArray(width * height * 4);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = computePixel({
                x, y, width, height, traits, baseTraits,
                time: 0.5, intensity: previewIntensity,
                freqIndex, mode: "canonical"
            });
            const idx = (y * width + x) * 4;
            pixels[idx] = pixel.r;
            pixels[idx + 1] = pixel.g;
            pixels[idx + 2] = pixel.b;
            pixels[idx + 3] = 255;
        }
    }
    
    const eventScore = (traits.rarityClass === RARITY_CLASSES.RARE ? 1 : 0) +
        (traits.rarityClass === RARITY_CLASSES.MYTHIC ? 2 : 0) +
        (traits.rarityClass === RARITY_CLASSES.GRAIL ? 4 : 0) +
        (traits.failureMode === "Fracture" ? 2 : 0) +
        (traits.failureMode === "VoidBloom" ? 1 : 0) +
        (traits.engineType === "Rupture" ? 1 : 0) +
        (traits.anomalyClass ? 2 : 0);
    
    return {
        seed, traits, baseTraits, canonicalIntensity: previewIntensity,
        pixels, width, height, freqIndex, eventScore,
        stabilityClass: "Preview", intensityBias: "Teaser", activationType: "Preview"
    };
}

// Add to window exports
window.DartHLGEN = {
    version: "1.9.0",
    renderCanonical,
    renderPreview,  // NEW: for teaser images
    createLiveSession,
    drawToCanvas,
    getSeed,
    CONFIG
};
