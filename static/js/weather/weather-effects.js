// =========================================================
// static/js/weather/weather-effects.js
// =========================================================
//
// SELECTED-AREA CESIUM WEATHER EFFECTS
//
// Effects exist ONLY around the searched location.
//
// Clear        -> animated sun
// Cloudy       -> moving clouds
// Rain         -> moving clouds + animated rain
// Snow         -> clouds + falling snow
// Fog          -> moving fog
// Thunderstorm -> dark clouds + rain + lightning
//
// =========================================================

const Cesium = window.Cesium;


// =========================================================
// STATE
// =========================================================

let viewer = null;
let initialized = false;

let weatherEntities = [];

let animationCallback = null;
let lightningTimer = null;

let activeWeather = null;


// =========================================================
// SETTINGS
// =========================================================

// Radius around selected location.

const AREA_RADIUS_METERS = 12000;

// Number of visual objects.

const CLOUD_COUNT = 8;
const RAIN_COUNT = 55;
const SNOW_COUNT = 45;
const FOG_COUNT = 7;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeWeatherEffects(
    cesiumViewer
) {

    if (initialized) {
        return;
    }


    if (!Cesium) {

        throw new Error(
            "CesiumJS is unavailable."
        );
    }


    if (!cesiumViewer) {

        throw new Error(
            "Cesium viewer required by weather-effects.js."
        );
    }


    viewer = cesiumViewer;

    initialized = true;


    // Animations require continuous rendering.

    viewer.scene.requestRenderMode =
        false;


    console.log(
        "🌦️ Selected-area weather effects ready."
    );
}


// =========================================================
// SHOW WEATHER
// =========================================================

export function showWeatherEffect({

    latitude,

    longitude,

    weatherCode,

    cloudCover = 0,

    precipitation = 0,

    windSpeed = 0,

    windDirection = 0

}) {

    if (!viewer) {

        console.error(
            "❌ Weather effects are not initialized."
        );

        return;
    }


    latitude = Number(latitude);
    longitude = Number(longitude);
    weatherCode = Number(weatherCode);

    cloudCover =
        Number(cloudCover) || 0;

    precipitation =
        Number(precipitation) || 0;

    windSpeed =
        Number(windSpeed) || 0;

    windDirection =
        Number(windDirection) || 0;


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        console.error(
            "❌ Invalid weather effect coordinates."
        );

        return;
    }


    // Remove weather from previous location.

    clearWeatherEffect();


    const type =
        getWeatherType(
            weatherCode
        );


    activeWeather = {

        latitude,
        longitude,
        weatherCode,
        type,
        cloudCover,
        precipitation,
        windSpeed,
        windDirection
    };


    console.log(
        `🌦️ Rendering ${type} over selected area.`
    );


    // =====================================================
    // CLEAR / SUNNY
    // =====================================================

    if (type === "clear") {

        createSun(
            latitude,
            longitude
        );


        // Mainly-clear conditions can still contain
        // some clouds.

        if (cloudCover >= 20) {

            createClouds(
                latitude,
                longitude,
                cloudCover,
                false
            );
        }
    }


    // =====================================================
    // CLOUDY
    // =====================================================

    else if (type === "cloudy") {

        createClouds(
            latitude,
            longitude,
            Math.max(
                cloudCover,
                55
            ),
            false
        );
    }


    // =====================================================
    // RAIN
    // =====================================================

    else if (type === "rain") {

        createClouds(
            latitude,
            longitude,
            Math.max(
                cloudCover,
                75
            ),
            true
        );


        createRain(
            latitude,
            longitude,
            precipitation
        );
    }


    // =====================================================
    // SNOW
    // =====================================================

    else if (type === "snow") {

        createClouds(
            latitude,
            longitude,
            Math.max(
                cloudCover,
                70
            ),
            false
        );


        createSnow(
            latitude,
            longitude
        );
    }


    // =====================================================
    // FOG
    // =====================================================

    else if (type === "fog") {

        createFog(
            latitude,
            longitude
        );
    }


    // =====================================================
    // STORM
    // =====================================================

    else if (type === "storm") {

        createClouds(
            latitude,
            longitude,
            100,
            true
        );


        createRain(
            latitude,
            longitude,
            Math.max(
                precipitation,
                5
            )
        );


        startLightning(
            latitude,
            longitude
        );
    }


    // =====================================================
    // START ANIMATION
    // =====================================================

    startAnimation();


    viewer.scene.requestRender();
}


