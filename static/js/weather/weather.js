// =========================================================
// static/js/weather/weather.js
// =========================================================

import {
    isWeatherModeActive
} from "./weather-state.js";


import {
    showWeatherMarker,
    clearWeatherMarker
} from "./weather-marker.js";


import {
    showWeatherEffect,
    clearWeatherEffect
} from "./weather-effects.js";


// =========================================================
// CONFIG
// =========================================================

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";


// =========================================================
// STATE
// =========================================================

let initialized = false;

let requestController = null;

let lastLocation = null;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeWeather() {

    if (initialized) {
        return;
    }


    window.addEventListener(
        "searched-location-selected",
        handleSearchedLocation
    );


    window.addEventListener(
        "weather-mode-changed",
        handleWeatherModeChange
    );


    initialized = true;


    console.log(
        "🌦️ Selected-location weather ready."
    );
}


// =========================================================
// MODE CHANGE
// =========================================================

function handleWeatherModeChange(
    event
) {

    const active =
        Boolean(
            event.detail?.active
        );


    if (active) {

        setStatus(
            "Weather mode — search for a location"
        );


        console.log(
            "🌦️ Weather mode ready."
        );


        return;
    }


    if (requestController) {

        requestController.abort();

        requestController =
            null;
    }


    clearWeatherMarker();

    clearWeatherEffect();

    hideWeatherPanel();


    lastLocation =
        null;


    console.log(
        "🧹 Weather cleared."
    );
}


// =========================================================
// SEARCHED LOCATION
// =========================================================

async function handleSearchedLocation(
    event
) {

    if (!isWeatherModeActive()) {

        return;
    }


    const latitude =
        Number(
            event.detail?.latitude
        );


    const longitude =
        Number(
            event.detail?.longitude
        );


    const locationName =
        String(

            event.detail?.name ||

            event.detail?.query ||

            "Selected location"
        );


    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {

        console.error(
            "❌ Invalid weather location."
        );


        return;
    }


    lastLocation = {

        latitude,

        longitude,

        name:
            locationName
    };


    console.log(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );


    console.log(
        "🌦️ Weather search:"
    );


    console.log(
        "📍",
        locationName
    );


    await loadWeather(
        latitude,
        longitude,
        locationName
    );
}


// =========================================================
// LOAD WEATHER
// =========================================================

async function loadWeather(
    latitude,
    longitude,
    locationName
) {

    // Cancel previous request.

    requestController?.abort();


    requestController =
        new AbortController();


    const signal =
        requestController.signal;


    // Remove previous location.

    clearWeatherMarker();

    clearWeatherEffect();


    showWeatherPanel();


    setText(
        "weatherCondition",
        "Loading weather..."
    );


    setText(
        "weatherTemperature",
        "--"
    );


    setStatus(
        `Loading weather for ${getShortLocationName(locationName)}...`
    );


    // =====================================================
    // REQUEST
    // =====================================================

    const params =
        new URLSearchParams({

            latitude:
                latitude.toString(),

            longitude:
                longitude.toString(),

            current: [

                "temperature_2m",

                "apparent_temperature",

                "relative_humidity_2m",

                "precipitation",

                "rain",

                "weather_code",

                "cloud_cover",

                "wind_speed_10m",

                "wind_direction_10m",

                "wind_gusts_10m"

            ].join(","),

            hourly: [

                "temperature_2m",

                "precipitation_probability",

                "weather_code"

            ].join(","),

            forecast_days:
                "2",

            timezone:
                "auto"
        });


    const url =
        `${WEATHER_API}?${params}`;


    try {

        console.log(
            "📡 Requesting Open-Meteo weather..."
        );


        const data =
            await fetchWeatherWithRetry(
                url,
                signal,
                3
            );


        if (!isWeatherModeActive()) {
            return;
        }


        if (!data?.current) {

            throw new Error(
                "Current weather data missing."
            );
        }


        const current =
            data.current;


        const weatherCode =
            Number(
                current.weather_code
            );


        const temperature =
            Number(
                current.temperature_2m
            );


        const condition =
            getWeatherCondition(
                weatherCode
            );


        console.log(
            "✅ Weather received."
        );


        console.log(
            `${condition.icon} ${condition.name}`
        );


        console.log(
            `🌡️ ${temperature}°C`
        );


        // =================================================
        // PANEL
        // =================================================

        updateWeatherPanel(
            current,
            condition,
            locationName
        );


        updateHourlyForecast(
            data
        );


        // =================================================
        // STATIC LOCATION MARKER
        // =================================================

        showWeatherMarker({

            latitude,

            longitude,

            locationName,

            temperature,

            weatherCode,

            condition:
                condition.name
        });


        // =================================================
        // ANIMATED AREA EFFECT
        // =================================================

        showWeatherEffect({

            latitude,

            longitude,

            weatherCode,

            cloudCover:
                Number(
                    current.cloud_cover
                ) || 0,

            precipitation:
                Number(
                    current.precipitation
                ) || 0,

            windSpeed:
                Number(
                    current.wind_speed_10m
                ) || 0,

            windDirection:
                Number(
                    current.wind_direction_10m
                ) || 0
        });


        setStatus(
            `${condition.name} • ${Math.round(temperature)}°C • ${getShortLocationName(locationName)}`
        );


        console.log(
            "🌍 Weather visualization active over:",
            locationName
        );


        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );

    }

    catch (error) {

        if (
            error?.name ===
            "AbortError"
        ) {

            return;
        }


        console.error(
            "❌ Weather error:",
            error
        );


        clearWeatherMarker();

        clearWeatherEffect();


        setText(
            "weatherCondition",
            "⚠️ Weather unavailable"
        );


        setText(
            "weatherTemperature",
            "--"
        );


        setStatus(
            "Weather service temporarily unavailable"
        );
    }
}


