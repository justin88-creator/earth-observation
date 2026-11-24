// =========================================================
// static/js/weather/weather-marker.js
// =========================================================
//
// CESIUM SELECTED-LOCATION WEATHER MARKER
//
// Exports:
//   initializeWeatherMarker()
//   showWeatherMarker()
//   clearWeatherMarker()
//
// IMPORTANT:
// This file DOES NOT import itself.
//
// =========================================================

const Cesium = window.Cesium;


// =========================================================
// STATE
// =========================================================

let viewer = null;

let weatherEntity = null;

let initialized = false;


// =========================================================
// INITIALIZE WEATHER MARKER
// =========================================================

export function initializeWeatherMarker(cesiumViewer) {

    if (initialized) {

        console.log(
            "ℹ️ Weather marker already initialized."
        );

        return;
    }


    if (!Cesium) {

        throw new Error(
            "CesiumJS is not loaded."
        );
    }


    if (!cesiumViewer) {

        throw new Error(
            "Cesium viewer is required by weather-marker.js."
        );
    }


    viewer = cesiumViewer;

    initialized = true;


    console.log(
        "🌦️ Cesium weather marker ready."
    );
}


// =========================================================
// SHOW WEATHER MARKER
// =========================================================

export function showWeatherMarker({

    latitude,

    longitude,

    locationName,

    temperature,

    weatherCode,

    condition

}) {

    // -----------------------------------------------------
    // CHECK VIEWER
    // -----------------------------------------------------

    if (!viewer) {

        console.error(
            "❌ Weather marker has not been initialized."
        );

        return;
    }


    // -----------------------------------------------------
    // CONVERT VALUES
    // -----------------------------------------------------

    latitude =
        Number(latitude);


    longitude =
        Number(longitude);


    temperature =
        Number(temperature);


    weatherCode =
        Number(weatherCode);


    // -----------------------------------------------------
    // VALIDATE COORDINATES
    // -----------------------------------------------------

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        console.error(
            "❌ Invalid weather coordinates:",
            latitude,
            longitude
        );

        return;
    }


    // -----------------------------------------------------
    // TEMPERATURE FALLBACK
    // -----------------------------------------------------

    if (!Number.isFinite(temperature)) {

        temperature = 0;
    }


    // =====================================================
    // REMOVE PREVIOUS WEATHER
    // =====================================================

    clearWeatherMarker();


    // =====================================================
    // WEATHER INFORMATION
    // =====================================================

    const icon =
        getWeatherIcon(
            weatherCode
        );


    const shortName =
        getShortLocationName(
            locationName
        );


    const image =
        createWeatherImage(
            icon
        );


    // =====================================================
    // CREATE CESIUM ENTITY
    // =====================================================

    weatherEntity =
        viewer.entities.add({

            name:
                `Weather - ${shortName}`,


            // =================================================
            // GEOGRAPHIC POSITION
            // =================================================

            position:

                Cesium.Cartesian3
                    .fromDegrees(

                        longitude,

                        latitude,

                        1500
                    ),


            // =================================================
            // WEATHER ICON
            // =================================================

            billboard: {

                image:
                    image,


                width:
                    90,


                height:
                    90,


                horizontalOrigin:

                    Cesium.HorizontalOrigin
                        .CENTER,


                verticalOrigin:

                    Cesium.VerticalOrigin
                        .BOTTOM,


                pixelOffset:

                    new Cesium.Cartesian2(
                        0,
                        -10
                    ),


                // Keeps icon visible above satellite imagery.

                disableDepthTestDistance:

                    Number.POSITIVE_INFINITY,


                // Scale depending on camera distance.

                scaleByDistance:

                    new Cesium.NearFarScalar(

                        500,

                        1.4,

                        4000000,

                        0.45
                    ),


                // Hide when extremely far away.

                distanceDisplayCondition:

                    new Cesium.DistanceDisplayCondition(

                        0,

                        5000000
                    )
            },


            // =================================================
            // TEMPERATURE + LOCATION
            // =================================================

            label: {

                text:

                    `${shortName}  ${Math.round(
                        temperature
                    )}°C`,


                font:

                    "600 16px Arial",


                fillColor:

                    getTemperatureColor(
                        temperature
                    ),


                outlineColor:

                    Cesium.Color.BLACK
                        .withAlpha(
                            0.95
                        ),


                outlineWidth:
                    5,


                style:

                    Cesium.LabelStyle
                        .FILL_AND_OUTLINE,


                horizontalOrigin:

                    Cesium.HorizontalOrigin
                        .CENTER,


                verticalOrigin:

                    Cesium.VerticalOrigin
                        .TOP,


                pixelOffset:

                    new Cesium.Cartesian2(
                        0,
                        10
                    ),


                disableDepthTestDistance:

                    Number.POSITIVE_INFINITY,


                scaleByDistance:

                    new Cesium.NearFarScalar(

                        500,

                        1.2,

                        4000000,

                        0.5
                    ),


                distanceDisplayCondition:

                    new Cesium.DistanceDisplayCondition(

                        0,

                        5000000
                    )
            }
        });


    // =====================================================
    // REQUEST RENDER
    // =====================================================

    viewer.scene.requestRender();


    console.log(
        `${icon} ${condition || "Weather"}`
    );


    console.log(
        `🌡️ ${temperature}°C`
    );


    console.log(
        `📍 Weather marker created over ${shortName}.`
    );
}


