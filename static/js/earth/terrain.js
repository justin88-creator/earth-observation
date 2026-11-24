// static/js/earth/terrain.js

const Cesium =
    window.Cesium;

let viewer = null;

let worldTerrain = null;

let loading = false;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeTerrain(
    cesiumViewer
) {

    viewer =
        cesiumViewer;


    const checkbox =
        document.getElementById(
            "terrainLayer"
        );


    checkbox?.addEventListener(
        "change",
        async () => {

            if (checkbox.checked) {

                await enableTerrain();

            } else {

                disableTerrain();
            }
        }
    );


    console.log(
        "⛰️ Terrain system ready."
    );
}


// =========================================================
// ENABLE
// =========================================================

export async function enableTerrain() {

    if (
        !viewer ||
        loading
    ) {
        return;
    }


    loading = true;


    setStatus(
        "Loading 3D terrain..."
    );


    try {

        if (!worldTerrain) {

            worldTerrain =
                await Cesium
                    .createWorldTerrainAsync({
                        requestVertexNormals:
                            false,

                        requestWaterMask:
                            false
                    });
        }


        viewer.terrainProvider =
            worldTerrain;


        setStatus(
            "3D terrain active"
        );


        console.log(
            "✅ World Terrain active."
        );

    }

    catch (error) {

        console.error(
            "❌ Terrain error:",
            error
        );

    }

    finally {

        loading = false;
    }
}


// =========================================================
// DISABLE
// =========================================================

export function disableTerrain() {

    if (!viewer) {
        return;
    }


    viewer.terrainProvider =
        new Cesium
            .EllipsoidTerrainProvider();


    setStatus(
        "3D terrain off"
    );
}


// =========================================================
// STATUS
// =========================================================

function setStatus(message) {

    const element =
        document.getElementById(
            "mapStatusText"
        );


    if (element) {
        element.textContent = message;
    }
}