// =========================================================
// FETCH WITH RETRY
// =========================================================

async function fetchWeatherWithRetry(
    url,
    signal,
    maxAttempts = 3
) {

    let lastError;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        if (signal.aborted) {

            throw createAbortError();
        }


        console.log(
            `🌦️ Weather request ${attempt}/${maxAttempts}`
        );


        try {

            const response =
                await fetch(
                    url,
                    {
                        headers: {
                            Accept:
                                "application/json"
                        },

                        cache:
                            "no-store",

                        signal
                    }
                );


            if (response.ok) {

                return await response.json();
            }


            if (
                [
                    429,
                    500,
                    502,
                    503,
                    504
                ].includes(
                    response.status
                )
            ) {

                lastError =
                    new Error(
                        `Weather service returned ${response.status}`
                    );


                console.warn(
                    `⚠️ Open-Meteo returned ${response.status}.`
                );


                if (
                    attempt <
                    maxAttempts
                ) {

                    await delay(
                        attempt * 1500,
                        signal
                    );


                    continue;
                }


                break;
            }


            throw new Error(
                `Weather request failed (${response.status})`
            );

        }

        catch (error) {

            if (
                error.name ===
                "AbortError"
            ) {

                throw error;
            }


            lastError =
                error;


            if (
                attempt <
                maxAttempts
            ) {

                await delay(
                    attempt * 1500,
                    signal
                );
            }
        }
    }


    throw (
        lastError ||
        new Error(
            "Weather service unavailable."
        )
    );
}


// =========================================================
// DELAY
// =========================================================

function delay(
    milliseconds,
    signal
) {

    return new Promise(
        (resolve, reject) => {

            if (signal.aborted) {

                reject(
                    createAbortError()
                );

                return;
            }


            const timer =
                setTimeout(
                    finish,
                    milliseconds
                );


            function abort() {

                clearTimeout(
                    timer
                );


                signal.removeEventListener(
                    "abort",
                    abort
                );


                reject(
                    createAbortError()
                );
            }


            function finish() {

                signal.removeEventListener(
                    "abort",
                    abort
                );


                resolve();
            }


            signal.addEventListener(
                "abort",
                abort,
                {
                    once:
                        true
                }
            );
        }
    );
}


// =========================================================
// ABORT ERROR
// =========================================================

function createAbortError() {

    return new DOMException(
        "Request aborted",
        "AbortError"
    );
}


// =========================================================
// WEATHER PANEL
// =========================================================

function updateWeatherPanel(
    current,
    condition,
    locationName
) {

    setText(
        "weatherLocation",
        getShortLocationName(
            locationName
        )
    );


    setText(
        "weatherCondition",
        `${condition.icon} ${condition.name}`
    );


    setText(
        "weatherTemperature",
        formatTemperature(
            current.temperature_2m
        )
    );


    setText(
        "weatherFeelsLike",
        `Feels like ${formatTemperature(
            current.apparent_temperature
        )}`
    );


    setText(
        "weatherHumidity",
        formatUnit(
            current.relative_humidity_2m,
            "%"
        )
    );


    setText(
        "weatherRain",
        formatUnit(
            current.rain ??
            current.precipitation,
            " mm",
            1
        )
    );


    setText(
        "weatherClouds",
        formatUnit(
            current.cloud_cover,
            "%"
        )
    );


    setText(
        "weatherWind",
        formatUnit(
            current.wind_speed_10m,
            " km/h",
            1
        )
    );


    setText(
        "weatherWindDirection",
        formatUnit(
            current.wind_direction_10m,
            "°"
        )
    );


    setText(
        "weatherGusts",
        formatUnit(
            current.wind_gusts_10m,
            " km/h",
            1
        )
    );
}