// =========================================================
// WEATHER TYPE
// =========================================================

function getWeatherType(code) {

    if (
        code === 0 ||
        code === 1
    ) {

        return "clear";
    }


    if (
        code === 2 ||
        code === 3
    ) {

        return "cloudy";
    }


    if (
        code === 45 ||
        code === 48
    ) {

        return "fog";
    }


    if (
        (
            code >= 51 &&
            code <= 67
        ) ||
        (
            code >= 80 &&
            code <= 82
        )
    ) {

        return "rain";
    }


    if (
        (
            code >= 71 &&
            code <= 77
        ) ||
        code === 85 ||
        code === 86
    ) {

        return "snow";
    }


    if (
        code >= 95 &&
        code <= 99
    ) {

        return "storm";
    }


    return "clear";
}


// =========================================================
// SUN
// =========================================================

function createSun(
    latitude,
    longitude
) {

    const image =
        createSunCanvas();


    const entity =
        viewer.entities.add({

            position:

                Cesium.Cartesian3
                    .fromDegrees(
                        longitude,
                        latitude,
                        4500
                    ),


            billboard: {

                image,

                width:
                    105,

                height:
                    105,

                disableDepthTestDistance:
                    Number.POSITIVE_INFINITY,

                verticalOrigin:
                    Cesium.VerticalOrigin.CENTER,

                horizontalOrigin:
                    Cesium.HorizontalOrigin.CENTER,

                scaleByDistance:

                    new Cesium.NearFarScalar(
                        1000,
                        1.2,
                        1500000,
                        0.45
                    )
            }
        });


    entity.weatherObject = {
        type: "sun",
        phase: 0
    };


    weatherEntities.push(
        entity
    );
}


// =========================================================
// CLOUDS
// =========================================================

function createClouds(
    latitude,
    longitude,
    cloudCover,
    dark
) {

    const percentage =
        Cesium.Math.clamp(
            cloudCover / 100,
            0.25,
            1
        );


    const count =
        Math.max(
            3,
            Math.round(
                CLOUD_COUNT *
                percentage
            )
        );


    const image =
        createCloudCanvas(
            dark
        );


    for (
        let index = 0;
        index < count;
        index++
    ) {

        const point =
            randomAreaPoint(
                latitude,
                longitude,
                AREA_RADIUS_METERS
            );


        const altitude =
            randomBetween(
                1800,
                3300
            );


        const entity =
            viewer.entities.add({

                position:

                    Cesium.Cartesian3
                        .fromDegrees(
                            point.longitude,
                            point.latitude,
                            altitude
                        ),


                billboard: {

                    image,

                    width:
                        randomBetween(
                            180,
                            290
                        ),

                    height:
                        randomBetween(
                            85,
                            135
                        ),

                    color:

                        Cesium.Color.WHITE
                            .withAlpha(
                                dark
                                    ? 0.9
                                    : 0.78
                            ),

                    disableDepthTestDistance:
                        Number.POSITIVE_INFINITY,

                    scaleByDistance:

                        new Cesium.NearFarScalar(
                            1000,
                            1,
                            1200000,
                            0.45
                        )
                }
            });


        entity.weatherObject = {

            type:
                "cloud",

            latitude:
                point.latitude,

            longitude:
                point.longitude,

            altitude,

            originalLatitude:
                latitude,

            originalLongitude:
                longitude,

            speed:

                randomBetween(
                    0.7,
                    1.3
                )
        };


        weatherEntities.push(
            entity
        );
    }
}


// =========================================================
// RAIN
// =========================================================