// =========================================================
// CLEAR WEATHER MARKER
// =========================================================
//
// IMPORTANT:
// weather.js imports this function.
// Therefore it MUST be exported.
//
// =========================================================

export function clearWeatherMarker() {

    if (!viewer) {

        return;
    }


    if (!weatherEntity) {

        return;
    }


    try {

        viewer.entities.remove(
            weatherEntity
        );


        weatherEntity = null;


        viewer.scene.requestRender();


        console.log(
            "🧹 Weather marker removed."
        );

    } catch (error) {

        console.error(
            "❌ Failed to remove weather marker:",
            error
        );


        weatherEntity = null;
    }
}


// =========================================================
// WEATHER ICON
// =========================================================

function getWeatherIcon(code) {

    code =
        Number(code);


    // -----------------------------------------------------
    // CLEAR SKY
    // -----------------------------------------------------

    if (code === 0) {

        return "☀️";
    }


    // -----------------------------------------------------
    // MAINLY CLEAR
    // -----------------------------------------------------

    if (code === 1) {

        return "🌤️";
    }


    // -----------------------------------------------------
    // PARTLY CLOUDY
    // -----------------------------------------------------

    if (code === 2) {

        return "⛅";
    }


    // -----------------------------------------------------
    // OVERCAST
    // -----------------------------------------------------

    if (code === 3) {

        return "☁️";
    }


    // -----------------------------------------------------
    // FOG
    // -----------------------------------------------------

    if (
        code === 45 ||
        code === 48
    ) {

        return "🌫️";
    }


    // -----------------------------------------------------
    // DRIZZLE
    // -----------------------------------------------------

    if (
        code >= 51 &&
        code <= 57
    ) {

        return "🌦️";
    }


    // -----------------------------------------------------
    // RAIN
    // -----------------------------------------------------

    if (
        code >= 61 &&
        code <= 67
    ) {

        return "🌧️";
    }


    // -----------------------------------------------------
    // SNOW
    // -----------------------------------------------------

    if (
        code >= 71 &&
        code <= 77
    ) {

        return "❄️";
    }


    // -----------------------------------------------------
    // RAIN SHOWERS
    // -----------------------------------------------------

    if (
        code >= 80 &&
        code <= 82
    ) {

        return "🌦️";
    }


    // -----------------------------------------------------
    // SNOW SHOWERS
    // -----------------------------------------------------

    if (
        code === 85 ||
        code === 86
    ) {

        return "🌨️";
    }


    // -----------------------------------------------------
    // THUNDERSTORM
    // -----------------------------------------------------

    if (
        code >= 95 &&
        code <= 99
    ) {

        return "⛈️";
    }


    // -----------------------------------------------------
    // FALLBACK
    // -----------------------------------------------------

    return "🌤️";
}


// =========================================================
// CREATE WEATHER ICON IMAGE
// =========================================================

function createWeatherImage(icon) {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        180;


    canvas.height =
        180;


    const ctx =
        canvas.getContext(
            "2d"
        );


    if (!ctx) {

        console.error(
            "❌ Could not create weather canvas."
        );

        return canvas;
    }


    // =====================================================
    // SHADOW
    // =====================================================

    ctx.beginPath();


    ctx.arc(

        90,

        90,

        65,

        0,

        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(3, 12, 24, 0.68)";


    ctx.fill();


    // =====================================================
    // OUTER GLOW
    // =====================================================

    ctx.beginPath();


    ctx.arc(

        90,

        90,

        67,

        0,

        Math.PI * 2
    );


    ctx.lineWidth =
        3;


    ctx.strokeStyle =
        "rgba(120, 220, 255, 0.55)";


    ctx.stroke();


    // =====================================================
    // WEATHER EMOJI
    // =====================================================

    ctx.font =
        '92px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "middle";


    ctx.fillText(

        icon,

        90,

        94
    );


    return canvas;
}


// =========================================================
// TEMPERATURE COLOR
// =========================================================

function getTemperatureColor(
    temperature
) {

    temperature =
        Number(temperature);


    // -----------------------------------------------------
    // COLD
    // -----------------------------------------------------

    if (temperature < 10) {

        return Cesium.Color
            .fromCssColorString(
                "#38bdf8"
            );
    }


    // -----------------------------------------------------
    // COOL
    // -----------------------------------------------------

    if (temperature < 20) {

        return Cesium.Color
            .fromCssColorString(
                "#2dd4bf"
            );
    }


    // -----------------------------------------------------
    // WARM
    // -----------------------------------------------------

    if (temperature < 30) {

        return Cesium.Color
            .fromCssColorString(
                "#fde047"
            );
    }


    // -----------------------------------------------------
    // HOT
    // -----------------------------------------------------

    return Cesium.Color
        .fromCssColorString(
            "#fb7185"
        );
}


// =========================================================
// SHORT LOCATION NAME
// =========================================================

function getShortLocationName(name) {

    if (!name) {

        return "Location";
    }


    const value =
        String(name)
            .trim();


    if (!value) {

        return "Location";
    }


    const parts =
        value.split(",");


    return (
        parts[0]?.trim() ||
        "Location"
    );
}


// =========================================================
// GET CURRENT WEATHER ENTITY
// =========================================================

export function getWeatherMarker() {

    return weatherEntity;
}


// =========================================================
// CHECK INITIALIZATION
// =========================================================

export function isWeatherMarkerInitialized() {

    return initialized;
}