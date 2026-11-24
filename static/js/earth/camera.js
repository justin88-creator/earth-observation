// static/js/earth/camera.js

const Cesium =
    window.Cesium;

let viewer = null;

let updateTimer = null;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeCamera(
    cesiumViewer
) {

    viewer =
        cesiumViewer;


    if (!viewer) {
        throw new Error(
            "Viewer required."
        );
    }


    viewer.camera.changed
        .addEventListener(
            handleCameraChanged
        );


    updateCameraDisplay();


    console.log(
        "📷 Camera system ready."
    );
}


// =========================================================
// CAMERA CHANGED
// =========================================================

function handleCameraChanged() {

    if (updateTimer) {
        return;
    }


    updateTimer =
        setTimeout(
            () => {

                updateTimer = null;

                updateCameraDisplay();

            },
            150
        );
}


// =========================================================
// POSITION
// =========================================================

export function getCameraPosition() {

    if (!viewer) {
        return null;
    }


    const position =
        viewer.camera
            .positionCartographic;


    if (!position) {
        return null;
    }


    return {

        longitude:
            Cesium.Math.toDegrees(
                position.longitude
            ),

        latitude:
            Cesium.Math.toDegrees(
                position.latitude
            ),

        height:
            position.height
    };
}


// =========================================================
// HEIGHT
// =========================================================

export function getCameraHeight() {

    return (
        getCameraPosition()
            ?.height ??
        NaN
    );
}


// =========================================================
// DISPLAY
// =========================================================

function updateCameraDisplay() {

    const position =
        getCameraPosition();


    if (!position) {
        return;
    }


    setText(
        "latitude",
        position.latitude
            .toFixed(4)
    );


    setText(
        "longitude",
        position.longitude
            .toFixed(4)
    );


    setText(
        "cameraHeight",
        formatHeight(
            position.height
        )
    );
}


// =========================================================
// ZOOM
// =========================================================

export function zoomIn() {

    if (!viewer) {
        return;
    }


    const height =
        getCameraHeight();


    viewer.camera.zoomIn(
        Math.max(
            height * 0.30,
            50
        )
    );
}


export function zoomOut() {

    if (!viewer) {
        return;
    }


    const height =
        getCameraHeight();


    viewer.camera.zoomOut(
        Math.max(
            height * 0.40,
            50
        )
    );
}


// =========================================================
// WHOLE EARTH
// =========================================================

export function flyToWholeEarth() {

    if (!viewer) {
        return;
    }


    viewer.camera.flyTo({

        destination:
            Cesium.Cartesian3
                .fromDegrees(
                    8,
                    8,
                    20_000_000
                ),

        orientation: {

            heading:
                0,

            pitch:
                Cesium.Math
                    .toRadians(-90),

            roll:
                0
        },

        duration:
            1.5
    });
}


// =========================================================
// LOCATION
// =========================================================

export function flyToLocation(
    longitude,
    latitude,
    height = 50_000
) {

    if (!viewer) {
        return;
    }


    const lon =
        Number(longitude);

    const lat =
        Number(latitude);


    if (
        !Number.isFinite(lon) ||
        !Number.isFinite(lat)
    ) {

        return;
    }


    viewer.camera.flyTo({

        destination:
            Cesium.Cartesian3
                .fromDegrees(
                    lon,
                    lat,
                    height
                ),

        orientation: {

            heading:
                0,

            pitch:
                Cesium.Math
                    .toRadians(-90),

            roll:
                0
        },

        duration:
            2
    });
}


// =========================================================
// HELPERS
// =========================================================

function formatHeight(meters) {

    if (meters >= 1000) {

        return (
            meters / 1000
        ).toFixed(1) + " km";
    }


    return (
        Math.round(meters) +
        " m"
    );
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }
}