function createRain(
    latitude,
    longitude,
    precipitation
) {

    const intensity =
        Cesium.Math.clamp(
            Number(precipitation) || 1,
            0.5,
            10
        );


    const count =
        Math.round(

            Cesium.Math.clamp(
                RAIN_COUNT +
                intensity * 3,
                45,
                90
            )
        );


    const image =
        createRainCanvas();


    for (
        let index = 0;
        index < count;
        index++
    ) {

        const point =
            randomAreaPoint(
                latitude,
                longitude,
                AREA_RADIUS_METERS * 0.75
            );


        const altitude =
            randomBetween(
                300,
                2600
            );


        const entity =
            viewer.entities.add({

                position:

                    Cesium.Cartesian3
                        .fromDegrees(
                            point.longitude,
                            point.latitude,
                            altitude
                        ),


                billboard: {

                    image,

                    width:
                        4,

                    height:
                        randomBetween(
                            18,
                            30
                        ),

                    color:

                        Cesium.Color
                            .LIGHTSKYBLUE
                            .withAlpha(
                                0.8
                            ),

                    disableDepthTestDistance:
                        Number.POSITIVE_INFINITY
                }
            });


        entity.weatherObject = {

            type:
                "rain",

            latitude:
                point.latitude,

            longitude:
                point.longitude,

            altitude,

            resetAltitude:

                randomBetween(
                    2000,
                    3200
                ),

            speed:

                randomBetween(
                    550,
                    1000
                )
        };


        weatherEntities.push(
            entity
        );
    }
}


// =========================================================
// SNOW
// =========================================================

function createSnow(
    latitude,
    longitude
) {

    const image =
        createSnowCanvas();


    for (
        let index = 0;
        index < SNOW_COUNT;
        index++
    ) {

        const point =
            randomAreaPoint(
                latitude,
                longitude,
                AREA_RADIUS_METERS * 0.75
            );


        const altitude =
            randomBetween(
                300,
                2600
            );


        const entity =
            viewer.entities.add({

                position:

                    Cesium.Cartesian3
                        .fromDegrees(
                            point.longitude,
                            point.latitude,
                            altitude
                        ),


                billboard: {

                    image,

                    width:
                        randomBetween(
                            7,
                            12
                        ),

                    height:
                        randomBetween(
                            7,
                            12
                        ),

                    disableDepthTestDistance:
                        Number.POSITIVE_INFINITY
                }
            });


        entity.weatherObject = {

            type:
                "snow",

            latitude:
                point.latitude,

            longitude:
                point.longitude,

            altitude,

            phase:

                Math.random() *
                Math.PI *
                2,

            speed:

                randomBetween(
                    70,
                    160
                )
        };


        weatherEntities.push(
            entity
        );
    }
}


// =========================================================
// FOG
// =========================================================

function createFog(
    latitude,
    longitude
) {

    const image =
        createFogCanvas();


    for (
        let index = 0;
        index < FOG_COUNT;
        index++
    ) {

        const point =
            randomAreaPoint(
                latitude,
                longitude,
                AREA_RADIUS_METERS * 0.7
            );


        const entity =
            viewer.entities.add({

                position:

                    Cesium.Cartesian3
                        .fromDegrees(
                            point.longitude,
                            point.latitude,
                            randomBetween(
                                100,
                                500
                            )
                        ),


                billboard: {

                    image,

                    width:
                        randomBetween(
                            300,
                            480
                        ),

                    height:
                        randomBetween(
                            80,
                            130
                        ),

                    color:

                        Cesium.Color.WHITE
                            .withAlpha(
                                0.38
                            ),

                    disableDepthTestDistance:
                        Number.POSITIVE_INFINITY
                }
            });


        entity.weatherObject = {

            type:
                "fog",

            latitude:
                point.latitude,

            longitude:
                point.longitude,

            altitude:
                randomBetween(
                    100,
                    500
                ),

            speed:
                randomBetween(
                    0.2,
                    0.5
                )
        };


        weatherEntities.push(
            entity
        );
    }
}


// =========================================================
// ANIMATION
// =========================================================