// =========================================================
// HOURLY FORECAST
// =========================================================

function updateHourlyForecast(
    data
) {

    const container =
        document.getElementById(
            "hourlyForecast"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    const hourly =
        data.hourly;


    if (!hourly?.time) {
        return;
    }


    const currentTime =
        new Date(
            data.current.time
        ).getTime();


    let startIndex =
        0;


    let difference =
        Infinity;


    hourly.time.forEach(
        (time, index) => {

            const value =
                Math.abs(
                    new Date(time).getTime() -
                    currentTime
                );


            if (
                value <
                difference
            ) {

                difference =
                    value;

                startIndex =
                    index;
            }
        }
    );


    const end =
        Math.min(
            startIndex + 12,
            hourly.time.length
        );


    for (
        let i = startIndex;
        i < end;
        i++
    ) {

        const condition =
            getWeatherCondition(
                hourly.weather_code[i]
            );


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "hourly-item";


        const time =
            new Date(
                hourly.time[i]
            );


        item.textContent =
            `${time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })} ${condition.icon} ${Math.round(hourly.temperature_2m[i])}°C • ${Math.round(hourly.precipitation_probability[i] ?? 0)}%`;


        container.appendChild(
            item
        );
    }
}


// =========================================================
// WEATHER CONDITION
// =========================================================

function getWeatherCondition(
    code
) {

    code =
        Number(code);


    if (code === 0) {

        return {
            icon: "☀️",
            name: "Clear"
        };
    }


    if (code === 1) {

        return {
            icon: "🌤️",
            name: "Mainly Clear"
        };
    }


    if (code === 2) {

        return {
            icon: "⛅",
            name: "Partly Cloudy"
        };
    }


    if (code === 3) {

        return {
            icon: "☁️",
            name: "Overcast"
        };
    }


    if (
        code === 45 ||
        code === 48
    ) {

        return {
            icon: "🌫️",
            name: "Fog"
        };
    }


    if (
        code >= 51 &&
        code <= 57
    ) {

        return {
            icon: "🌦️",
            name: "Drizzle"
        };
    }


    if (
        code >= 61 &&
        code <= 67
    ) {

        return {
            icon: "🌧️",
            name: "Rain"
        };
    }


    if (
        code >= 71 &&
        code <= 77
    ) {

        return {
            icon: "❄️",
            name: "Snow"
        };
    }


    if (
        code >= 80 &&
        code <= 82
    ) {

        return {
            icon: "🌦️",
            name: "Rain Showers"
        };
    }


    if (
        code === 85 ||
        code === 86
    ) {

        return {
            icon: "🌨️",
            name: "Snow Showers"
        };
    }


    if (
        code >= 95 &&
        code <= 99
    ) {

        return {
            icon: "⛈️",
            name: "Thunderstorm"
        };
    }


    return {
        icon: "🌤️",
        name: "Weather"
    };
}


// =========================================================
// PANEL VISIBILITY
// =========================================================

function showWeatherPanel() {

    const panel =
        document.getElementById(
            "weatherPanel"
        );


    if (panel) {

        panel.hidden =
            false;


        panel.classList.add(
            "weather-panel-visible"
        );
    }
}


function hideWeatherPanel() {

    const panel =
        document.getElementById(
            "weatherPanel"
        );


    if (panel) {

        panel.classList.remove(
            "weather-panel-visible"
        );


        panel.hidden =
            true;
    }
}


// =========================================================
// HELPERS
// =========================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


function setStatus(
    message
) {

    const element =
        document.getElementById(
            "mapStatusText"
        );


    if (element) {

        element.textContent =
            message;
    }
}


function formatTemperature(
    value
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? `${Math.round(number)}°C`
        : "--";
}


function formatUnit(
    value,
    unit,
    decimals = 0
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? `${number.toFixed(decimals)}${unit}`
        : "--";
}


function getShortLocationName(
    name
) {

    return String(
        name || "Location"
    )
        .split(",")[0]
        .trim();
}


// =========================================================
// REFRESH WEATHER
// =========================================================

export async function refreshWeather() {

    if (
        !lastLocation ||
        !isWeatherModeActive()
    ) {

        return;
    }


    await loadWeather(
        lastLocation.latitude,
        lastLocation.longitude,
        lastLocation.name
    );
}