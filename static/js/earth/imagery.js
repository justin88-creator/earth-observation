// static/js/earth/imagery.js

const Cesium = window.Cesium;

const GOOGLE_SATELLITE_ASSET_ID = 3830182;

let viewer = null;
let baseImageryLayer = null;


// =========================================================
// INITIALIZE GOOGLE SATELLITE IMAGERY
// =========================================================

export async function initializeImagery(cesiumViewer) {

    if (!cesiumViewer) {
        throw new Error("Cesium viewer is required.");
    }

    viewer = cesiumViewer;

    console.log("🌎 Loading Google Maps 2D Satellite...");
    console.log("📦 Cesium version:", Cesium.VERSION);

    // -----------------------------------------------------
    // VERIFY PROVIDER EXISTS
    // -----------------------------------------------------

    if (
        typeof Cesium.Google2DImageryProvider ===
        "undefined"
    ) {
        throw new Error(
            `Google2DImageryProvider is unavailable. ` +
            `Loaded Cesium version: ${Cesium.VERSION}`
        );
    }


    try {

        // -------------------------------------------------
        // CREATE GOOGLE PROVIDER
        // -------------------------------------------------

        const provider =
            await Cesium.Google2DImageryProvider
                .fromIonAssetId({

                    assetId:
                        GOOGLE_SATELLITE_ASSET_ID,

                    mapType:
                        "satellite",

                    maximumLevel:
                        22
                });


        console.log(
            "✅ Google 2D provider created."
        );


        // -------------------------------------------------
        // ADD TO CESIUM
        // -------------------------------------------------

        baseImageryLayer =
            viewer.imageryLayers
                .addImageryProvider(
                    provider
                );


        baseImageryLayer.show = true;
        baseImageryLayer.alpha = 1;

        baseImageryLayer.brightness = 1;
        baseImageryLayer.contrast = 1;
        baseImageryLayer.saturation = 1;
        baseImageryLayer.gamma = 1;


        console.log(
            "✅ Google Maps 2D Satellite active."
        );


        return baseImageryLayer;

    }

    catch (error) {

        console.error(
            "❌ Google Maps 2D Satellite failed:",
            error
        );

        // Don't hide the problem with OpenStreetMap.
        throw error;
    }
}


// =========================================================
// SHOW / HIDE
// =========================================================

export function setBaseImageryVisible(
    visible
) {

    if (!baseImageryLayer) {
        return;
    }

    baseImageryLayer.show =
        Boolean(visible);

    viewer?.scene.requestRender();
}


// =========================================================
// OPACITY
// =========================================================

export function setBaseImageryOpacity(
    opacity
) {

    if (!baseImageryLayer) {
        return;
    }

    const value =
        Number(opacity);

    if (!Number.isFinite(value)) {
        return;
    }

    baseImageryLayer.alpha =
        Cesium.Math.clamp(
            value,
            0,
            1
        );

    viewer?.scene.requestRender();
}


// =========================================================
// GET LAYER
// =========================================================

export function getBaseImageryLayer() {

    return baseImageryLayer;
}