function startAnimation() {

    stopAnimation();


    let previousTime =
        performance.now();


    animationCallback =
        () => {

            if (!activeWeather) {
                return;
            }


            const now =
                performance.now();


            const delta =
                Math.min(
                    (now - previousTime) /
                    1000,
                    0.05
                );


            previousTime =
                now;


            const windRadians =
                Cesium.Math.toRadians(
                    activeWeather.windDirection
                );


            for (
                const entity of weatherEntities
            ) {

                const object =
                    entity.weatherObject;


                if (!object) {
                    continue;
                }


                // =========================================
                // SUN
                // =========================================

                if (
                    object.type ===
                    "sun"
                ) {

                    object.phase +=
                        delta * 2;


                    const scale =
                        1 +
                        Math.sin(
                            object.phase
                        ) *
                        0.08;


                    entity.billboard.scale =
                        scale;


                    continue;
                }


                // =========================================
                // CLOUD
                // =========================================

                if (
                    object.type ===
                    "cloud"
                ) {

                    const wind =
                        Math.max(
                            activeWeather.windSpeed,
                            5
                        );


                    const movement =
                        wind *
                        object.speed *
                        delta *
                        2.5;


                    moveHorizontal(
                        object,
                        movement,
                        windRadians
                    );


                    keepInsideArea(
                        object,
                        activeWeather.latitude,
                        activeWeather.longitude,
                        AREA_RADIUS_METERS
                    );


                    updatePosition(
                        entity,
                        object
                    );


                    continue;
                }


                // =========================================
                // FOG
                // =========================================

                if (
                    object.type ===
                    "fog"
                ) {

                    const movement =
                        Math.max(
                            activeWeather.windSpeed,
                            3
                        ) *
                        object.speed *
                        delta;


                    moveHorizontal(
                        object,
                        movement,
                        windRadians
                    );


                    keepInsideArea(
                        object,
                        activeWeather.latitude,
                        activeWeather.longitude,
                        AREA_RADIUS_METERS
                    );


                    updatePosition(
                        entity,
                        object
                    );


                    continue;
                }


                // =========================================
                // RAIN
                // =========================================

                if (
                    object.type ===
                    "rain"
                ) {

                    object.altitude -=
                        object.speed *
                        delta;


                    // Small wind drift.

                    const movement =
                        Math.max(
                            activeWeather.windSpeed,
                            2
                        ) *
                        delta;


                    moveHorizontal(
                        object,
                        movement,
                        windRadians
                    );


                    if (
                        object.altitude <=
                        40
                    ) {

                        object.altitude =
                            object.resetAltitude;


                        const point =
                            randomAreaPoint(
                                activeWeather.latitude,
                                activeWeather.longitude,
                                AREA_RADIUS_METERS * 0.75
                            );


                        object.latitude =
                            point.latitude;


                        object.longitude =
                            point.longitude;
                    }


                    updatePosition(
                        entity,
                        object
                    );


                    continue;
                }


                // =========================================
                // SNOW
                // =========================================

                if (
                    object.type ===
                    "snow"
                ) {

                    object.phase +=
                        delta * 2;


                    object.altitude -=
                        object.speed *
                        delta;


                    const sideMovement =
                        Math.sin(
                            object.phase
                        ) *
                        4 *
                        delta;


                    const offset =
                        metersToDegrees(
                            object.latitude,
                            sideMovement,
                            0
                        );


                    object.longitude +=
                        offset.longitude;


                    if (
                        object.altitude <=
                        30
                    ) {

                        object.altitude =
                            randomBetween(
                                1800,
                                3000
                            );


                        const point =
                            randomAreaPoint(
                                activeWeather.latitude,
                                activeWeather.longitude,
                                AREA_RADIUS_METERS * 0.75
                            );


                        object.latitude =
                            point.latitude;


                        object.longitude =
                            point.longitude;
                    }


                    updatePosition(
                        entity,
                        object
                    );
                }
            }
        };


    viewer.scene.preUpdate
        .addEventListener(
            animationCallback
        );
}


// =========================================================
// STOP ANIMATION
// =========================================================

function stopAnimation() {

    if (
        viewer &&
        animationCallback
    ) {

        viewer.scene.preUpdate
            .removeEventListener(
                animationCallback
            );
    }


    animationCallback =
        null;
}


// =========================================================
// MOVE HORIZONTALLY
// =========================================================

function moveHorizontal(
    object,
    meters,
    direction
) {

    const east =
        Math.sin(direction) *
        meters;


    const north =
        Math.cos(direction) *
        meters;


    const offset =
        metersToDegrees(
            object.latitude,
            east,
            north
        );


    object.latitude +=
        offset.latitude;


    object.longitude +=
        offset.longitude;
}


// =========================================================
// KEEP OBJECT INSIDE SELECTED AREA
// =========================================================

