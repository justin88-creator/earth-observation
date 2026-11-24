// static/js/earth/viewer.js

const Cesium = window.Cesium;

let viewer = null;


// =========================================================
// CREATE EARTH
// =========================================================

export async function createEarth(cesiumToken) {

    if (!window.Cesium) {
        throw new Error(
            "CesiumJS is not loaded."
        );
    }

    if (!cesiumToken?.trim()) {
        throw new Error(
            "Cesium token is missing."
        );
    }


    Cesium.Ion.defaultAccessToken =
        cesiumToken.trim();


    console.log(
        "🌍 Creating Cesium 3D Earth..."
    );


    viewer =
        new Cesium.Viewer(
            "cesiumContainer",
            {
                // imagery.js handles imagery
                baseLayer: false,

                baseLayerPicker: false,

                animation: false,
                timeline: false,
                geocoder: false,
                homeButton: false,
                sceneModePicker: false,
                navigationHelpButton: false,
                fullscreenButton: false,
                selectionIndicator: false,
                infoBox: false,

                scene3DOnly: true,

                shouldAnimate: false,

                terrainProvider:
                    new Cesium.EllipsoidTerrainProvider()
            }
        );


    configureScene();

    configureCamera();

    setInitialView();


    console.log(
        "✅ Cesium 3D Earth created."
    );


    return viewer;
}


// =========================================================
// SCENE
// =========================================================

function configureScene() {

    const scene =
        viewer.scene;


    scene.globe.show =
        true;


    scene.globe.showGroundAtmosphere =
        true;


    scene.globe.enableLighting =
        false;


    scene.globe.depthTestAgainstTerrain =
        false;


    /*
        Lower = more terrain/globe detail.

        Don't make this extremely low because it can
        increase rendering work considerably.
    */

    scene.globe.maximumScreenSpaceError =
        2;


    scene.fog.enabled =
        true;


    if (scene.skyAtmosphere) {

        scene.skyAtmosphere.show =
            true;
    }


    if (scene.skyBox) {

        scene.skyBox.show =
            true;
    }


    if (scene.sun) {

        scene.sun.show =
            true;
    }


    if (scene.moon) {

        scene.moon.show =
            true;
    }


    scene.backgroundColor =
        Cesium.Color.BLACK;
}


// =========================================================
// CAMERA
// =========================================================

function configureCamera() {

    const controller =
        viewer.scene
            .screenSpaceCameraController;


    controller.enableInputs =
        true;


    controller.enableRotate =
        true;


    controller.enableTranslate =
        true;


    controller.enableZoom =
        true;


    controller.enableTilt =
        true;


    controller.enableLook =
        true;


    /*
        Allows us to get close to buildings without
        stopping several kilometres above the surface.
    */

    controller.minimumZoomDistance =
        5;


    controller.maximumZoomDistance =
        50_000_000;


    controller.inertiaSpin =
        0.85;


    controller.inertiaTranslate =
        0.85;


    controller.inertiaZoom =
        0.8;


    console.log(
        "🎮 Camera navigation configured."
    );
}


// =========================================================
// INITIAL VIEW
// =========================================================

function setInitialView() {

    viewer.camera.setView({

        destination:
            Cesium.Cartesian3.fromDegrees(
                8,
                8,
                20_000_000
            ),

        orientation: {

            heading:
                0,

            pitch:
                Cesium.Math.toRadians(
                    -90
                ),

            roll:
                0
        }
    });
}


// =========================================================
// GET VIEWER
// =========================================================

export function getViewer() {

    if (!viewer) {

        throw new Error(
            "Cesium viewer has not been initialized."
        );
    }

    return viewer;
}