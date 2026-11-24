// static/js/earth/inspector.js

const Cesium = window.Cesium;

let viewer = null;
let clickHandler = null;
let selectedMarker = null;

let selectedLocation = null;


// =========================================================
// INITIALIZE EARTH INSPECTOR
// =========================================================

export function initializeInspector(cesiumViewer) {

    if (!cesiumViewer) {
        throw new Error("Cesium viewer is required.");
    }

    viewer = cesiumViewer;

    // Remove an old handler if this module is initialized again.
    destroyInspector();

    clickHandler =
        new Cesium.ScreenSpaceEventHandler(
            viewer.scene.canvas
        );

    clickHandler.setInputAction(
        handleEarthClick,
        Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    console.log("📍 Earth inspector ready.");
}


// =========================================================
// HANDLE EARTH CLICK
// =========================================================

function handleEarthClick(movement) {

    if (!viewer || !movement?.position) {
        return;
    }

    const scene = viewer.scene;

    let cartesian = null;


    // -----------------------------------------------------
    // TRY DEPTH PICKING FIRST
    //
    // Useful when World Terrain is enabled.
    // -----------------------------------------------------

    if (scene.pickPositionSupported) {

        const pickedObject =
            scene.pick(movement.position);

        if (Cesium.defined(pickedObject)) {

            try {

                cartesian =
                    scene.pickPosition(
                        movement.position
                    );

            } catch (error) {

                console.warn(
                    "⚠️ Depth position pick failed:",
                    error
                );
            }
        }
    }


    // -----------------------------------------------------
    // FALL BACK TO GLOBE PICKING
    //
    // This works well for ordinary globe/terrain clicks.
    // -----------------------------------------------------

    if (!Cesium.defined(cartesian)) {

        const ray =
            viewer.camera.getPickRay(
                movement.position
            );

        if (!ray) {
            return;
        }

        cartesian =
            scene.globe.pick(
                ray,
                scene
            );
    }


    if (!Cesium.defined(cartesian)) {
        return;
    }


    selectLocation(cartesian);
}


// =========================================================
// SELECT LOCATION
// =========================================================

function selectLocation(cartesian) {

    const cartographic =
        Cesium.Cartographic.fromCartesian(
            cartesian
        );


    if (!cartographic) {
        return;
    }


    const latitude =
        Cesium.Math.toDegrees(
            cartographic.latitude
        );


    const longitude =
        Cesium.Math.toDegrees(
            cartographic.longitude
        );


    const elevation =
        Number.isFinite(cartographic.height)
            ? cartographic.height
            : 0;


    selectedLocation = {

        latitude,
        longitude,
        elevation,

        cartesian
    };


    console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    console.log(
        "📍 Earth location selected"
    );

    console.log(
        "Latitude:",
        latitude.toFixed(6)
    );

    console.log(
        "Longitude:",
        longitude.toFixed(6)
    );

    console.log(
        "Elevation:",
        `${Math.round(elevation)} m`
    );

    console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    updateMarker(
        longitude,
        latitude,
        elevation
    );


    updateInspectorUI(
        selectedLocation
    );


    // -----------------------------------------------------
    // CUSTOM EVENT
    //
    // Other modules can listen for location selections
    // without inspector.js depending on Sentinel directly.
    // -----------------------------------------------------

    window.dispatchEvent(

        new CustomEvent(
            "earth-location-selected",
            {
                detail: {
                    latitude,
                    longitude,
                    elevation
                }
            }
        )

    );
}


// =========================================================
// MARKER
// =========================================================

function updateMarker(
    longitude,
    latitude,
    elevation
) {

    if (selectedMarker) {

        viewer.entities.remove(
            selectedMarker
        );

        selectedMarker = null;
    }


    selectedMarker =
        viewer.entities.add({

            id: "selected-earth-location",

            name: "Selected Location",

            position:
                Cesium.Cartesian3.fromDegrees(
                    longitude,
                    latitude,
                    Math.max(elevation, 0)
                ),

            point: {

                pixelSize: 12,

                color:
                    Cesium.Color.fromCssColorString(
                        "#8b80ff"
                    ),

                outlineColor:
                    Cesium.Color.WHITE,

                outlineWidth: 3,

                disableDepthTestDistance:
                    Number.POSITIVE_INFINITY
            }
        });


    viewer.scene.requestRender();
}


// =========================================================
// UPDATE UI
// =========================================================

function updateInspectorUI(location) {

    const latitudeElement =
        document.getElementById(
            "selectedLatitude"
        );


    const longitudeElement =
        document.getElementById(
            "selectedLongitude"
        );


    const elevationElement =
        document.getElementById(
            "selectedElevation"
        );


    const emptyState =
        document.getElementById(
            "inspectorEmpty"
        );


    const data =
        document.getElementById(
            "inspectorData"
        );


    if (latitudeElement) {

        latitudeElement.textContent =
            `${location.latitude.toFixed(6)}°`;
    }


    if (longitudeElement) {

        longitudeElement.textContent =
            `${location.longitude.toFixed(6)}°`;
    }


    if (elevationElement) {

        elevationElement.textContent =
            `${Math.round(location.elevation)} m`;
    }


    if (emptyState) {

        emptyState.hidden =
            true;
    }


    if (data) {

        data.hidden =
            false;
    }
}


// =========================================================
// CLEAR SELECTION
// =========================================================

export function clearSelectedLocation() {

    if (
        viewer &&
        selectedMarker
    ) {

        viewer.entities.remove(
            selectedMarker
        );
    }


    selectedMarker = null;
    selectedLocation = null;


    const emptyState =
        document.getElementById(
            "inspectorEmpty"
        );


    const data =
        document.getElementById(
            "inspectorData"
        );


    if (emptyState) {

        emptyState.hidden =
            false;
    }


    if (data) {

        data.hidden =
            true;
    }


    viewer?.scene.requestRender();
}


// =========================================================
// GET SELECTED LOCATION
// =========================================================

export function getSelectedLocation() {

    if (!selectedLocation) {
        return null;
    }


    return {
        latitude:
            selectedLocation.latitude,

        longitude:
            selectedLocation.longitude,

        elevation:
            selectedLocation.elevation
    };
}


// =========================================================
// DESTROY
// =========================================================

export function destroyInspector() {

    if (clickHandler) {

        clickHandler.destroy();

        clickHandler = null;
    }
}