function keepInsideArea(
    object,
    centerLatitude,
    centerLongitude,
    radius
) {

    const distance =
        approximateDistanceMeters(

            centerLatitude,
            centerLongitude,

            object.latitude,
            object.longitude
        );


    if (
        distance <= radius
    ) {

        return;
    }


    const point =
        randomAreaPoint(

            centerLatitude,
            centerLongitude,

            radius * 0.8
        );


    object.latitude =
        point.latitude;


    object.longitude =
        point.longitude;
}


// =========================================================
// UPDATE ENTITY POSITION
// =========================================================

function updatePosition(
    entity,
    object
) {

    entity.position =

        Cesium.Cartesian3
            .fromDegrees(

                object.longitude,

                object.latitude,

                object.altitude
            );
}


// =========================================================
// LIGHTNING
// =========================================================

function startLightning(
    latitude,
    longitude
) {

    function flash() {

        if (
            !activeWeather ||
            activeWeather.type !==
            "storm"
        ) {

            return;
        }


        const point =
            randomAreaPoint(
                latitude,
                longitude,
                AREA_RADIUS_METERS * 0.65
            );


        const bolt =
            viewer.entities.add({

                polyline: {

                    positions: [

                        Cesium.Cartesian3
                            .fromDegrees(
                                point.longitude,
                                point.latitude,
                                3500
                            ),

                        Cesium.Cartesian3
                            .fromDegrees(
                                point.longitude +
                                0.001,

                                point.latitude -
                                0.002,

                                2500
                            ),

                        Cesium.Cartesian3
                            .fromDegrees(
                                point.longitude -
                                0.0015,

                                point.latitude -
                                0.004,

                                1300
                            ),

                        Cesium.Cartesian3
                            .fromDegrees(
                                point.longitude,
                                point.latitude -
                                0.005,
                                100
                            )
                    ],

                    width:
                        4,

                    material:

                        Cesium.Color
                            .WHITE
                            .withAlpha(
                                0.95
                            )
                }
            });


        weatherEntities.push(
            bolt
        );


        setTimeout(
            () => {

                if (
                    viewer &&
                    bolt
                ) {

                    viewer.entities.remove(
                        bolt
                    );


                    const index =
                        weatherEntities.indexOf(
                            bolt
                        );


                    if (
                        index !== -1
                    ) {

                        weatherEntities.splice(
                            index,
                            1
                        );
                    }
                }

            },
            160
        );


        lightningTimer =
            setTimeout(

                flash,

                randomBetween(
                    2500,
                    6000
                )
            );
    }


    lightningTimer =
        setTimeout(
            flash,
            1200
        );
}


// =========================================================
// CLEAR WEATHER EFFECT
// =========================================================

export function clearWeatherEffect() {

    stopAnimation();


    if (lightningTimer) {

        clearTimeout(
            lightningTimer
        );


        lightningTimer =
            null;
    }


    if (viewer) {

        for (
            const entity of weatherEntities
        ) {

            try {

                viewer.entities.remove(
                    entity
                );

            } catch {

                // Ignore entity already removed.
            }
        }
    }


    weatherEntities =
        [];


    activeWeather =
        null;


    viewer?.scene
        .requestRender();
}


// =========================================================
// RANDOM AREA POINT
// =========================================================

function randomAreaPoint(
    latitude,
    longitude,
    radiusMeters
) {

    const angle =
        Math.random() *
        Math.PI *
        2;


    // sqrt gives more even distribution.

    const distance =
        Math.sqrt(
            Math.random()
        ) *
        radiusMeters;


    const east =
        Math.sin(angle) *
        distance;


    const north =
        Math.cos(angle) *
        distance;


    const offset =
        metersToDegrees(
            latitude,
            east,
            north
        );


    return {

        latitude:
            latitude +
            offset.latitude,

        longitude:
            longitude +
            offset.longitude
    };
}


// =========================================================
// METERS → LAT/LON
// =========================================================

function metersToDegrees(
    latitude,
    eastMeters,
    northMeters
) {

    const latitudeOffset =
        northMeters /
        111320;


    const cosine =
        Math.max(

            Math.abs(
                Math.cos(
                    Cesium.Math.toRadians(
                        latitude
                    )
                )
            ),

            0.01
        );


    const longitudeOffset =
        eastMeters /
        (
            111320 *
            cosine
        );


    return {

        latitude:
            latitudeOffset,

        longitude:
            longitudeOffset
    };
}


// =========================================================
// APPROXIMATE DISTANCE
// =========================================================

function approximateDistanceMeters(
    latitude1,
    longitude1,
    latitude2,
    longitude2
) {

    const averageLatitude =
        Cesium.Math.toRadians(
            (
                latitude1 +
                latitude2
            ) /
            2
        );


    const north =
        (
            latitude2 -
            latitude1
        ) *
        111320;


    const east =
        (
            longitude2 -
            longitude1
        ) *
        111320 *
        Math.cos(
            averageLatitude
        );


    return Math.sqrt(
        east * east +
        north * north
    );
}


// =========================================================
// RANDOM NUMBER
// =========================================================

function randomBetween(
    minimum,
    maximum
) {

    return (
        minimum +
        Math.random() *
        (
            maximum -
            minimum
        )
    );
}


// =========================================================
// SUN CANVAS
// =========================================================

function createSunCanvas() {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        160;


    canvas.height =
        160;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const glow =
        ctx.createRadialGradient(
            80,
            80,
            12,
            80,
            80,
            75
        );


    glow.addColorStop(
        0,
        "rgba(255,245,120,1)"
    );


    glow.addColorStop(
        0.35,
        "rgba(255,200,50,0.95)"
    );


    glow.addColorStop(
        1,
        "rgba(255,180,0,0)"
    );


    ctx.fillStyle =
        glow;


    ctx.fillRect(
        0,
        0,
        160,
        160
    );


    ctx.font =
        '75px "Segoe UI Emoji", sans-serif';


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "middle";


    ctx.fillText(
        "☀️",
        80,
        82
    );


    return canvas;
}


// =========================================================
// CLOUD CANVAS
// =========================================================

function createCloudCanvas(
    dark
) {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        300;


    canvas.height =
        150;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const color =
        dark
            ? "rgba(70,80,95,0.92)"
            : "rgba(245,250,255,0.90)";


    const shadow =
        dark
            ? "rgba(25,35,50,0.7)"
            : "rgba(180,205,225,0.55)";


    ctx.shadowColor =
        shadow;


    ctx.shadowBlur =
        20;


    ctx.fillStyle =
        color;


    ctx.beginPath();


    ctx.arc(
        85,
        90,
        45,
        0,
        Math.PI * 2
    );


    ctx.arc(
        135,
        65,
        60,
        0,
        Math.PI * 2
    );


    ctx.arc(
        195,
        88,
        48,
        0,
        Math.PI * 2
    );


    ctx.fill();


    ctx.fillRect(
        80,
        80,
        125,
        48
    );


    return canvas;
}


// =========================================================
// RAIN CANVAS
// =========================================================

function createRainCanvas() {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        8;


    canvas.height =
        40;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            40
        );


    gradient.addColorStop(
        0,
        "rgba(120,200,255,0)"
    );


    gradient.addColorStop(
        0.25,
        "rgba(120,200,255,0.95)"
    );


    gradient.addColorStop(
        1,
        "rgba(60,150,255,0.25)"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        2,
        0,
        4,
        40
    );


    return canvas;
}


// =========================================================
// SNOW CANVAS
// =========================================================

function createSnowCanvas() {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        32;


    canvas.height =
        32;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const gradient =
        ctx.createRadialGradient(
            16,
            16,
            1,
            16,
            16,
            15
        );


    gradient.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );


    gradient.addColorStop(
        0.45,
        "rgba(255,255,255,0.95)"
    );


    gradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        32,
        32
    );


    return canvas;
}


// =========================================================
// FOG CANVAS
// =========================================================

function createFogCanvas() {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        320;


    canvas.height =
        100;


    const ctx =
        canvas.getContext(
            "2d"
        );


    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            320,
            0
        );


    gradient.addColorStop(
        0,
        "rgba(240,250,255,0)"
    );


    gradient.addColorStop(
        0.25,
        "rgba(230,240,245,0.65)"
    );


    gradient.addColorStop(
        0.75,
        "rgba(230,240,245,0.65)"
    );


    gradient.addColorStop(
        1,
        "rgba(240,250,255,0)"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        20,
        320,
        60
    );


    return canvas;
}